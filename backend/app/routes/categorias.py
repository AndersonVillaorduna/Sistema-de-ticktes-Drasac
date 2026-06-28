from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from app.models.categoria import Categoria

categorias_bp = Blueprint('categorias', __name__)

@categorias_bp.route('', methods=['GET'])
@jwt_required()
def obtener_categorias():
    categorias = Categoria.query.all()
    return jsonify([c.to_dict() for c in categorias]), 200
