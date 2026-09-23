import time
import threading
import logging
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app.models.usuario import Usuario
from app.schemas.schemas import UsuarioSchema
from app import db, limiter

auth_bp = Blueprint('auth', __name__)
logger = logging.getLogger('drasac.auth')

usuario_schema = UsuarioSchema()
registro_schema = UsuarioSchema()

# ── Bloqueo temporal por cuenta ante intentos fallidos ───────────────────────
# {email: [intentos, bloqueado_hasta_ts]} — por proceso; suficiente para frenar
# fuerza bruta dirigida. Los ataques distribuidos los frena el rate limit por IP.
_MAX_INTENTOS = 5
_BLOQUEO_SEGUNDOS = 300  # 5 minutos
# Límite de memoria: miles de correos falsos no pueden crecer el diccionario
# indefinidamente (anti-DoS contra la RAM del servidor)
_MAX_REGISTROS = 10000
_intentos_fallidos = {}
_lock = threading.Lock()

def _cuenta_bloqueada(email):
    with _lock:
        registro = _intentos_fallidos.get(email)
        if not registro:
            return 0
        intentos, hasta = registro
        if intentos >= _MAX_INTENTOS and time.time() < hasta:
            return int(hasta - time.time())
        return 0

def _registrar_fallo(email):
    with _lock:
        # Purga de entradas ya expiradas si el diccionario creció demasiado
        if len(_intentos_fallidos) > _MAX_REGISTROS:
            ahora = time.time()
            for k in [k for k, v in _intentos_fallidos.items() if v[1] < ahora]:
                del _intentos_fallidos[k]
            while len(_intentos_fallidos) > _MAX_REGISTROS:
                _intentos_fallidos.pop(next(iter(_intentos_fallidos)))
        intentos, _ = _intentos_fallidos.get(email, [0, 0])
        _intentos_fallidos[email] = [intentos + 1, time.time() + _BLOQUEO_SEGUNDOS]

def _registrar_exito(email):
    with _lock:
        _intentos_fallidos.pop(email, None)

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
    if not usuario or not usuario.check_password(password):
        _registrar_fallo(email)
        return jsonify({"error": "Credenciales inválidas", "message": "Email o contraseña incorrectos"}), 401

    _registrar_exito(email)

    # Crear token JWT
    access_token = create_access_token(identity=str(usuario.id))

    return jsonify({
        "message": "Sesión iniciada con éxito",
        "token": access_token,
        "usuario": usuario.to_dict()
    }), 200

@auth_bp.route('/cambiar-password', methods=['POST'])
@jwt_required()
def cambiar_password():
    """Permite a cualquier usuario autenticado cambiar su propia contraseña."""
    current_user_id = int(get_jwt_identity())
    usuario = Usuario.query.get(current_user_id)
    if not usuario:
        return jsonify({"error": "No encontrado", "message": "Usuario no encontrado"}), 404

    data = request.get_json() or {}
    actual = data.get('password_actual') or ''
    nueva = data.get('password_nueva') or ''

    if not usuario.check_password(actual):
        return jsonify({"error": "Credenciales inválidas", "message": "La contraseña actual es incorrecta"}), 401

    errors = UsuarioSchema(partial=('nombre', 'email')).validate({'password': nueva})
    if errors:
        mensaje = errors.get('password', ['La nueva contraseña no cumple los requisitos'])[0]
        return jsonify({"error": "Validación fallida", "message": str(mensaje)}), 400

    if usuario.check_password(nueva):
        return jsonify({"error": "Validación fallida", "message": "La nueva contraseña debe ser distinta a la actual"}), 400

    usuario.set_password(nueva)
    db.session.commit()
    logger.info("Contraseña actualizada para usuario %s", usuario.email)
    return jsonify({"message": "Contraseña actualizada correctamente"}), 200

@auth_bp.route('/register', methods=['POST'])
@jwt_required()
def register():
    # Obtener el rol del usuario que realiza la petición
    current_user_id = get_jwt_identity()
    current_user = Usuario.query.get(current_user_id)
    
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
        db.session.commit()
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
    usuario = Usuario.query.get(current_user_id)
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
    current_user = Usuario.query.get(current_user_id)
    if not current_user:
        return jsonify({"error": "No encontrado", "message": "Usuario no encontrado"}), 404

    tecnicos = Usuario.query.filter(Usuario.rol.in_(['tecnico', 'admin'])).all()
    if current_user.rol in ['tecnico', 'admin']:
        return jsonify([t.to_dict() for t in tecnicos]), 200
    return jsonify([{"id": t.id, "nombre": t.nombre} for t in tecnicos]), 200

@auth_bp.route('/usuarios', methods=['GET'])
@jwt_required()
def obtener_usuarios():
    current_user_id = int(get_jwt_identity())
    current_user = Usuario.query.get(current_user_id)
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
