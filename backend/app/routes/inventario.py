from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.inventario import Inventario
from app.models.usuario import Usuario
from app.schemas.schemas import InventarioSchema
from app.services.ia_service import generar_informe_equipos
from app import db
from datetime import datetime, date

inventario_bp = Blueprint('inventario', __name__)
inventario_schema = InventarioSchema()
inventario_list_schema = InventarioSchema(many=True)

def _parse_fecha_entrega(valor):
    """Convierte 'YYYY-MM-DD' en date; devuelve None si es inválida o vacía."""
    if not valor:
        return None
    try:
        return date.fromisoformat(str(valor))
    except ValueError:
        return None

def verificar_rol_permitido(permitidos):
    """Auxiliar para verificar si el usuario tiene un rol permitido."""
    user_id = get_jwt_identity()
    user = Usuario.query.get(user_id)
    if not user or user.rol not in permitidos:
        return False, jsonify({"error": "No autorizado", "message": f"Acceso restringido a roles: {', '.join(permitidos)}"}), 403
    return True, None, None

@inventario_bp.route('', methods=['GET'])
@jwt_required()
def listar_inventario():
    # Obtener filtros opcionales
    busqueda = request.args.get('search', '').strip()
    tipo = request.args.get('tipo', '').strip()
    estado = request.args.get('estado', '').strip()

    query = Inventario.query

    if busqueda:
        query = query.filter(
            (Inventario.nombre_equipo.like(f'%{busqueda}%')) |
            (Inventario.numero_serie.like(f'%{busqueda}%')) |
            (Inventario.ubicacion_tienda.like(f'%{busqueda}%')) |
            (Inventario.asignado_a.like(f'%{busqueda}%'))
        )
    if tipo:
        query = query.filter(Inventario.tipo == tipo)
    if estado:
        query = query.filter(Inventario.estado == estado)

    equipos = query.all()
    return jsonify(inventario_list_schema.dump(equipos)), 200

@inventario_bp.route('', methods=['POST'])
@jwt_required()
def crear_equipo():
    permitido, response, status = verificar_rol_permitido(['admin', 'tecnico'])
    if not permitido:
        return response, status

    data = request.get_json()
    errors = inventario_schema.validate(data)
    if errors:
        return jsonify({"error": "Validación fallida", "messages": errors}), 400

    # Verificar número de serie único
    if Inventario.query.filter_by(numero_serie=data.get('numero_serie')).first():
        return jsonify({"error": "Conflicto", "message": "El número de serie ya está registrado"}), 409

    fecha_adq = None
    if data.get('fecha_adquisicion'):
        try:
            fecha_adq = datetime.fromisoformat(data.get('fecha_adquisicion').replace('Z', ''))
        except ValueError:
            pass

    nuevo_equipo = Inventario(
        nombre_equipo=data.get('nombre_equipo'),
        tipo=data.get('tipo'),
        marca=data.get('marca'),
        modelo=data.get('modelo'),
        numero_serie=data.get('numero_serie'),
        ubicacion_tienda=data.get('ubicacion_tienda'),
        estado=data.get('estado', 'activo'),
        anydesk_id=data.get('anydesk_id'),
        asignado_a=data.get('asignado_a'),
        fecha_adquisicion=fecha_adq,
        fecha_entrega=_parse_fecha_entrega(data.get('fecha_entrega'))
    )

    try:
        db.session.add(nuevo_equipo)
        db.session.commit()
        return jsonify({
            "message": "Equipo de inventario registrado con éxito",
            "equipo": nuevo_equipo.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Error interno", "message": str(e)}), 500

@inventario_bp.route('/<int:id>', methods=['GET'])
@jwt_required()
def obtener_equipo(id):
    equipo = Inventario.query.get(id)
    if not equipo:
        return jsonify({"error": "No encontrado", "message": "Equipo no encontrado"}), 404
    return jsonify(equipo.to_dict()), 200

@inventario_bp.route('/<int:id>', methods=['PUT'])
@jwt_required()
def actualizar_equipo(id):
    permitido, response, status = verificar_rol_permitido(['admin', 'tecnico'])
    if not permitido:
        return response, status

    equipo = Inventario.query.get(id)
    if not equipo:
        return jsonify({"error": "No encontrado", "message": "Equipo no encontrado"}), 404

    data = request.get_json()
    errors = inventario_schema.validate(data, partial=True)
    if errors:
        return jsonify({"error": "Validación fallida", "messages": errors}), 400

    # Verificar serie única si está cambiando
    ns = data.get('numero_serie')
    if ns and ns != equipo.numero_serie:
        if Inventario.query.filter_by(numero_serie=ns).first():
            return jsonify({"error": "Conflicto", "message": "El número de serie ya está registrado por otro equipo"}), 409

    for key, value in data.items():
        if key == 'fecha_adquisicion' and value:
            try:
                equipo.fecha_adquisicion = datetime.fromisoformat(value.replace('Z', ''))
            except ValueError:
                pass
        elif key == 'fecha_entrega':
            equipo.fecha_entrega = _parse_fecha_entrega(value)
        elif key != 'id':
            setattr(equipo, key, value)

    try:
        db.session.commit()
        return jsonify({
            "message": "Equipo actualizado con éxito",
            "equipo": equipo.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Error interno", "message": str(e)}), 500

@inventario_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
def eliminar_equipo(id):
    permitido, response, status = verificar_rol_permitido(['admin'])
    if not permitido:
        return response, status

    equipo = Inventario.query.get(id)
    if not equipo:
        return jsonify({"error": "No encontrado", "message": "Equipo no encontrado"}), 404

    try:
        db.session.delete(equipo)
        db.session.commit()
        return jsonify({"message": "Equipo eliminado del inventario con éxito"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Error interno", "message": str(e)}), 500

@inventario_bp.route('/informe-ia', methods=['POST'])
@jwt_required()
def informe_ia_equipos():
    """Informe bajo demanda generado por la IA sobre los equipos más antiguos del inventario."""
    permitido, response, status = verificar_rol_permitido(['admin', 'tecnico'])
    if not permitido:
        return response, status

    hoy = date.today()
    equipos = Inventario.query.filter(Inventario.estado != 'de_baja').all()
    if not equipos:
        return jsonify({"error": "Sin datos", "message": "No hay equipos registrados en el inventario."}), 404

    # Calcular antigüedad en años a partir de la fecha de entrega
    datos = []
    for eq in equipos:
        anios = None
        if eq.fecha_entrega:
            anios = (hoy - eq.fecha_entrega).days / 365.25
        datos.append({
            'nombre': eq.nombre_equipo,
            'tipo': eq.tipo,
            'marca': eq.marca,
            'modelo': eq.modelo,
            'tienda': eq.ubicacion_tienda,
            'fecha_entrega': eq.fecha_entrega.isoformat() if eq.fecha_entrega else None,
            'anios': anios,
            'estado': eq.estado,
        })

    datos.sort(key=lambda d: d['anios'] if d['anios'] is not None else -1, reverse=True)
    # Solo los 20 más antiguos para mantener el prompt manejable
    top = datos[:20]

    informe = generar_informe_equipos(top, solo_antiguos=True)

    if not informe:
        # Fallback: informe plano generado localmente si Ollama no responde
        lineas = [
            f"- {d['nombre']} ({d['tipo']}) · {d['tienda']} · "
            f"{'%.1f años' % d['anios'] if d['anios'] is not None else 'sin fecha'}"
            for d in top if d['anios'] is None or d['anios'] >= 3
        ] or ["- No hay equipos con 3 o más años de uso registrados."]
        informe = (
            "Resumen ejecutivo (generado sin IA, Ollama no disponible):\n\n"
            "Prioridad de renovación (equipos con 3+ años):\n" + "\n".join(lineas)
        )
        return jsonify({"informe": informe, "generado_por_ia": False}), 200

    return jsonify({"informe": informe, "generado_por_ia": True}), 200
