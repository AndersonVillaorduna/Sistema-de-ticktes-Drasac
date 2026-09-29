"""Resource authorization shared by detail, writes, exports and downloads."""
from flask import abort
from sqlalchemy import or_
from sqlalchemy.orm import joinedload, selectinload
from app import db
from app.models.usuario import Usuario
from app.models.ticket import Ticket
from app.models.tecnico_categoria import TecnicoCategoria


def current_user(identity):
    try:
        uid = int(identity)
    except (ValueError, TypeError):
        abort(401, description='Sesión inválida')
    user = db.session.get(Usuario, uid)
    if not user or not user.activo or user.email.lower() == 'ia@drasac.com':
        abort(401, description='Sesión inválida')
    return user


def ticket_scope(user, query=None):
    query = query if query is not None else Ticket.query
    if user.rol == 'admin':
        return query
    if user.rol == 'usuario':
        return query.filter(Ticket.usuario_id == user.id)
    if user.rol == 'tecnico':
        cats = db.session.query(TecnicoCategoria.categoria_id).filter_by(tecnico_id=user.id)
        return query.filter(or_(Ticket.tecnico_id == user.id, Ticket.categoria_id.in_(cats)))
    return query.filter(db.false())


def can_access_ticket(user, ticket):
    return ticket_scope(user).filter(Ticket.id == ticket.id).first() is not None


def equipment_allowed(user, equipment):
    return user.rol in ('admin', 'tecnico') or (
        bool(user.tienda_area) and equipment.ubicacion_tienda == user.tienda_area
    )


def ticket_loading(query):
    return query.options(
        joinedload(Ticket.usuario), joinedload(Ticket.categoria),
        joinedload(Ticket.tecnico), joinedload(Ticket.resolutor),
        selectinload(Ticket.equipos),
    )


def paginate_compat(query):
    """Optional pagination; legacy callers keep the same complete array."""
    from flask import request
    if 'page' not in request.args and 'per_page' not in request.args:
        return query
    try:
        page = int(request.args.get('page', '1'))
        per_page = int(request.args.get('per_page', '50'))
    except ValueError:
        abort(400, description='Paginación inválida')
    if page < 1 or not 1 <= per_page <= 200:
        abort(400, description='Paginación inválida')
    return query.limit(per_page).offset((page - 1) * per_page)
