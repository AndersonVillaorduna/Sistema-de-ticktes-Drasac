from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.categoria import Categoria
from app.models.usuario import Usuario
from app.models.tecnico_categoria import TecnicoCategoria
from app.models.ticket import Ticket
from app import db

categorias_bp = Blueprint('categorias', __name__)

@categorias_bp.route('', methods=['GET'])
@jwt_required()
def obtener_categorias():
    categorias = Categoria.query.all()
    return jsonify([c.to_dict() for c in categorias]), 200


def _verificar_admin():
    usuario = Usuario.query.get(int(get_jwt_identity()))
    if not usuario or usuario.rol != 'admin':
        return None
    return usuario

@categorias_bp.route('/asignaciones', methods=['GET'])
@jwt_required()
def obtener_asignaciones():
    """Lista de categorías con el técnico asignado y sus tickets sin cerrar."""
    if not _verificar_admin():
        return jsonify({"error": "No autorizado", "message": "Solo administradores"}), 403

    tecnicos = Usuario.query.filter(Usuario.rol.in_(['tecnico', 'admin'])).all()
    tecnicos_map = {t.id: t.nombre for t in tecnicos}
    relaciones = {r.categoria_id: r.tecnico_id for r in TecnicoCategoria.query.all()}

    estados_abiertos = ['abierto', 'en proceso', 'resuelto por ia - pendiente']
    resultado = []
    for cat in Categoria.query.order_by(Categoria.nombre).all():
        abiertos = Ticket.query.filter(
            Ticket.categoria_id == cat.id,
            Ticket.estado.in_(estados_abiertos)
        ).count()
        tecnico_id = relaciones.get(cat.id)
        resultado.append({
            "categoria_id": cat.id,
            "categoria_nombre": cat.nombre,
            "tecnico_id": tecnico_id,
            "tecnico_nombre": tecnicos_map.get(tecnico_id) if tecnico_id else None,
            "tickets_abiertos": abiertos,
        })
    return jsonify(resultado), 200

@categorias_bp.route('/tecnicos/<int:tecnico_id>', methods=['PUT'])
@jwt_required()
def asignar_categorias_a_tecnico(tecnico_id):
    """Define las categorías que atiende un técnico (una o varias).
    Cada categoría sigue teniendo un único técnico: si se la dan a este,
    se la quitan al anterior. Los tickets sin cerrar de las categorías
    recién asignadas pasan a este técnico."""
    if not _verificar_admin():
        return jsonify({"error": "No autorizado", "message": "Solo administradores"}), 403

    tecnico = Usuario.query.get(tecnico_id)
    if not tecnico or tecnico.rol not in ['tecnico', 'admin']:
        return jsonify({"error": "No encontrado", "message": "Técnico no encontrado"}), 404

    data = request.get_json() or {}
    categoria_ids = data.get('categoria_ids', [])
    if not isinstance(categoria_ids, list):
        return jsonify({"error": "Validación fallida", "message": "categoria_ids debe ser una lista"}), 400

    categorias_validas = []
    for cid in categoria_ids:
        cat = Categoria.query.get(int(cid)) if str(cid).isdigit() else None
        if cat:
            categorias_validas.append(cat)

    # 1. Quitar a este técnico de las categorías que ya no atenderá
    actuales = TecnicoCategoria.query.filter_by(tecnico_id=tecnico_id).all()
    nuevos_ids = {c.id for c in categorias_validas}
    for rel in actuales:
        if rel.categoria_id not in nuevos_ids:
            db.session.delete(rel)

    # 2. Para cada categoría asignada: quitar al técnico anterior y poner a este
    for cat in categorias_validas:
        TecnicoCategoria.query.filter_by(categoria_id=cat.id).delete()
        db.session.add(TecnicoCategoria(tecnico_id=tecnico_id, categoria_id=cat.id))

    # 3. Reasignar los tickets sin cerrar de las categorías asignadas a este técnico
    estados_abiertos = ['abierto', 'en proceso', 'resuelto por ia - pendiente']
    reasignados = 0
    if categorias_validas:
        tickets = Ticket.query.filter(
            Ticket.categoria_id.in_([c.id for c in categorias_validas]),
            Ticket.estado.in_(estados_abiertos)
        ).all()
        for t in tickets:
            t.tecnico_id = tecnico_id
        reasignados = len(tickets)

    db.session.commit()
    nombres = [c.nombre for c in categorias_validas]
    return jsonify({
        "message": f"{tecnico.nombre} ahora atiende: {', '.join(nombres) if nombres else '(ninguna categoría)'}. {reasignados} ticket(s) sin cerrar reasignado(s).",
        "categorias": nombres,
        "tickets_reasignados": reasignados,
    }), 200

@categorias_bp.route('/<int:categoria_id>/asignar-tecnico', methods=['PUT'])
@jwt_required()
def asignar_tecnico(categoria_id):
    """Asigna un técnico a una categoría (solo uno por categoría).
    Reasigna además los tickets sin cerrar de esa categoría al nuevo técnico."""
    if not _verificar_admin():
        return jsonify({"error": "No autorizado", "message": "Solo administradores"}), 403

    categoria = Categoria.query.get(categoria_id)
    if not categoria:
        return jsonify({"error": "No encontrado", "message": "Categoría no encontrada"}), 404

    data = request.get_json() or {}
    tecnico_id = data.get('tecnico_id')

    if tecnico_id is not None:
        tecnico = Usuario.query.get(int(tecnico_id))
        if not tecnico or tecnico.rol not in ['tecnico', 'admin']:
            return jsonify({"error": "Validación fallida", "message": "El usuario debe ser técnico o administrador"}), 400
        tecnico_id = tecnico.id

    # Una categoría tiene un único técnico: se reemplaza la asignación anterior
    TecnicoCategoria.query.filter_by(categoria_id=categoria_id).delete()
    if tecnico_id is not None:
        db.session.add(TecnicoCategoria(tecnico_id=tecnico_id, categoria_id=categoria_id))

    # Los tickets sin cerrar de la categoría pasan al nuevo técnico
    reasignados = 0
    if tecnico_id is not None:
        estados_abiertos = ['abierto', 'en proceso', 'resuelto por ia - pendiente']
        tickets = Ticket.query.filter(
            Ticket.categoria_id == categoria_id,
            Ticket.estado.in_(estados_abiertos)
        ).all()
        for t in tickets:
            t.tecnico_id = tecnico_id
        reasignados = len(tickets)

    db.session.commit()
    return jsonify({
        "message": f"Técnico asignado a la categoría {categoria.nombre}. {reasignados} ticket(s) sin cerrar reasignado(s).",
        "categoria_id": categoria_id,
        "tecnico_id": tecnico_id,
        "tickets_reasignados": reasignados,
    }), 200
