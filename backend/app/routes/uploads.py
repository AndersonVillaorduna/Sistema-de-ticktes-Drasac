"""Authorized uploads and short-lived downloads for existing img/link elements."""
import io
import os
import re
import shutil
import time
import uuid
import zipfile
from datetime import datetime, timezone
from urllib.parse import urlsplit
from flask import Blueprint, abort, current_app, g, jsonify, request, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity, verify_jwt_in_request
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from PIL import Image, UnidentifiedImageError
from app import db, limiter
from app.locks import shared_lock
from app.permissions import current_user, can_access_ticket
from app.security_models import Upload, UploadQuota, RevokedToken

uploads_bp = Blueprint('uploads', __name__)
CARPETA_UPLOADS = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'uploads')
EXT_IMAGENES = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
EXT_DOCUMENTOS = {'pdf', 'doc', 'docx'}
TAMANIO_MAX = 5 * 1024 * 1024
_NAME = re.compile(r'^[a-f0-9]{32}\.(png|jpe?g|gif|webp|pdf|docx?)$')
_FORMATS = {'png': 'PNG', 'jpg': 'JPEG', 'jpeg': 'JPEG', 'gif': 'GIF', 'webp': 'WEBP'}


def folder():
    return current_app.config.get('UPLOAD_FOLDER', CARPETA_UPLOADS)


def canonical_upload(value):
    if not isinstance(value, str):
        abort(400, description='Archivo inválido')
    parsed = urlsplit(value)
    parts = parsed.path.split('/')
    if parsed.scheme or parsed.netloc or len(parts) not in (4, 5) or parts[:3] != ['', 'api', 'uploads'] or not _NAME.fullmatch(parts[-1]):
        abort(400, description='Archivo inválido')
    return '/api/uploads/' + parts[-1]


def _references():
    from app.models.comentario import Comentario
    from app.models.base_conocimiento import BaseConocimiento
    refs = set()
    for (url,) in db.session.query(Comentario.adjunto_url).filter(Comentario.adjunto_url.isnot(None)):
        refs.add(urlsplit(url).path.split('/')[-1])
    for article in BaseConocimiento.query.all():
        if article.imagen_url:
            refs.add(urlsplit(article.imagen_url).path.split('/')[-1])
        for step in article.get_pasos():
            if isinstance(step, dict) and step.get('imagen_url'):
                refs.add(urlsplit(step['imagen_url']).path.split('/')[-1])
    return refs


def _knowledge_file(name):
    from app.models.base_conocimiento import BaseConocimiento
    for article in BaseConocimiento.query.all():
        values = [article.imagen_url] + [s.get('imagen_url') for s in article.get_pasos() if isinstance(s, dict)]
        if any(v and urlsplit(v).path.split('/')[-1] == name for v in values):
            return True
    return False


def can_read(user, path):
    from app.models.comentario import Comentario
    name = canonical_upload(path).rsplit('/', 1)[-1]
    if user.rol == 'admin':
        return True
    upload = db.session.get(Upload, name)
    if upload and upload.usuario_id == user.id:
        return True
    if _knowledge_file(name):
        return True
    comments = Comentario.query.filter(Comentario.adjunto_url == '/api/uploads/' + name).all()
    return any(c.ticket and can_access_ticket(user, c.ticket) for c in comments)


def can_reference(user, path):
    name = canonical_upload(path).rsplit('/', 1)[-1]
    upload = db.session.get(Upload, name)
    if not os.path.isfile(os.path.join(folder(), name)):
        return False
    return bool(upload and upload.usuario_id == user.id) or (
        user.rol == 'admin' and (bool(upload) or name in _references())
    )


def _signer():
    return URLSafeTimedSerializer(current_app.config['SECRET_KEY'], salt='drasac-upload-v1')


def signed_path(path, user):
    from app.security import session_version
    canonical = canonical_upload(path)
    try:
        payload = get_jwt()
        jti, expires = payload['jti'], payload['exp']
    except (RuntimeError, KeyError):
        return canonical
    token = _signer().dumps({'uid': user.id, 'name': canonical.rsplit('/', 1)[-1],
                             'sv': session_version(user), 'jti': jti, 'exp': expires})
    return '/api/uploads/' + token + '/' + canonical.rsplit('/', 1)[-1]


def _consumo_hoy():
    row = db.session.get(UploadQuota, datetime.now(timezone.utc).date().isoformat())
    return row.bytes if row else 0


def validate_file(content, extension):
    if not content:
        abort(400, description='El archivo está vacío')
    if extension in EXT_IMAGENES:
        try:
            with Image.open(io.BytesIO(content)) as image:
                if image.format != _FORMATS[extension] or image.width * image.height > 20000000:
                    abort(400, description='Imagen inválida o demasiado grande')
                image.verify()
        except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError):
            abort(400, description='El contenido no coincide con una imagen válida')
    elif extension == 'pdf':
        if not content.startswith(b'%PDF-'):
            abort(400, description='PDF inválido')
    elif extension == 'doc':
        if not content.startswith(bytes.fromhex('D0CF11E0A1B11AE1')):
            abort(400, description='Documento Word inválido')
    elif extension == 'docx':
        try:
            with zipfile.ZipFile(io.BytesIO(content)) as archive:
                infos = archive.infolist()
                names = {i.filename for i in infos}
                if len(infos) > 1000 or sum(i.file_size for i in infos) > 20 * 1024 * 1024 or not {'[Content_Types].xml', 'word/document.xml'} <= names:
                    abort(400, description='Documento Word inválido')
                if any(i.flag_bits & 1 or i.filename.startswith(('/', '\\')) or '..' in i.filename.replace('\\', '/').split('/') for i in infos):
                    abort(400, description='Documento Word inválido')
        except zipfile.BadZipFile:
            abort(400, description='Documento Word inválido')


@uploads_bp.route('', methods=['POST'])
@jwt_required()
@limiter.limit('30 per hour')
def subir_archivo():
    user = g.current_user
    file = request.files.get('archivo')
    if not file or not file.filename:
        abort(400, description='No se recibió ningún archivo')
    context = request.form.get('contexto', 'chat')
    if context not in ('chat', 'articulo'):
        abort(400, description='Contexto inválido')
    if context == 'articulo' and user.rol != 'admin':
        abort(403, description='Solo administradores pueden subir imágenes de manuales')
    extension = file.filename.rsplit('.', 1)[-1].lower()
    allowed = EXT_IMAGENES | EXT_DOCUMENTOS if context == 'chat' else EXT_IMAGENES
    if extension not in allowed:
        abort(400, description='Formato de archivo no permitido')
    content = file.read(TAMANIO_MAX + 1)
    if len(content) > TAMANIO_MAX:
        abort(400, description='El archivo no puede superar los 5 MB')
    validate_file(content, extension)
    os.makedirs(folder(), exist_ok=True)
    minimum_free = current_app.config.get('UPLOAD_MIN_FREE_BYTES', 100 * 1024 * 1024)
    if shutil.disk_usage(folder()).free - len(content) < minimum_free:
        abort(507, description='No hay espacio suficiente para guardar el archivo')
    name = uuid.uuid4().hex + '.' + extension
    destination = os.path.join(folder(), name)
    day = datetime.now(timezone.utc).date().isoformat()
    with shared_lock('uploads'):
        db.session.rollback()  # Refresh quota after another worker commits.
        quota = db.session.get(UploadQuota, day)
        if quota is None:
            quota = UploadQuota(dia=day, bytes=0)
            db.session.add(quota)
        limit = current_app.config['UPLOAD_DAILY_QUOTA_BYTES']
        user_bytes = db.session.query(db.func.coalesce(db.func.sum(Upload.bytes), 0)).filter(
            Upload.usuario_id == user.id, Upload.created_at >= datetime.combine(datetime.now(timezone.utc).date(), datetime.min.time())
        ).scalar()
        if quota.bytes + len(content) > limit or user_bytes + len(content) > current_app.config['UPLOAD_USER_QUOTA_BYTES']:
            abort(429, description='Se alcanzó el límite diario de archivos')
        try:
            with open(destination, 'xb') as output:
                output.write(content)
            quota.bytes += len(content)
            db.session.add(Upload(nombre=name, usuario_id=user.id, bytes=len(content), contexto=context))
            db.session.commit()
        except Exception:
            db.session.rollback()
            if os.path.exists(destination):
                os.remove(destination)
            raise
    from werkzeug.utils import secure_filename
    return jsonify(url='/api/uploads/' + name, nombre_original=secure_filename(file.filename)), 201


@uploads_bp.route('/<nombre>', methods=['GET'])
@jwt_required()
def descargar_archivo(nombre):
    user = current_user(get_jwt_identity())
    if not _NAME.fullmatch(nombre) or not can_read(user, '/api/uploads/' + nombre):
        abort(403, description='No tienes acceso a este archivo')
    return send_from_directory(folder(), nombre)


@uploads_bp.route('/<token>/<nombre>', methods=['GET'])
def descargar_firmado(token, nombre):
    from app.security import session_version
    if len(token) > 2048 or not _NAME.fullmatch(nombre):
        abort(403, description='Enlace inválido')
    try:
        payload = _signer().loads(token, max_age=current_app.config['UPLOAD_LINK_TTL'])
        user = current_user(payload['uid'])
        if payload['name'] != nombre or payload['sv'] != session_version(user) or payload['exp'] <= time.time() or db.session.get(RevokedToken, payload['jti']) or not can_read(user, '/api/uploads/' + nombre):
            abort(403, description='Enlace inválido o expirado')
    except (BadSignature, SignatureExpired, KeyError, TypeError):
        abort(403, description='Enlace inválido o expirado')
    return send_from_directory(folder(), nombre)


def limpiar_antiguos():
    """Only unreferenced files expire; manuals and recorded conversations survive."""
    if not os.path.isdir(folder()):
        return 0
    cutoff = time.time() - current_app.config['UPLOAD_RETENTION_DAYS'] * 86400
    deleted = 0
    with shared_lock('uploads'):
        references = _references()
        for name in os.listdir(folder()):
            path = os.path.join(folder(), name)
            if _NAME.fullmatch(name) and name not in references and os.path.isfile(path) and os.path.getmtime(path) < cutoff:
                os.remove(path)
                row = db.session.get(Upload, name)
                if row:
                    db.session.delete(row)
                deleted += 1
        db.session.commit()
    return deleted
