import logging
import os
from datetime import timedelta
from pathlib import Path
from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, verify_jwt_in_request, get_jwt_identity, jwt_required
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from dotenv import load_dotenv
from sqlalchemy import event, text
from sqlalchemy.engine import Engine
from werkzeug.middleware.proxy_fix import ProxyFix
from urllib.parse import urlsplit
import re

load_dotenv(Path(__file__).resolve().parents[1] / '.env')
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(name)s: %(message)s')
logger = logging.getLogger('drasac')
db = SQLAlchemy()
jwt = JWTManager()
cors = CORS()


def _key_func():
    if request.endpoint == 'auth.login':
        return get_remote_address()
    try:
        verify_jwt_in_request(optional=True)
        identity = get_jwt_identity()
        if identity:
            return f'usuario-{identity}'
    except Exception:
        pass
    return get_remote_address()


limiter = Limiter(key_func=_key_func, default_limits=['200000 per day', '20000 per hour'])


@event.listens_for(Engine, 'connect')
def _sqlite_pragmas(connection, _record):
    if 'sqlite' not in connection.__class__.__module__:
        return
    with connection:
        cursor = connection.cursor()
        cursor.execute('PRAGMA journal_mode=WAL')
        cursor.execute('PRAGMA busy_timeout=10000')
        cursor.execute('PRAGMA synchronous=NORMAL')
        cursor.execute('PRAGMA foreign_keys=ON')
        cursor.close()


def _env_int(name, default, minimum=1, maximum=100000):
    try:
        value = int(os.getenv(name, str(default)))
    except ValueError as error:
        raise RuntimeError(f'{name} debe ser un entero') from error
    if not minimum <= value <= maximum:
        raise RuntimeError(f'{name} debe estar entre {minimum} y {maximum}')
    return value


def create_app(config=None):
    app = Flask(__name__, instance_path=(config or {}).get('INSTANCE_PATH'))
    production = os.getenv('FLASK_ENV', 'development').lower() == 'production'
    app.config.update(
        SECRET_KEY=os.getenv('SECRET_KEY') or 'default-dev-key',
        JWT_SECRET_KEY=os.getenv('JWT_SECRET_KEY') or 'default-jwt-key',
        INVENTORY_ENCRYPTION_KEYS=os.getenv('INVENTORY_ENCRYPTION_KEYS', ''),
        SQLALCHEMY_DATABASE_URI=os.getenv('SQLALCHEMY_DATABASE_URI', 'sqlite:///drasac.db'),
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        MAX_CONTENT_LENGTH=8 * 1024 * 1024,
        JWT_TOKEN_LOCATION=['headers', 'cookies'],
        JWT_COOKIE_SECURE=production,
        JWT_COOKIE_SAMESITE=os.getenv('JWT_COOKIE_SAMESITE', 'Lax'),
        JWT_COOKIE_CSRF_PROTECT=True,
        JWT_SESSION_COOKIE=False,
        JWT_ACCESS_COOKIE_PATH='/api/',
        JWT_ACCESS_TOKEN_EXPIRES=timedelta(hours=_env_int('JWT_EXPIRA_HORAS', 12, maximum=24)),
        RATELIMIT_STORAGE_URI=os.getenv('RATELIMIT_STORAGE_URI', 'memory://'),
        UPLOAD_DAILY_QUOTA_BYTES=_env_int('UPLOAD_DAILY_QUOTA_MB', 200) * 1024 * 1024,
        UPLOAD_USER_QUOTA_BYTES=_env_int('UPLOAD_USER_QUOTA_MB', 100) * 1024 * 1024,
        UPLOAD_RETENTION_DAYS=_env_int('UPLOAD_RETENTION_DAYS', 60, maximum=3650),
        UPLOAD_LINK_TTL=_env_int('UPLOAD_LINK_TTL', 3600, maximum=43200),
    )
    if config:
        app.config.update(config)
    placeholders = {'default-dev-key', 'default-jwt-key', 'cambia-esto-por-una-llave-aleatoria', 'cambia-esto-por-otra-llave-aleatoria'}
    origins = [o.strip() for o in app.config.get('CORS_ORIGINS', os.getenv('CORS_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173')).split(',') if o.strip()]
    for origin in origins:
        parsed = urlsplit(origin)
        if parsed.scheme not in ('http', 'https') or parsed.path or parsed.query or parsed.fragment or not re.fullmatch(r'[A-Za-z0-9.-]+(?::[0-9]{1,5})?', parsed.netloc):
            raise RuntimeError('CORS_ORIGINS requiere orígenes exactos, sin comodines ni expresiones regulares')
    if app.config['JWT_COOKIE_SAMESITE'] not in ('Lax', 'Strict', 'None'):
        raise RuntimeError('JWT_COOKIE_SAMESITE debe ser Lax, Strict o None')
    if app.config['JWT_COOKIE_SAMESITE'] == 'None' and not app.config['JWT_COOKIE_SECURE']:
        raise RuntimeError('SameSite=None requiere HTTPS y cookies Secure')
    trusted_proxies = _env_int('TRUSTED_PROXY_COUNT', 0, minimum=0, maximum=3)
    if trusted_proxies:
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=trusted_proxies, x_proto=trusted_proxies, x_host=0, x_port=0, x_prefix=0)
    if production:
        for name in ('SECRET_KEY', 'JWT_SECRET_KEY'):
            if app.config[name] in placeholders or len(app.config[name]) < 32:
                raise RuntimeError(f'{name} necesita una llave aleatoria de al menos 32 caracteres')
        if not origins or '*' in origins or any(not o.startswith('https://') for o in origins):
            raise RuntimeError('CORS_ORIGINS necesita los dominios HTTPS autorizados en producción')
        if app.config['RATELIMIT_STORAGE_URI'] == 'memory://':
            raise RuntimeError('Configura RATELIMIT_STORAGE_URI con Redis en producción')
        if not app.config['INVENTORY_ENCRYPTION_KEYS']:
            raise RuntimeError('Configura INVENTORY_ENCRYPTION_KEYS antes de producción; conserva la llave anterior')
    if app.config['INVENTORY_ENCRYPTION_KEYS']:
        from cryptography.fernet import Fernet
        for key in app.config['INVENTORY_ENCRYPTION_KEYS'].split(','):
            Fernet(key.strip().encode())

    if not app.config['SQLALCHEMY_DATABASE_URI'].startswith('sqlite'):
        app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
            'pool_pre_ping': True, 'pool_recycle': 300,
            'pool_size': _env_int('DB_POOL_SIZE', 5, maximum=100),
            'max_overflow': _env_int('DB_MAX_OVERFLOW', 10, minimum=0, maximum=100),
        }
    db.init_app(app)
    jwt.init_app(app)
    from app.security import register_security
    register_security(app)
    cors.init_app(app, resources={r'/api/*': {'origins': origins}}, expose_headers=['X-Session-Token', 'X-CSRF-Token'], supports_credentials=True, allow_private_network=False)
    limiter.init_app(app)

    @app.after_request
    def security_headers(response):
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['Referrer-Policy'] = response.headers.get('Referrer-Policy', 'strict-origin-when-cross-origin')
        response.headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'
        return response

    @jwt.unauthorized_loader
    def unauthorized(_reason):
        return jsonify(error='Acceso no autorizado', message='Falta el token de autorización'), 401

    @jwt.invalid_token_loader
    def invalid(_reason):
        return jsonify(error='Token inválido', message='La sesión no es válida'), 401

    @jwt.expired_token_loader
    def expired(_header, _payload):
        return jsonify(error='Token expirado', message='La sesión ha expirado. Inicia sesión nuevamente.'), 401

    from app.routes.auth import auth_bp
    from app.routes.tickets import tickets_bp
    from app.routes.inventario import inventario_bp
    from app.routes.dashboard import dashboard_bp
    from app.routes.categorias import categorias_bp
    from app.routes.base_conocimiento import base_conocimiento_bp
    from app.routes.uploads import uploads_bp
    from app.routes.notificaciones import notificaciones_bp
    from app.routes.auditoria import auditoria_bp
    for blueprint, prefix in [
        (auth_bp, 'auth'), (tickets_bp, 'tickets'), (inventario_bp, 'inventario'),
        (dashboard_bp, 'dashboard'), (categorias_bp, 'categorias'),
        (base_conocimiento_bp, 'base-conocimiento'), (uploads_bp, 'uploads'),
        (notificaciones_bp, 'notificaciones'), (auditoria_bp, 'auditoria'),
    ]:
        app.register_blueprint(blueprint, url_prefix='/api/' + prefix)
    with app.app_context():
        from app import models, security_models
        from app.migrate import upgrade_schema
        upgrade_schema(app)

    @app.get('/health')
    def health():
        try:
            db.session.execute(text('SELECT 1'))
            return jsonify(status='healthy', database='connected'), 200
        except Exception:
            db.session.rollback()
            return jsonify(status='unavailable', database='unavailable'), 503

    @app.get('/live')
    def live():
        return jsonify(status='alive'), 200

    @app.get('/api/ia/status')
    @jwt_required()
    def ia_status():
        from app.services.ia_service import estado_ia
        return jsonify(estado_ia())

    return app
