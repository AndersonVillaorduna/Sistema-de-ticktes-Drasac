import time
import os
import threading
import logging
from flask import Blueprint, request, jsonify, current_app, abort
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt, set_access_cookies, unset_jwt_cookies, get_csrf_token
from app.models.usuario import Usuario
from app.schemas.schemas import UsuarioSchema
from app import db, limiter

auth_bp = Blueprint('auth', __name__)
logger = logging.getLogger('drasac.auth')

usuario_schema = UsuarioSchema()
registro_schema = UsuarioSchema()

from app.security_models import LoginAttempt
from app.locks import shared_lock
import hashlib
import hmac


def _account_key(email):
    return hmac.new(current_app.config['SECRET_KEY'].encode(), email.encode(), hashlib.sha256).hexdigest()


def _cuenta_bloqueada(email):
    entry = db.session.get(LoginAttempt, _account_key(email))
    return max(0, int(entry.hasta - time.time())) if entry and entry.intentos >= 5 else 0


def _registrar_fallo(email):
    with shared_lock('login'):
        db.session.rollback()
        now = time.time()
        LoginAttempt.query.filter(LoginAttempt.hasta < now).delete(synchronize_session=False)
        key = _account_key(email)
        entry = db.session.get(LoginAttempt, key)
        if entry is None:
            entry = LoginAttempt(cuenta=key, intentos=0, hasta=0)
            db.session.add(entry)
        entry.intentos += 1
        entry.hasta = now + 300
        db.session.commit()


def _registrar_exito(email):
    LoginAttempt.query.filter_by(cuenta=_account_key(email)).delete(synchronize_session=False)
    db.session.commit()

@auth_bp.route('/login', methods=['POST'])
@limiter.limit("20 per minute")  # Prevenir ataques de fuerza bruta
def login():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Petición incorrecta", "message": "Faltan datos de entrada"}), 400

    email = (data.get('email') or '').strip().lower()
    password = data.get('password')

    if not email or not password:
        return jsonify({"error": "Datos incompletos", "message": "Email y contraseña son obligatorios"}), 400

    espera = _cuenta_bloqueada(email)
    if espera > 0:
        logger.warning("Intento de acceso a cuenta bloqueada: %s", email)
        return jsonify({
            "error": "Cuenta bloqueada",
            "message": f"Demasiados intentos fallidos. Espera {espera // 60 + 1} minuto(s) e inténtalo de nuevo."
        }), 429

    usuario = Usuario.query.filter_by(email=email).first()
    if not usuario or not usuario.activo or usuario.email.lower() == "ia@drasac.com" or not usuario.check_password(password):
        _registrar_fallo(email)
        return jsonify({"error": "Credenciales inválidas", "message": "Email o contraseña incorrectos"}), 401

    if os.getenv('FLASK_ENV', 'development') == 'production' and password in {'admin123', 'tecnico123', 'usuario123', 'iapassword123'}:
        return jsonify(error='Credenciales de demostración', message='El administrador debe reemplazar la contraseña inicial antes de producción.'), 403
    _registrar_exito(email)

    # Crear token JWT
    access_token = create_access_token(identity=str(usuario.id))

    response = jsonify({
        "message": "Sesión iniciada con éxito",
        "token": access_token,
        "usuario": usuario.to_dict()
    })
    set_access_cookies(response, access_token)
    response.headers['X-CSRF-Token'] = get_csrf_token(access_token)
    return response, 200

@auth_bp.route('/cambiar-password', methods=['POST'])
@jwt_required()
@limiter.limit('10 per minute')
def cambiar_password():
    """Permite a cualquier usuario autenticado cambiar su propia contraseña."""
    current_user_id = int(get_jwt_identity())
    usuario = db.session.get(Usuario, current_user_id)
    if not usuario:
        return jsonify({"error": "No encontrado", "message": "Usuario no encontrado"}), 404

    data = request.get_json() or {}
    actual = data.get('password_actual') or ''
    nueva = data.get('password_nueva') or ''

    if not usuario.check_password(actual):
        return jsonify({"error": "Credenciales inválidas", "message": "La contraseña actual es incorrecta"}), 400

    errors = UsuarioSchema(partial=('nombre', 'email')).validate({'password': nueva})
    if errors:
        mensaje = errors.get('password', ['La nueva contraseña no cumple los requisitos'])[0]
        return jsonify({"error": "Validación fallida", "message": str(mensaje)}), 400

    if usuario.check_password(nueva):
        return jsonify({"error": "Validación fallida", "message": "La nueva contraseña debe ser distinta a la actual"}), 400

    usuario.set_password(nueva)
    from app.models.auditoria import Auditoria
    Auditoria.registrar(usuario, 'password_actualizada', 'Actualizó su contraseña y revocó las sesiones anteriores')
    db.session.commit()
    logger.info("Contraseña actualizada para usuario %s", usuario.email)
    token = create_access_token(identity=str(usuario.id))
    response = jsonify(message="Contraseña actualizada correctamente", token=token)
    response.headers["X-Session-Token"] = token
    response.headers['X-CSRF-Token'] = get_csrf_token(token)
    set_access_cookies(response, token)
    return response, 200

@auth_bp.route('/register', methods=['POST'])
@jwt_required()
def register():
    # Obtener el rol del usuario que realiza la petición
    current_user_id = get_jwt_identity()
    current_user = db.session.get(Usuario, current_user_id)
    
    if not current_user or current_user.rol != 'admin':
        return jsonify({"error": "No autorizado", "message": "Solo los administradores pueden registrar usuarios"}), 403

    data = request.get_json()
    errors = registro_schema.validate(data)
    if errors:
        return jsonify({"error": "Validación fallida", "messages": errors}), 400

    email = data.get('email')
    if Usuario.query.filter_by(email=email).first():
        return jsonify({"error": "Conflicto", "message": "El correo ya está registrado"}), 409

    nuevo_usuario = Usuario(
        nombre=data.get('nombre'),
        email=email,
        rol=data.get('rol', 'usuario'),
        tienda_area=data.get('tienda_area')
    )
    nuevo_usuario.set_password(data.get('password'))

    try:
        db.session.add(nuevo_usuario)
        db.session.flush()
        from app.models.auditoria import Auditoria
        Auditoria.registrar(
            current_user, 'usuario_creado',
            f"Creó el usuario '{nuevo_usuario.nombre}' ({nuevo_usuario.rol}) con el correo {nuevo_usuario.email}"
        )
        db.session.commit()
        return jsonify({
            "message": "Usuario registrado exitosamente",
            "usuario": nuevo_usuario.to_dict()
        }), 201
    except Exception:
        db.session.rollback()
        logger.exception("Error interno")
        return jsonify({"error": "Error interno", "message": "Ocurrió un error interno. Intenta de nuevo."}), 500

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    current_user_id = get_jwt_identity()
    usuario = db.session.get(Usuario, current_user_id)
    if not usuario:
        return jsonify({"error": "No encontrado", "message": "Usuario no encontrado"}), 404
    return jsonify(usuario.to_dict()), 200

@auth_bp.route('/tecnicos', methods=['GET'])
@jwt_required()
def obtener_tecnicos():
    """Lista de técnicos/admins. Para usuarios comunes solo expone id y nombre
    (el chat y el flujo solo necesitan eso); el detalle completo queda para
    técnicos y administradores."""
    current_user_id = int(get_jwt_identity())
    current_user = db.session.get(Usuario, current_user_id)
    if not current_user:
        return jsonify({"error": "No encontrado", "message": "Usuario no encontrado"}), 404

    tecnicos = Usuario.query.filter(Usuario.rol.in_(['tecnico', 'admin']), Usuario.activo == True, Usuario.email != 'ia@drasac.com').all()
    if current_user.rol in ['tecnico', 'admin']:
        return jsonify([t.to_dict() for t in tecnicos]), 200
    return jsonify([{"id": t.id, "nombre": t.nombre} for t in tecnicos]), 200

@auth_bp.route('/usuarios', methods=['GET'])
@jwt_required()
def obtener_usuarios():
    current_user_id = int(get_jwt_identity())
    current_user = db.session.get(Usuario, current_user_id)
    if not current_user or current_user.rol not in ['admin', 'tecnico']:
        return jsonify({"error": "No autorizado", "message": "Solo administradores y técnicos pueden ver los usuarios"}), 403

    usuarios = Usuario.query.order_by(Usuario.created_at.desc()).all()

    # Conteo de tickets por usuario
    from app.models.ticket import Ticket
    from sqlalchemy import func
    conteos = dict(
        db.session.query(Ticket.usuario_id, func.count(Ticket.id))
        .group_by(Ticket.usuario_id).all()
    )

    return jsonify([
        {**u.to_dict(), 'total_tickets': conteos.get(u.id, 0)}
        for u in usuarios
    ]), 200


@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    from app.security_models import RevokedToken
    payload = get_jwt()
    RevokedToken.query.filter(RevokedToken.expires_at < time.time()).delete(synchronize_session=False)
    if db.session.get(RevokedToken, payload['jti']) is None:
        db.session.add(RevokedToken(jti=payload['jti'], expires_at=payload['exp']))
    db.session.commit()
    response = jsonify(message='Sesión cerrada')
    unset_jwt_cookies(response)
    return response, 200
