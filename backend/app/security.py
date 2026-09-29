"""Authentication and validation without changing the existing API shapes."""
import hashlib
import hmac
import re
import time
from flask import abort, g, jsonify, request, current_app
from flask_jwt_extended import verify_jwt_in_request, get_jwt, get_jwt_identity
from werkzeug.exceptions import HTTPException
from sqlalchemy import text
from app import db, jwt
from app.permissions import current_user, can_access_ticket, equipment_allowed
from app.models.usuario import Usuario
from app.models.ticket import Ticket
from app.models.categoria import Categoria
from app.models.inventario import Inventario
from app.schemas.schemas import TicketSchema, InventarioSchema, UsuarioSchema
from app.security_models import RevokedToken

STATE = {'abierto', 'en proceso', 'resuelto por ia - pendiente', 'resuelto', 'cerrado'}
PRIORITY = {'baja', 'media', 'alta'}


def session_version(user):
    return hmac.new(current_app.config['JWT_SECRET_KEY'].encode(), user.password_hash.encode(), hashlib.sha256).hexdigest()


def integer(value, name, nullable=False):
    if value is None and nullable:
        return None
    if isinstance(value, bool) or not isinstance(value, (int, str)) or not re.fullmatch(r'[0-9]+', str(value)):
        abort(400, description=name + ' debe ser un entero positivo')
    value = int(value)
    if not 1 <= value <= 2147483647:
        abort(400, description=name + ' fuera de rango')
    return value


def string(data, name, maximum, minimum=0, nullable=False):
    if name not in data:
        return
    value = data[name]
    if value is None and nullable:
        return
    if not isinstance(value, str) or not minimum <= len(value.strip()) <= maximum:
        abort(400, description=name + ' tiene un formato o longitud inválidos')


def validate_schema(schema, data, partial=False):
    errors = schema.validate(data, partial=partial)
    if errors:
        abort(400, description='Datos inválidos: ' + str(errors))


def validate_body(endpoint, data):
    if endpoint in ('auth.login', 'auth.cambiar_password'):
        names = ('email', 'password') if endpoint == 'auth.login' else ('password_actual', 'password_nueva')
        for name in names:
            string(data, name, 256, 1)
            if name not in data or (name != 'email' and len(data[name].encode('utf-8')) > 72):
                abort(400, description='Datos de acceso inválidos')
        if 'email' in data:
            string(data, 'email', 120, 3)
    elif endpoint == 'auth.register':
        validate_schema(UsuarioSchema(), data)
        if len(data['password'].encode('utf-8')) > 72:
            abort(400, description='La contraseña no puede superar 72 bytes')
        string(data, 'nombre', 100, 2)
        string(data, 'email', 120, 3)
        data['email'] = data['email'].strip().lower()
        string(data, 'tienda_area', 100, nullable=True)
    elif endpoint in ('tickets.crear_ticket', 'tickets.ia_preview', 'tickets.actualizar_ticket'):
        allowed = {
            'tickets.crear_ticket': {'titulo', 'descripcion', 'categoria_id', 'prioridad', 'equipos_ids'},
            'tickets.ia_preview': {'titulo', 'descripcion'},
            'tickets.actualizar_ticket': {'estado', 'prioridad', 'tecnico_id', 'categoria_id', 'marcado_resuelto'},
        }[endpoint]
        if set(data) - allowed:
            abort(400, description='Campos no permitidos')
        if endpoint == 'tickets.crear_ticket':
            validate_schema(TicketSchema(), data)
        string(data, 'titulo', 255, 3 if endpoint == 'tickets.crear_ticket' else 0)
        string(data, 'descripcion', 10000, 5 if endpoint == 'tickets.crear_ticket' else 0)
        for key, choices in (('estado', STATE), ('prioridad', PRIORITY)):
            if key in data and (not isinstance(data[key], str) or data[key] not in choices):
                abort(400, description=key + ' inválido')
        for key, model in (('categoria_id', Categoria), ('tecnico_id', Usuario)):
            if key in data:
                data[key] = integer(data[key], key, nullable=True)
                obj = db.session.get(model, data[key]) if data[key] else None
                if data[key] and not obj:
                    abort(400, description=key + ' no existe')
                if key == 'tecnico_id' and obj and (obj.rol not in ('admin', 'tecnico') or not obj.activo or obj.email.lower() == 'ia@drasac.com'):
                    abort(400, description='El responsable debe ser un técnico activo')
        if 'marcado_resuelto' in data and not isinstance(data['marcado_resuelto'], bool):
            abort(400, description='marcado_resuelto debe ser booleano')
        if 'equipos_ids' in data:
            ids = data['equipos_ids']
            if not isinstance(ids, list) or len(ids) > 50:
                abort(400, description='equipos_ids debe ser una lista de hasta 50 equipos')
            data['equipos_ids'] = list(dict.fromkeys(integer(i, 'equipo') for i in ids))
            for eid in data['equipos_ids']:
                eq = db.session.get(Inventario, eid)
                if not eq:
                    abort(400, description='El equipo indicado no existe')
                if not equipment_allowed(g.current_user, eq):
                    abort(403, description='El equipo no pertenece a tu tienda')
    elif endpoint == 'tickets.agregar_comentario':
        if set(data) - {'mensaje', 'adjunto_url'}:
            abort(400, description='Campos no permitidos')
        string(data, 'mensaje', 10000)
        string(data, 'adjunto_url', 2000, nullable=True)
        if data.get('adjunto_url'):
            from app.routes.uploads import canonical_upload, can_reference
            path = canonical_upload(data['adjunto_url'])
            if not can_reference(g.current_user, path):
                abort(403, description='No puedes adjuntar este archivo')
            data['adjunto_url'] = path
    elif endpoint == 'tickets.confirmar_resolucion':
        if not isinstance(data.get('confirmado', True), bool):
            abort(400, description='confirmado debe ser booleano')
    elif endpoint in ('inventario.crear_equipo', 'inventario.actualizar_equipo'):
        validate_schema(InventarioSchema(), data, partial=endpoint.endswith('actualizar_equipo'))
        for key, maximum in [('marca', 50), ('modelo', 50), ('anydesk_id', 50), ('asignado_a', 120)]:
            string(data, key, maximum, nullable=True)
        if endpoint.endswith('actualizar_equipo') and 'numero_serie' in data and not data['numero_serie']:
            abort(400, description='El número de serie no puede quedar vacío')
    elif endpoint.startswith('categorias.'):
        string(data, 'nombre', 100, 1)
        if 'tecnico_id' in data:
            data['tecnico_id'] = integer(data['tecnico_id'], 'tecnico_id', nullable=True)
        if 'categoria_ids' in data:
            ids = data['categoria_ids']
            if not isinstance(ids, list) or len(ids) > 100:
                abort(400, description='categoria_ids inválido')
            data['categoria_ids'] = list(dict.fromkeys(integer(i, 'categoria') for i in ids))
            if any(not db.session.get(Categoria, cid) for cid in data['categoria_ids']):
                abort(400, description='Una categoría indicada no existe')
    elif endpoint in ('base_conocimiento.crear_articulo', 'base_conocimiento.actualizar_articulo'):
        from app.routes.uploads import canonical_upload, can_reference
        for key, maximum in [('problema_tipo', 255), ('solucion', 20000), ('palabras_clave', 255)]:
            string(data, key, maximum, 1)
        if 'categoria_id' in data:
            data['categoria_id'] = integer(data['categoria_id'], 'categoria_id', nullable=True)
        values = [data]
        if 'pasos' in data and data['pasos'] is not None:
            if not isinstance(data['pasos'], list) or len(data['pasos']) > 100:
                abort(400, description='pasos debe ser una lista de hasta 100 pasos')
            for paso in data['pasos']:
                if not isinstance(paso, dict):
                    abort(400, description='Paso inválido')
                string(paso, 'texto', 10000, 1)
            values.extend(data['pasos'])
        for value in values:
            string(value, 'imagen_url', 2000, nullable=True)
            if value.get('imagen_url'):
                path = canonical_upload(value['imagen_url'])
                if not can_reference(g.current_user, path):
                    abort(403, description='No puedes usar esta imagen')
                value['imagen_url'] = path
    elif endpoint == 'notificaciones.marcar_leidas':
        if 'ids' in data:
            if not isinstance(data['ids'], list) or len(data['ids']) > 200:
                abort(400, description='ids inválido')
            data['ids'] = [integer(i, 'notificación') for i in data['ids']]


def register_security(app):
    @jwt.additional_claims_loader
    def claims(identity):
        user = db.session.get(Usuario, int(identity))
        return {'sv': session_version(user)} if user else {}

    @jwt.token_in_blocklist_loader
    def revoked(_header, payload):
        try:
            user = current_user(payload['sub'])
        except HTTPException:
            return True
        return not hmac.compare_digest(str(payload.get('sv', '')), session_version(user)) or db.session.get(RevokedToken, payload['jti']) is not None

    @jwt.revoked_token_loader
    def revoked_response(_header, _payload):
        return jsonify(error='Sesión inválida', message='La sesión terminó. Inicia sesión nuevamente.'), 401

    @app.before_request
    def guard_request():
        if len(request.headers.get('Authorization', '')) > 8192:
            abort(400, description='Cabecera de autorización demasiado grande')
        endpoint = request.endpoint
        if not endpoint or not request.path.startswith('/api/') or request.method == 'OPTIONS':
            return
        if endpoint not in ('auth.login', 'uploads.descargar_archivo', 'uploads.descargar_firmado'):
            verify_jwt_in_request()
            g.current_user = current_user(get_jwt_identity())
            user = g.current_user
            if endpoint.startswith('inventario.') and user.rol not in ('admin', 'tecnico'):
                abort(403, description='Inventario restringido a administradores y técnicos')
            if endpoint == 'auth.obtener_usuarios' and user.rol != 'admin':
                abort(403, description='Solo administradores pueden consultar usuarios')
            if endpoint.startswith('tickets.') and request.view_args and 'id' in request.view_args:
                ticket = db.session.get(Ticket, request.view_args['id'])
                if ticket and not can_access_ticket(user, ticket):
                    abort(403, description='No tienes acceso a este ticket')
                if ticket and endpoint == 'tickets.enviar_siguiente_paso' and ticket.estado in ('cerrado', 'resuelto'):
                    abort(400, description='El ticket ya está cerrado')
        for key in ('categoria_id', 'tecnico_id'):
            if request.args.get(key):
                integer(request.args[key], key)
        for key in ('search', 'estado', 'tipo', 'prioridad'):
            if len(request.args.get(key, '')) > 120:
                abort(400, description='Filtro demasiado largo')
        if request.method in ('POST', 'PUT', 'PATCH') and endpoint not in ('uploads.subir_archivo',):
            if request.content_length:
                data = request.get_json()
            else:
                data = {}
            if not isinstance(data, dict):
                abort(400, description='Se requiere un objeto JSON')
            validate_body(endpoint, data)
            request._cached_json = (data, data)

    @app.errorhandler(HTTPException)
    def http_error(error):
        db.session.rollback()
        return jsonify(error=error.name, message=error.description), error.code

    @app.errorhandler(Exception)
    def internal_error(error):
        db.session.rollback()
        app.logger.exception('Error interno', exc_info=error)
        return jsonify(error='Error interno', message='No se pudo completar la operación.'), 500

    @app.after_request
    def protect_response(response):
        if request.path.startswith('/api/'):
            response.headers['Cache-Control'] = 'no-store'
            response.headers['Referrer-Policy'] = 'no-referrer'
        if request.is_secure:
            response.headers['Strict-Transport-Security'] = 'max-age=31536000'
        response.headers['Content-Security-Policy'] = "default-src 'none'; frame-ancestors 'none'"
        if request.endpoint == 'auth.me' and getattr(g, 'current_user', None) and 'X-CSRF-Token' not in response.headers:
            response.headers['X-CSRF-Token'] = str(get_jwt().get('csrf', ''))
        if response.is_json:
            from app.routes.uploads import signed_path
            user = getattr(g, 'current_user', None)
            def transform(value, key=''):
                if isinstance(value, dict):
                    return {k: transform(v, k) for k, v in value.items()}
                if isinstance(value, list):
                    return [transform(v, key) for v in value]
                if isinstance(value, str):
                    if user and key in ('imagen_url', 'adjunto_url', 'url') and value.startswith('/api/uploads/'):
                        return signed_path(value, user)
                    if key.endswith('_at') and re.fullmatch(r'\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?', value):
                        return value + 'Z'
                return value
            response.set_data(app.json.dumps(transform(response.get_json())))
        return response
