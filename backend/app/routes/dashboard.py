from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.ticket import Ticket
from app.models.usuario import Usuario
from app.models.categoria import Categoria
from app.models.inventario import Inventario
from app import db
from sqlalchemy import func

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/stats', methods=['GET'])
@jwt_required()
def obtener_estadisticas():
    current_user_id = int(get_jwt_identity())
    usuario = Usuario.query.get(current_user_id)
    if not usuario:
        return jsonify({"error": "No encontrado", "message": "Usuario no encontrado"}), 404

    # Consulta básica de tickets filtrando por usuario si no es técnico/admin
    query = Ticket.query
    if usuario.rol == 'usuario':
        query = query.filter(Ticket.usuario_id == current_user_id)

    # 1. Conteo por estados
    stats_estado = db.session.query(
        Ticket.estado, func.count(Ticket.id)
    )
    if usuario.rol == 'usuario':
        stats_estado = stats_estado.filter(Ticket.usuario_id == current_user_id)
    stats_estado = stats_estado.group_by(Ticket.estado).all()
    
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

    # 2. Conteo por categoría
    stats_categoria = db.session.query(
        Categoria.nombre, func.count(Ticket.id)
    ).join(Ticket, Ticket.categoria_id == Categoria.id)
    if usuario.rol == 'usuario':
        stats_categoria = stats_categoria.filter(Ticket.usuario_id == current_user_id)
    stats_categoria = stats_categoria.group_by(Categoria.nombre).all()
    
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
        
        # Tickets resueltos por IA (aquellos cerrados o resueltos que se clasificaron por IA y no se escalaron)
        resoluciones_ia = Ticket.query.filter(
            Ticket.clasificado_por_ia == True,
            Ticket.estado.in_(['cerrado', 'resuelto']),
            Ticket.respuesta_ia != None
        ).count()
        
        resoluciones_humanas = Ticket.query.filter(
            Ticket.estado.in_(['cerrado', 'resuelto'])
        ).count() - resoluciones_ia
        if resoluciones_humanas < 0:
            resoluciones_humanas = 0

    # 4. Tickets recientes
    recent_query = Ticket.query
    if usuario.rol == 'usuario':
        recent_query = recent_query.filter(Ticket.usuario_id == current_user_id)
    
    tickets_recientes = recent_query.order_by(Ticket.created_at.desc()).limit(5).all()

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
