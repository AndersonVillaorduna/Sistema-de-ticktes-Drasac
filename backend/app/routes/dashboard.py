from flask import Blueprint, jsonify, request
import logging
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.ticket import Ticket
from app.models.usuario import Usuario
from app.models.categoria import Categoria
from app.models.inventario import Inventario
from app.models.tecnico_categoria import TecnicoCategoria
from app import db
from sqlalchemy import func, or_
from datetime import datetime, timedelta
dashboard_bp = Blueprint('dashboard', __name__)
logger = logging.getLogger('drasac.dashboard')

def _categorias_del_tecnico(tecnico_id):
    return [
        tc.categoria_id for tc in TecnicoCategoria.query.filter_by(tecnico_id=tecnico_id).all()
    ]

def _alcance_query(usuario, current_user_id):
    """Query de tickets según rol: usuario ve lo suyo, técnico ve solo sus
    categorías asignadas (y tickets asignados a él), admin ve todo."""
    query = Ticket.query
    if usuario.rol == 'usuario':
        return query.filter(Ticket.usuario_id == current_user_id)
    if usuario.rol == 'tecnico':
        return query.filter(or_(
            Ticket.tecnico_id == current_user_id,
            Ticket.categoria_id.in_(_categorias_del_tecnico(current_user_id))
        ))
    return query

@dashboard_bp.route('/stats', methods=['GET'])
@jwt_required()
def obtener_estadisticas():
    current_user_id = int(get_jwt_identity())
    usuario = Usuario.query.get(current_user_id)
    if not usuario:
        return jsonify({"error": "No encontrado", "message": "Usuario no encontrado"}), 404

    alcance = _alcance_query(usuario, current_user_id)

    # 1. Conteo por estados
    stats_estado = with_entities = alcance.with_entities(
        Ticket.estado, func.count(Ticket.id)
    ).group_by(Ticket.estado).all()

    estados_dict = {
        'abierto': 0,
        'en proceso': 0,
        'resuelto por ia - pendiente': 0,
        'resuelto': 0,
        'cerrado': 0
    }
    for est, count in stats_estado:
        if est in estados_dict:
            estados_dict[est] = count

    # 2. Conteo por categoría (sobre el mismo alcance)
    stats_categoria = alcance.with_entities(
        Categoria.nombre, func.count(Ticket.id)
    ).join(Categoria, Ticket.categoria_id == Categoria.id).group_by(Categoria.nombre).all()

    categorias_dict = {}
    for cat_name, count in stats_categoria:
        categorias_dict[cat_name] = count

    # 3. Datos extras del sistema (solo admins y técnicos)
    inventario_total = 0
    tecnicos_total = 0
    resoluciones_ia = 0
    resoluciones_humanas = 0

    if usuario.rol in ['admin', 'tecnico']:
        inventario_total = Inventario.query.count()
        tecnicos_total = Usuario.query.filter_by(rol='tecnico').count()

        # IA vs Humanos según QUIÉN resolvió realmente cada ticket:
        # 'ia' = confirmado por el usuario o cierre automático del flujo;
        # 'humano' = cerrado desde el panel por técnico/admin.
        # Los tickets cerrados antes de este registro se conservan con el
        # criterio anterior (tenían respuesta de la IA -> se asumen de IA).
        cerrados = alcance.filter(Ticket.estado.in_(['cerrado', 'resuelto']))

        resoluciones_ia = cerrados.filter(Ticket.resuelto_por == 'ia').count()
        resoluciones_humanas = cerrados.filter(Ticket.resuelto_por == 'humano').count()

        legacy = cerrados.filter(
            Ticket.resuelto_por.is_(None),
            Ticket.clasificado_por_ia == True,
            Ticket.respuesta_ia.isnot(None)
        ).count()
        resoluciones_ia += legacy
        resoluciones_humanas += cerrados.filter(Ticket.resuelto_por.is_(None)).count() - legacy
        if resoluciones_humanas < 0:
            resoluciones_humanas = 0

    # 4. Tickets recientes (mismo alcance)
    tickets_recientes = alcance.order_by(Ticket.created_at.desc()).limit(5).all()

    return jsonify({
        "totales": {
            "tickets": sum(estados_dict.values()),
            "abiertos": estados_dict['abierto'],
            "en_proceso": estados_dict['en proceso'],
            "pendientes_ia": estados_dict['resuelto por ia - pendiente'],
            "cerrados": estados_dict['cerrado'] + estados_dict['resuelto'],
            "inventario_equipos": inventario_total,
            "tecnicos_activos": tecnicos_total
        },
        "estados": estados_dict,
        "categorias": categorias_dict,
        "resoluciones_ia_vs_humana": {
            "ia": resoluciones_ia,
            "humana": resoluciones_humanas
        },
        "tickets_recientes": [t.to_dict() for t in tickets_recientes]
    }), 200

@dashboard_bp.route('/por-tienda', methods=['GET'])
@jwt_required()
def tickets_por_tienda():
    """Ranking de tiendas por cantidad de tickets creados.
    ?dias=7|14|30|90 (0 = todo el historial)."""
    current_user_id = int(get_jwt_identity())
    usuario = Usuario.query.get(current_user_id)
    if not usuario:
        return jsonify({"error": "No encontrado", "message": "Usuario no encontrado"}), 404
    if usuario.rol not in ['admin', 'tecnico']:
        return jsonify({"error": "No autorizado", "message": "Solo administradores y técnicos pueden ver este reporte"}), 403

    try:
        dias = int(request.args.get('dias', 30))
    except ValueError:
        dias = 30

    query = db.session.query(
        Usuario.tienda_area.label('tienda'),
        Ticket.estado.label('estado'),
        func.count(Ticket.id).label('cantidad')
    ).join(Usuario, Ticket.usuario_id == Usuario.id)

    if dias > 0:
        query = query.filter(Ticket.created_at >= datetime.utcnow() - timedelta(days=dias))
    query = query.filter(Usuario.tienda_area.isnot(None), Usuario.tienda_area != '')
    filas = query.group_by(Usuario.tienda_area, Ticket.estado).all()

    consolidado = {}
    for tienda, estado, cantidad in filas:
        d = consolidado.setdefault(tienda, {"tienda": tienda, "total": 0, "abiertos": 0, "resueltos": 0})
        d["total"] += cantidad
        if estado in ('cerrado', 'resuelto'):
            d["resueltos"] += cantidad
        else:
            d["abiertos"] += cantidad

    resultado = sorted(consolidado.values(), key=lambda x: x["total"], reverse=True)
    return jsonify({"dias": dias, "tiendas": resultado}), 200
