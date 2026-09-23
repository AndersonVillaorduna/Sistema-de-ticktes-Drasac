import os
import logging
from datetime import timedelta
from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, verify_jwt_in_request, get_jwt_identity
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Logging (los errores quedan en el log del servidor, no en prints sueltos)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(name)s: %(message)s'
)
logger = logging.getLogger('drasac')

# Inicializar extensiones
db = SQLAlchemy()
jwt = JWTManager()
cors = CORS()

def _key_func():
    """Clave del limitador: por USUARIO autenticado (cada persona tiene su
    propio cupo, clave para oficinas/tiendas que comparten una misma IP),
    y por IP solo para peticiones anónimas (login, etc.)."""
    try:
        verify_jwt_in_request(optional=True)
        identidad = get_jwt_identity()
        if identidad:
            return f"usuario-{identidad}"
    except Exception:
        pass
    return get_remote_address()

# Configurar limitador de peticiones para endpoints sensibles.
# El almacenamiento es configurable: en producción con varios workers usar
# Redis (RATELIMIT_STORAGE_URI=redis://localhost:6379/0) para que el cupo
# sea compartido entre procesos.
limiter = Limiter(
    key_func=_key_func,
    default_limits=["200000 per day", "20000 per hour"],
    storage_uri=os.getenv('RATELIMIT_STORAGE_URI', 'memory://'),
)

def create_app():
    flask_app = Flask(__name__)

    es_produccion = os.getenv('FLASK_ENV', 'development') == 'production'

    # ── Llaves secretas: NUNCA usar los valores por defecto en producción ──
    secret_key = os.getenv('SECRET_KEY', '')
    jwt_secret_key = os.getenv('JWT_SECRET_KEY', '')
    if es_produccion and (not secret_key or not jwt_secret_key
                          or secret_key == 'default-dev-key'
                          or jwt_secret_key == 'default-jwt-key'):
        raise RuntimeError(
            "SECRET_KEY y JWT_SECRET_KEY deben estar definidas en el .env "
            "con valores aleatorios antes de ejecutar en producción "
            "(genera una con: python -c \"import secrets; print(secrets.token_hex(32))\")."
        )
    flask_app.config['SECRET_KEY'] = secret_key or 'default-dev-key'
    flask_app.config['JWT_SECRET_KEY'] = jwt_secret_key or 'default-jwt-key'
    flask_app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('SQLALCHEMY_DATABASE_URI', 'sqlite:///drasac.db')
    flask_app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    # Rechaza de plano cuerpos mayores a 8 MB (anti-DoS en subida de archivos)
    flask_app.config['MAX_CONTENT_LENGTH'] = 8 * 1024 * 1024

    # ── Duración de la sesión (por defecto 12 horas; antes 15 min de Flask,
    #    que pateaba a todos al login constantemente) ──
    try:
        horas_sesion = int(os.getenv('JWT_EXPIRA_HORAS', '12'))
    except ValueError:
        horas_sesion = 12
    flask_app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=horas_sesion)

    # ── Pool de conexiones (solo MySQL/PostgreSQL): soporta cientos de
    #    peticiones concurrentes sin agotar conexiones ni quedar con sesiones
    #    muertas tras reinicios del servidor de base de datos ──
    if not flask_app.config['SQLALCHEMY_DATABASE_URI'].startswith('sqlite'):
        flask_app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
            'pool_pre_ping': True,     # valida la conexión antes de usarla
            'pool_recycle': 300,       # recicla conexiones viejas (5 min)
            'pool_size': 20,           # conexiones persistentes por worker
            'max_overflow': 40,        # conexiones extra en picos
        }

    # Inicializar con app
    db.init_app(flask_app)
    jwt.init_app(flask_app)

    # ── CORS: solo orígenes autorizados (separados por coma en CORS_ORIGINS) ──
    origins = [o.strip() for o in os.getenv('CORS_ORIGINS', '*').split(',') if o.strip()]
    cors.init_app(flask_app, resources={r"/*": {"origins": origins}})
    limiter.init_app(flask_app)

    # ── Cabeceras de seguridad en todas las respuestas ──
    @flask_app.after_request
    def cabeceras_seguridad(response):
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response.headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'
        return response
    
    # ── SQLite: modo WAL + busy_timeout ──
    # WAL permite lecturas y escrituras SIMULTÁNEAS sin "database is locked"
    # (esencial con varias tiendas usando el sistema a la vez). El listener es
    # global y solo aplica a conexiones sqlite.
    from sqlalchemy import event as sa_event
    from sqlalchemy.engine import Engine

    @sa_event.listens_for(Engine, 'connect')
    def _sqlite_pragmas(dbapi_con, _record):
        if 'sqlite' not in dbapi_con.__class__.__module__:
            return
        cur = dbapi_con.cursor()
        cur.execute("PRAGMA journal_mode=WAL")
        cur.execute("PRAGMA busy_timeout=10000")   # espera 10s si hay lock en vez de fallar
        cur.execute("PRAGMA synchronous=NORMAL")   # buen balance velocidad/seguridad
        cur.close()

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
    from app.routes.uploads import uploads_bp
    from app.routes.notificaciones import notificaciones_bp
    from app.routes.auditoria import auditoria_bp

    flask_app.register_blueprint(auth_bp, url_prefix='/api/auth')
    flask_app.register_blueprint(tickets_bp, url_prefix='/api/tickets')
    flask_app.register_blueprint(inventario_bp, url_prefix='/api/inventario')
    flask_app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    flask_app.register_blueprint(categorias_bp, url_prefix='/api/categorias')
    flask_app.register_blueprint(base_conocimiento_bp, url_prefix='/api/base-conocimiento')
    flask_app.register_blueprint(uploads_bp, url_prefix='/api/uploads')
    flask_app.register_blueprint(notificaciones_bp, url_prefix='/api/notificaciones')
    flask_app.register_blueprint(auditoria_bp, url_prefix='/api/auditoria')

    # Crear tablas en base de datos si no existen
    with flask_app.app_context():
        import app.models  # Importar modelos para registrarlos
        db.create_all()
        _ejecutar_migraciones()

    @flask_app.route('/health', methods=['GET'])
    def health():
        return jsonify({"status": "healthy", "database": "connected"}), 200

    return flask_app


def _ejecutar_migraciones():
    """Migraciones ligeras para bases de datos ya creadas
    (db.create_all no modifica tablas existentes)."""
    from sqlalchemy import text
    try:
        with db.engine.connect() as conn:
            # inventario.fecha_entrega
            columnas = [fila[1] for fila in conn.execute(text("PRAGMA table_info(inventario)"))]
            if columnas and 'fecha_entrega' not in columnas:
                conn.execute(text("ALTER TABLE inventario ADD COLUMN fecha_entrega DATE"))
                conn.commit()
                print("Migración aplicada: columna 'fecha_entrega' agregada a 'inventario'")

            # base_conocimiento.imagen_url / pasos
            columnas = [fila[1] for fila in conn.execute(text("PRAGMA table_info(base_conocimiento)"))]
            if columnas and 'imagen_url' not in columnas:
                conn.execute(text("ALTER TABLE base_conocimiento ADD COLUMN imagen_url VARCHAR(500)"))
                conn.commit()
                print("Migración aplicada: columna 'imagen_url' agregada a 'base_conocimiento'")
            if columnas and 'pasos' not in columnas:
                conn.execute(text("ALTER TABLE base_conocimiento ADD COLUMN pasos TEXT"))
                conn.commit()
                print("Migración aplicada: columna 'pasos' agregada a 'base_conocimiento'")

            # comentarios_ticket.adjunto_url
            columnas = [fila[1] for fila in conn.execute(text("PRAGMA table_info(comentarios_ticket)"))]
            if columnas and 'adjunto_url' not in columnas:
                conn.execute(text("ALTER TABLE comentarios_ticket ADD COLUMN adjunto_url VARCHAR(500)"))
                conn.commit()
                print("Migración aplicada: columna 'adjunto_url' agregada a 'comentarios_ticket'")

            # tickets.articulo_id / paso_actual (flujo de pasos del manual)
            columnas = [fila[1] for fila in conn.execute(text("PRAGMA table_info(tickets)"))]
            if columnas and 'articulo_id' not in columnas:
                conn.execute(text("ALTER TABLE tickets ADD COLUMN articulo_id INTEGER"))
                conn.commit()
                print("Migración aplicada: columna 'articulo_id' agregada a 'tickets'")
            if columnas and 'paso_actual' not in columnas:
                conn.execute(text("ALTER TABLE tickets ADD COLUMN paso_actual INTEGER DEFAULT 0"))
                conn.commit()
                print("Migración aplicada: columna 'paso_actual' agregada a 'tickets'")
            if columnas and 'resuelto_por' not in columnas:
                conn.execute(text("ALTER TABLE tickets ADD COLUMN resuelto_por VARCHAR(20)"))
                conn.commit()
                print("Migración aplicada: columna 'resuelto_por' agregada a 'tickets'")
            if columnas and 'resuelto_por_id' not in columnas:
                conn.execute(text("ALTER TABLE tickets ADD COLUMN resuelto_por_id INTEGER"))
                conn.commit()
                print("Migración aplicada: columna 'resuelto_por_id' agregada a 'tickets'")

            # inventario: imei_chip / windows_version / password (campos por tipo)
            columnas = [fila[1] for fila in conn.execute(text("PRAGMA table_info(inventario)"))]
            if columnas and 'imei_chip' not in columnas:
                conn.execute(text("ALTER TABLE inventario ADD COLUMN imei_chip VARCHAR(30)"))
                conn.commit()
                print("Migración aplicada: columna 'imei_chip' agregada a 'inventario'")
            if columnas and 'windows_version' not in columnas:
                conn.execute(text("ALTER TABLE inventario ADD COLUMN windows_version VARCHAR(50)"))
                conn.commit()
                print("Migración aplicada: columna 'windows_version' agregada a 'inventario'")
            if columnas and 'password' not in columnas:
                conn.execute(text("ALTER TABLE inventario ADD COLUMN password VARCHAR(300)"))
                conn.commit()
                print("Migración aplicada: columna 'password' agregada a 'inventario'")
    except Exception as e:
        # Si el motor no es SQLite u ocurre otro fallo, no bloquear el arranque
        print(f"Aviso: no se pudo verificar migraciones: {e}")
