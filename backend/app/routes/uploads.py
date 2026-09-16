import os
import uuid
from flask import Blueprint, request, jsonify, send_from_directory, current_app
import logging
from flask_jwt_extended import jwt_required
from werkzeug.utils import secure_filename
from app import limiter
uploads_bp = Blueprint('uploads', __name__)
logger = logging.getLogger('drasac.uploads')

# Carpeta donde se guardan los archivos subidos (backend/uploads)
CARPETA_UPLOADS = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'uploads')

# Extensiones permitidas: imágenes para artículos y chat, documentos para el chat
EXT_IMAGENES = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
EXT_DOCUMENTOS = {'pdf', 'doc', 'docx'}
TAMANIO_MAX = 5 * 1024 * 1024  # 5 MB

os.makedirs(CARPETA_UPLOADS, exist_ok=True)


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
    if archivo.tell() > TAMANIO_MAX:
        return jsonify({"error": "Archivo muy grande", "message": "El archivo no puede superar los 5 MB"}), 400
    archivo.seek(0)

    nombre_final = f"{uuid.uuid4().hex}.{extension}"
    archivo.save(os.path.join(CARPETA_UPLOADS, nombre_final))

    # URL relativa para que funcione igual en desarrollo y producción
    return jsonify({
        "url": f"/api/uploads/{nombre_final}",
        "nombre_original": nombre_seguro,
    }), 201


@uploads_bp.route('/<nombre>', methods=['GET'])
def descargar_archivo(nombre):
    # Ruta pública: las etiquetas <img> del frontend no envían el token JWT
    nombre = secure_filename(nombre)
    return send_from_directory(CARPETA_UPLOADS, nombre)
