from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app.models.usuario import Usuario
from app.schemas.schemas import UsuarioSchema
from app import db, limiter

auth_bp = Blueprint('auth', __name__)

usuario_schema = UsuarioSchema()
registro_schema = UsuarioSchema()

@auth_bp.route('/login', methods=['POST'])
@limiter.limit("20 per minute")  # Prevenir ataques de fuerza bruta
def login():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Petición incorrecta", "message": "Faltan datos de entrada"}), 400

    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"error": "Datos incompletos", "message": "Email y contraseña son obligatorios"}), 400

    usuario = Usuario.query.filter_by(email=email).first()
    if not usuario or not usuario.check_password(password):
        return jsonify({"error": "Credenciales inválidas", "message": "Email o contraseña incorrectos"}), 401

    # Crear token JWT
    access_token = create_access_token(identity=str(usuario.id))
    
    return jsonify({
        "message": "Sesión iniciada con éxito",
        "token": access_token,
        "usuario": usuario.to_dict()
    }), 200

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
        return jsonify({
            "message": "Usuario registrado exitosamente",
            "usuario": nuevo_usuario.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Error interno", "message": str(e)}), 500

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
    tecnicos = Usuario.query.filter(Usuario.rol.in_(['tecnico', 'admin'])).all()
    return jsonify([t.to_dict() for t in tecnicos]), 200
