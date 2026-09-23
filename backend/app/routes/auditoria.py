from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.auditoria import Auditoria
from app.models.usuario import Usuario

auditoria_bp = Blueprint('auditoria', __name__)

@auditoria_bp.route('', methods=['GET'])
@jwt_required()
def listar_auditoria():
    """Registro de acciones administrativas (solo administradores)."""
    usuario = Usuario.query.get(int(get_jwt_identity()))
    if not usuario or usuario.rol != 'admin':
        return jsonify({"error": "No autorizado", "message": "Solo administradores pueden ver la auditoría"}), 403

    registros = Auditoria.query.order_by(Auditoria.created_at.desc()).limit(200).all()
    return jsonify([r.to_dict() for r in registros]), 200
