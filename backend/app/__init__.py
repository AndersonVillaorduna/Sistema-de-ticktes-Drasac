import os
from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Inicializar extensiones
db = SQLAlchemy()
jwt = JWTManager()
cors = CORS()

# Configurar limitador de peticiones para endpoints sensibles
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)

def create_app():
    flask_app = Flask(__name__)
    
    # Configuración
    flask_app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'default-dev-key')
    flask_app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'default-jwt-key')
    flask_app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('SQLALCHEMY_DATABASE_URI', 'sqlite:///drasac.db')
    flask_app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Inicializar con app
    db.init_app(flask_app)
    jwt.init_app(flask_app)
    cors.init_app(flask_app, resources={r"/*": {"origins": "*"}})
    limiter.init_app(flask_app)
    
    # Manejadores de errores de JWT
    @jwt.unauthorized_loader
    def unauthorized_response(callback):
        return jsonify({
            "error": "Acceso no autorizado",
            "message": "Falta el token de autorización"
        }), 401

    @jwt.invalid_token_loader
    def invalid_token_response(callback):
        return jsonify({
            "error": "Token inválido",
            "message": "El token proporcionado no es válido o ha sido alterado"
        }), 401

    @jwt.expired_token_loader
    def expired_token_response(jwt_header, jwt_payload):
        return jsonify({
            "error": "Token expirado",
            "message": "La sesión ha expirado. Por favor, inicie sesión nuevamente."
        }), 401

    # Registrar blueprints
    from app.routes.auth import auth_bp
    from app.routes.tickets import tickets_bp
    from app.routes.inventario import inventario_bp
    from app.routes.dashboard import dashboard_bp
    from app.routes.categorias import categorias_bp
    from app.routes.base_conocimiento import base_conocimiento_bp
    
    flask_app.register_blueprint(auth_bp, url_prefix='/api/auth')
    flask_app.register_blueprint(tickets_bp, url_prefix='/api/tickets')
    flask_app.register_blueprint(inventario_bp, url_prefix='/api/inventario')
    flask_app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    flask_app.register_blueprint(categorias_bp, url_prefix='/api/categorias')
    flask_app.register_blueprint(base_conocimiento_bp, url_prefix='/api/base-conocimiento')

    # Crear tablas en base de datos si no existen
    with flask_app.app_context():
        import app.models  # Importar modelos para registrarlos
        db.create_all()

    @flask_app.route('/health', methods=['GET'])
    def health():
        return jsonify({"status": "healthy", "database": "connected"}), 200

    return flask_app
