from flask import Blueprint, request, jsonify
import logging
from flask_jwt_extended import jwt_required, get_jwt_identity
import json as _json
from app.models.base_conocimiento import BaseConocimiento
from app.models.categoria import Categoria
from app.models.usuario import Usuario
from app import db
base_conocimiento_bp = Blueprint('base_conocimiento', __name__)
logger = logging.getLogger('drasac.base_conocimiento')

def _normalizar_pasos(pasos):
    """Valida la lista de pasos [{texto, imagen_url}] y devuelve el JSON a guardar."""
    if pasos is None:
        return None
    if not isinstance(pasos, list):
        raise ValueError("pasos debe ser una lista")
    limpios = []
    for p in pasos:
        if not isinstance(p, dict):
            continue
        texto = (p.get('texto') or '').strip()
        if not texto:
            continue
        limpios.append({
            'texto': texto,
            'imagen_url': (p.get('imagen_url') or '').strip() or None
        })
    return _json.dumps(limpios, ensure_ascii=False) if limpios else None

def _requiere_admin():
    current_user_id = int(get_jwt_identity())
    usuario = Usuario.query.get(current_user_id)
    return usuario and usuario.rol == 'admin'

@base_conocimiento_bp.route('', methods=['GET'])
@jwt_required()
def listar_articulos():
    articulos = BaseConocimiento.query.order_by(BaseConocimiento.id.asc()).all()
    return jsonify([a.to_dict() for a in articulos]), 200

@base_conocimiento_bp.route('', methods=['POST'])
@jwt_required()
def crear_articulo():
    if not _requiere_admin():
        return jsonify({"error": "No autorizado", "message": "Solo los administradores pueden gestionar la base de conocimiento"}), 403

    data = request.get_json()
    if not data:
        return jsonify({"error": "Petición incorrecta", "message": "Faltan datos de entrada"}), 400

    problema_tipo = (data.get('problema_tipo') or '').strip()
    solucion = (data.get('solucion') or '').strip()
    palabras_clave = (data.get('palabras_clave') or '').strip()
    categoria_id = data.get('categoria_id')

    if not problema_tipo or not solucion or not palabras_clave:
        return jsonify({"error": "Datos incompletos", "message": "Problema, solución y palabras clave son obligatorios"}), 400

    if categoria_id is not None:
        if not Categoria.query.get(categoria_id):
            return jsonify({"error": "Datos inválidos", "message": "La categoría indicada no existe"}), 400

    try:
        articulo = BaseConocimiento(
            categoria_id=categoria_id,
            problema_tipo=problema_tipo,
            solucion=solucion,
            palabras_clave=palabras_clave.lower(),
            imagen_url=(data.get('imagen_url') or '').strip() or None,
            pasos=_normalizar_pasos(data.get('pasos'))
        )
        db.session.add(articulo)
        db.session.commit()
        return jsonify({"message": "Artículo creado", "articulo": articulo.to_dict()}), 201
    except Exception:
        db.session.rollback()
        logger.exception("Error interno")
        return jsonify({"error": "Error interno", "message": "Ocurrió un error interno. Intenta de nuevo."}), 500

@base_conocimiento_bp.route('/<int:articulo_id>', methods=['PUT'])
@jwt_required()
def actualizar_articulo(articulo_id):
    if not _requiere_admin():
        return jsonify({"error": "No autorizado", "message": "Solo los administradores pueden gestionar la base de conocimiento"}), 403

    articulo = BaseConocimiento.query.get(articulo_id)
    if not articulo:
        return jsonify({"error": "No encontrado", "message": "El artículo no existe"}), 404

    data = request.get_json()
    if not data:
        return jsonify({"error": "Petición incorrecta", "message": "Faltan datos de entrada"}), 400

    if 'problema_tipo' in data:
        articulo.problema_tipo = (data.get('problema_tipo') or '').strip() or articulo.problema_tipo
    if 'solucion' in data:
        articulo.solucion = (data.get('solucion') or '').strip() or articulo.solucion
    if 'palabras_clave' in data:
        articulo.palabras_clave = (data.get('palabras_clave') or '').strip().lower() or articulo.palabras_clave
    if 'categoria_id' in data:
        categoria_id = data.get('categoria_id')
        if categoria_id is not None and not Categoria.query.get(categoria_id):
            return jsonify({"error": "Datos inválidos", "message": "La categoría indicada no existe"}), 400
        articulo.categoria_id = categoria_id
    if 'imagen_url' in data:
        articulo.imagen_url = (data.get('imagen_url') or '').strip() or None
    if 'pasos' in data:
        try:
            articulo.pasos = _normalizar_pasos(data.get('pasos'))
        except ValueError:
            return jsonify({"error": "Datos inválidos", "message": "El formato de los pasos no es válido"}), 400

    try:
        db.session.commit()
        return jsonify({"message": "Artículo actualizado", "articulo": articulo.to_dict()}), 200
    except Exception:
        db.session.rollback()
        logger.exception("Error interno")
        return jsonify({"error": "Error interno", "message": "Ocurrió un error interno. Intenta de nuevo."}), 500

@base_conocimiento_bp.route('/<int:articulo_id>', methods=['DELETE'])
@jwt_required()
def eliminar_articulo(articulo_id):
    if not _requiere_admin():
        return jsonify({"error": "No autorizado", "message": "Solo los administradores pueden gestionar la base de conocimiento"}), 403

    articulo = BaseConocimiento.query.get(articulo_id)
    if not articulo:
        return jsonify({"error": "No encontrado", "message": "El artículo no existe"}), 404

    try:
        db.session.delete(articulo)
        db.session.commit()
        return jsonify({"message": "Artículo eliminado"}), 200
    except Exception:
        db.session.rollback()
        logger.exception("Error interno")
        return jsonify({"error": "Error interno", "message": "Ocurrió un error interno. Intenta de nuevo."}), 500
