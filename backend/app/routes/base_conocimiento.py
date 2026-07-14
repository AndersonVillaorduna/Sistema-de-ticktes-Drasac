from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.base_conocimiento import BaseConocimiento
from app.models.usuario import Usuario
from app import db

base_conocimiento_bp = Blueprint('base_conocimiento', __name__)

@base_conocimiento_bp.route('', methods=['GET'], strict_slashes=False)
@jwt_required()
def listar_articulos():
    articulos = BaseConocimiento.query.all()
    return jsonify([a.to_dict() for a in articulos]), 200

@base_conocimiento_bp.route('/<int:id>', methods=['GET'])
@jwt_required()
def obtener_articulo(id):
    articulo = BaseConocimiento.query.get_or_404(id)
    return jsonify(articulo.to_dict()), 200

@base_conocimiento_bp.route('', methods=['POST'], strict_slashes=False)
@jwt_required()
def crear_articulo():
    current_user_id = int(get_jwt_identity())
    usuario = Usuario.query.get(current_user_id)
    if not usuario or usuario.rol not in ['admin', 'tecnico']:
        return jsonify({"error": "No autorizado", "message": "Solo técnicos y administradores pueden crear artículos."}), 403

    data = request.get_json()
    if not data or not data.get('problema_tipo') or not data.get('solucion') or not data.get('palabras_clave'):
        return jsonify({"error": "Faltan datos", "message": "Debe incluir problema_tipo, solucion y palabras_clave."}), 400

    # Ensure categoria_id is an integer if provided
    categoria_id = data.get('categoria_id')
    if not categoria_id:  # Handles None, "", 0, etc.
        categoria_id = None
    else:
        try:
            categoria_id = int(categoria_id)
        except ValueError:
            categoria_id = None

    nuevo_articulo = BaseConocimiento(
        categoria_id=categoria_id,
        problema_tipo=data['problema_tipo'],
        solucion=data['solucion'],
        palabras_clave=data['palabras_clave']
    )
    
    try:
        db.session.add(nuevo_articulo)
        db.session.commit()
        return jsonify({"message": "Artículo creado exitosamente", "articulo": nuevo_articulo.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Error de servidor", "message": str(e)}), 500

@base_conocimiento_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
def eliminar_articulo(id):
    current_user_id = int(get_jwt_identity())
    usuario = Usuario.query.get(current_user_id)
    if not usuario or usuario.rol != 'admin':
        return jsonify({"error": "No autorizado", "message": "Solo administradores pueden eliminar artículos."}), 403

    articulo = BaseConocimiento.query.get_or_404(id)
    try:
        db.session.delete(articulo)
        db.session.commit()
        return jsonify({"message": "Artículo eliminado correctamente."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Error de servidor", "message": str(e)}), 500
