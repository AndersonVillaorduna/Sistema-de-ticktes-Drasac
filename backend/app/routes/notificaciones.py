from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.notificacion import Notificacion
from app import db

notificaciones_bp = Blueprint('notificaciones', __name__)

@notificaciones_bp.route('', methods=['GET'])
@jwt_required()
def listar_notificaciones():
    current_user_id = int(get_jwt_identity())
    notifs = Notificacion.query.filter_by(usuario_id=current_user_id)\
        .order_by(Notificacion.created_at.desc()).limit(30).all()
    no_leidas = Notificacion.query.filter_by(usuario_id=current_user_id, leida=False).count()
    return jsonify({
        "notificaciones": [n.to_dict() for n in notifs],
        "no_leidas": no_leidas
    }), 200

@notificaciones_bp.route('/leer', methods=['POST'])
@jwt_required()
def marcar_leidas():
    current_user_id = int(get_jwt_identity())
    ids = request.get_json(silent=True).get('ids') if request.get_json(silent=True) else None
    query = Notificacion.query.filter_by(usuario_id=current_user_id, leida=False)
    if ids:
        query = query.filter(Notificacion.id.in_(ids))
    query.update({'leida': True}, synchronize_session=False)
    db.session.commit()
    return jsonify({"message": "Notificaciones marcadas como leídas"}), 200
