import os
import uuid
import logging
from datetime import datetime
from flask import Blueprint, request, jsonify, send_from_directory
from flask_jwt_extended import jwt_required
from werkzeug.utils import secure_filename
from app import limiter

uploads_bp = Blueprint('uploads', __name__)
logger = logging.getLogger('drasac.uploads')

# Carpeta donde se guardan los archivos subidos (backend/uploads)
CARPETA_UPLOADS = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'uploads')
CARPETA_RAIZ = os.path.dirname(CARPETA_UPLOADS)  # backend/

# Extensiones permitidas: imágenes para artículos y chat, documentos para el chat
EXT_IMAGENES = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
EXT_DOCUMENTOS = {'pdf', 'doc', 'docx'}
TAMANIO_MAX = 5 * 1024 * 1024  # 5 MB por archivo

# ── Protección anti-llenado de disco ─────────────────────────────────────────
# Cuota GLOBAL diaria de subidas (todas las cuentas suman) y retención de
# archivos. Evita que el disco del servidor se llene y tumbe el sistema.
try:
    CUOTA_DIARIA_BYTES = int(os.getenv('UPLOAD_DAILY_QUOTA_MB', '200')) * 1024 * 1024
except ValueError:
    CUOTA_DIARIA_BYTES = 200 * 1024 * 1024
try:
    RETENCION_DIAS = int(os.getenv('UPLOAD_RETENTION_DAYS', '60'))
except ValueError:
    RETENCION_DIAS = 60

os.makedirs(CARPETA_UPLOADS, exist_ok=True)


def _marcador_cuota():
    """Archivo marcador con los bytes subidos hoy (se reinicia solo al cambiar el día)."""
    return os.path.join(CARPETA_RAIZ, f".cuota_uploads_{datetime.now().strftime('%Y%m%d')}")


def _consumo_hoy():
    marcador = _marcador_cuota()
    try:
        with open(marcador, 'r') as f:
            return int(f.read().strip() or 0)
    except (OSError, ValueError):
        return 0


def _sumar_consumo(bytes_subidos):
    try:
        with open(_marcador_cuota(), 'w') as f:
            f.write(str(_consumo_hoy() + bytes_subidos))
    except OSError:
        pass


def limpiar_antiguos():
    """Borra adjuntos con más de RETENCION_DIAS. La llama backup_db.py."""
    eliminados = 0
    import time
    limite = time.time() - RETENCION_DIAS * 86400
    for nombre in os.listdir(CARPETA_UPLOADS):
        ruta = os.path.join(CARPETA_UPLOADS, nombre)
        try:
            if os.path.isfile(ruta) and os.path.getmtime(ruta) < limite:
                os.remove(ruta)
                eliminados += 1
        except OSError:
            pass
    return eliminados


@uploads_bp.route('', methods=['POST'])
@jwt_required()
@limiter.limit("30 per hour")
def subir_archivo():
    archivo = request.files.get('archivo')
    if not archivo or not archivo.filename:
        return jsonify({"error": "Validación fallida", "message": "No se recibió ningún archivo"}), 400

    nombre_seguro = secure_filename(archivo.filename)
    extension = nombre_seguro.rsplit('.', 1)[-1].lower() if '.' in nombre_seguro else ''

    contexto = request.form.get('contexto', 'chat')  # 'chat' o 'articulo'
    permitidas = EXT_DOCUMENTOS | EXT_IMAGENES if contexto == 'chat' else EXT_IMAGENES
    if extension not in permitidas:
        tipos = 'imagen (png, jpg, jpeg, gif, webp)' if contexto == 'articulo' else 'imagen o documento (png, jpg, jpeg, gif, webp, pdf, doc, docx)'
        return jsonify({"error": "Formato no permitido", "message": f"Solo se aceptan archivos de {tipos}"}), 400

    archivo.seek(0, os.SEEK_END)
    tamanio = archivo.tell()
    if tamanio > TAMANIO_MAX:
        return jsonify({"error": "Archivo muy grande", "message": "El archivo no puede superar los 5 MB"}), 400

    # Cuota diaria GLOBAL: si el disco recibió demasiado hoy, se rechaza
    if _consumo_hoy() + tamanio > CUOTA_DIARIA_BYTES:
        logger.warning("Cuota diaria de uploads alcanzada (%d MB). Rechazando subida.",
                       CUOTA_DIARIA_BYTES // (1024 * 1024))
        return jsonify({
            "error": "Cuota alcanzada",
            "message": "Se alcanzó el límite de archivos subidos por hoy. Intenta de nuevo mañana."
        }), 429
    archivo.seek(0)

    nombre_final = f"{uuid.uuid4().hex}.{extension}"
    archivo.save(os.path.join(CARPETA_UPLOADS, nombre_final))
    _sumar_consumo(tamanio)

    # URL relativa para que funcione igual en desarrollo y producción
    return jsonify({
        "url": f"/api/uploads/{nombre_final}",
        "nombre_original": nombre_seguro,
    }), 201


@uploads_bp.route('/<nombre>', methods=['GET'])
def descargar_archivo(nombre):
    # Ruta pública: las etiquetas <img> del frontend no envían el token JWT.
    # Los nombres son UUID aleatorios (no adivinables).
    nombre = secure_filename(nombre)
    return send_from_directory(CARPETA_UPLOADS, nombre)
