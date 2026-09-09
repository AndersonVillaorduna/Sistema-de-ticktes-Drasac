from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.ticket import Ticket
from app.models.usuario import Usuario
from app.models.categoria import Categoria
from app.models.comentario import Comentario
from app.models.base_conocimiento import BaseConocimiento
from app.models.inventario import Inventario
from app.models.tecnico_categoria import TecnicoCategoria
from app.services.ia_service import (
    clasificar_y_resolver_ticket,
    buscar_solucion_en_base_de_conocimiento,
    articulo_coincide_con_texto,
)
from app.services.heuristica import clasificador_heuristico
from app import db
from datetime import datetime

tickets_bp = Blueprint('tickets', __name__)

@tickets_bp.route('/ia-preview', methods=['POST'])
@jwt_required()
def ia_preview():
    data = request.get_json()
    titulo = data.get('titulo', '')
    descripcion = data.get('descripcion', '')
    texto_completo = (titulo + ' ' + descripcion).lower()

    if not titulo and not descripcion:
        return jsonify({"error": "Datos incompletos", "message": "Se requiere al menos título o descripción"}), 400

    ia_res = None
    usando_ia = False
    try:
        ia_res = clasificar_y_resolver_ticket(titulo, descripcion)
        if ia_res:
            usando_ia = True
    except Exception:
        pass

    if not ia_res:
        ia_res = clasificador_heuristico(titulo, descripcion)

    cat_nombre = ia_res.get('categoria', 'Software')
    confianza = ia_res.get('confianza', 0.5)
    respuesta = None

    # 1. Si la IA eligió un artículo del centro de conocimiento, validarlo con
    # palabras clave (los modelos pequeños a veces eligen un artículo 'parecido').
    # Cualquier respuesta_sugerida sin artículo validado se descarta.
    articulo_id = ia_res.get('articulo_id')
    if articulo_id:
        articulo = BaseConocimiento.query.get(articulo_id)
        if articulo and articulo_coincide_con_texto(articulo, texto_completo):
            respuesta = articulo.solucion

    # 2. Búsqueda por palabras clave en la categoría detectada
    if not respuesta:
        cat_obj = Categoria.query.filter_by(nombre=cat_nombre).first()
        respuesta = buscar_solucion_en_base_de_conocimiento(
            cat_obj.id if cat_obj else None, titulo, descripcion
        )

    # 3. Última oportunidad: búsqueda global en todos los artículos
    if not respuesta:
        respuesta = buscar_solucion_en_base_de_conocimiento(None, titulo, descripcion)

    if not respuesta:
        if usando_ia:
            respuesta = f"La IA detectó que el problema pertenece a la categoría **{cat_nombre}** con un {int(confianza*100)}% de confianza. Se creará un ticket para que un técnico especializado te atienda."
        else:
            respuesta = f"Detectamos que tu problema está relacionado con **{cat_nombre}**. Se creará un ticket para que un técnico revise tu caso lo antes posible."

    return jsonify({"sugerencia": respuesta, "respuesta_ia": respuesta}), 200

@tickets_bp.route('', methods=['POST'])
@jwt_required()
def crear_ticket():
    current_user_id = int(get_jwt_identity())
    usuario = Usuario.query.get(current_user_id)
    if not usuario:
        return jsonify({"error": "No encontrado", "message": "Usuario no encontrado"}), 404

    data = request.get_json()
    titulo = data.get('titulo')
    descripcion = data.get('descripcion')
    equipos_ids = data.get('equipos_ids', [])
    user_categoria_id = data.get('categoria_id')
    user_prioridad = data.get('prioridad')

    if not titulo or not descripcion:
        return jsonify({"error": "Validación fallida", "message": "El título y la descripción son obligatorios"}), 400

    # 1. Ejecutar clasificación (Ollama con fallback Heurístico)
    ia_res = clasificar_y_resolver_ticket(titulo, descripcion)
    usando_ia = True

    if not ia_res:
        # Fallback a heurística
        ia_res = clasificador_heuristico(titulo, descripcion)
        usando_ia = False

    cat_nombre = ia_res.get('categoria')
    confianza = ia_res.get('confianza', 0.5)
    es_caso_conocido = ia_res.get('es_caso_conocido', False)
    respuesta_sugerida = ia_res.get('respuesta_sugerida')

    # 2. Usar categoría del usuario si la proporcionó, si no usar la de la IA
    if user_categoria_id:
        categoria_id = int(user_categoria_id)
    else:
        categoria_obj = Categoria.query.filter_by(nombre=cat_nombre).first()
        categoria_id = categoria_obj.id if categoria_obj else None

    # Usar prioridad elegida por el usuario; si no, por defecto 'media'
    # (la IA no clasifica prioridad)
    prioridad = user_prioridad if user_prioridad in ['baja', 'media', 'alta'] else 'media'

    # 3. Si la IA encontró un artículo del centro de conocimiento que coincide,
    # validamos que realmente coincida con el ticket (doble chequeo por palabras
    # clave, los modelos pequeños a veces eligen un artículo 'parecido' por error)
    articulo_id = ia_res.get('articulo_id')
    texto_ticket = (titulo + " " + descripcion).lower()

    articulo = BaseConocimiento.query.get(articulo_id) if articulo_id else None
    if articulo and articulo_coincide_con_texto(articulo, texto_ticket):
        respuesta_sugerida = articulo.solucion
        es_caso_conocido = True
        # Alinear la categoría con la del artículo si el usuario no eligió una
        if not user_categoria_id and articulo.categoria_id:
            categoria_id = articulo.categoria_id
    else:
        # La IA se equivocó de artículo (o el match es débil): descartar la
        # solución sugerida para que el ticket vaya a un técnico
        articulo = None
        articulo_id = None
        if usando_ia and respuesta_sugerida and es_caso_conocido:
            respuesta_sugerida = None
            es_caso_conocido = False

    # Si no hubo artículo válido, probamos búsqueda local por palabras clave
    if not articulo_id and categoria_id and (es_caso_conocido or confianza > 0.8) and not respuesta_sugerida:
        solucion_local = buscar_solucion_en_base_de_conocimiento(categoria_id, titulo, descripcion)
        if solucion_local:
            respuesta_sugerida = solucion_local
            es_caso_conocido = True

    # 4. Asignación automática de técnico según la categoría
    tecnico_id = None
    if categoria_id:
        # Buscar técnicos asignados a esta categoría en la tabla pivote
        tecnico_asoc = TecnicoCategoria.query.filter_by(categoria_id=categoria_id).first()
        if tecnico_asoc:
            tecnico_id = tecnico_asoc.tecnico_id
        else:
            # Si no hay técnico para esa categoría, buscar cualquier usuario con rol 'tecnico'
            primer_tecnico = Usuario.query.filter_by(rol='tecnico').first()
            if primer_tecnico:
                tecnico_id = primer_tecnico.id

    # 5. Determinar estado inicial
    # Si la IA encontró un artículo del centro de conocimiento que resuelve el caso,
    # se pre-resuelve por la IA (no satura a los técnicos). Si fue solo por confianza
    # alta sin artículo, exigimos confianza >= 85%.
    estado_inicial = 'abierto'
    if usando_ia and es_caso_conocido and respuesta_sugerida and (articulo_id or confianza >= 0.85):
        estado_inicial = 'resuelto por ia - pendiente'

    # Crear Ticket
    nuevo_ticket = Ticket(
        usuario_id=current_user_id,
        categoria_id=categoria_id,
        tecnico_id=tecnico_id,
        titulo=titulo,
        descripcion=descripcion,
        estado=estado_inicial,
        prioridad=prioridad,
        clasificado_por_ia=usando_ia,
        respuesta_ia=respuesta_sugerida
    )

    # 6. Asociar equipos de inventario si se proporcionaron
    if equipos_ids:
        equipos = Inventario.query.filter(Inventario.id.in_(equipos_ids)).all()
        nuevo_ticket.equipos.extend(equipos)

    try:
        db.session.add(nuevo_ticket)
        db.session.commit()
        
        # Si la IA sugirió respuesta, agregarla como primer comentario del sistema
        if respuesta_sugerida and estado_inicial == 'resuelto por ia - pendiente':
            # Buscamos o creamos el usuario IA / Soporte
            usuario_ia = Usuario.query.filter_by(email="ia@drasac.com").first()
            ia_uid = usuario_ia.id if usuario_ia else current_user_id
            
            comentario_ia = Comentario(
                ticket_id=nuevo_ticket.id,
                usuario_id=ia_uid,
                mensaje=f"🤖 [Respuesta Automática de IA]: {respuesta_sugerida}"
            )
            db.session.add(comentario_ia)
            db.session.commit()

        return jsonify({
            "message": "Ticket creado exitosamente",
            "ticket": nuevo_ticket.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Error interno", "message": str(e)}), 500

@tickets_bp.route('', methods=['GET'])
@jwt_required()
def listar_tickets():
    current_user_id = int(get_jwt_identity())
    usuario = Usuario.query.get(current_user_id)
    if not usuario:
        return jsonify({"error": "No encontrado", "message": "Usuario no encontrado"}), 404

    # Obtener filtros
    estado = request.args.get('estado', '').strip()
    categoria_id = request.args.get('categoria_id', '').strip()
    prioridad = request.args.get('prioridad', '').strip()
    tecnico_id = request.args.get('tecnico_id', '').strip()

    query = Ticket.query

    # Restringir según rol
    if usuario.rol == 'usuario':
        query = query.filter(Ticket.usuario_id == current_user_id)
    elif usuario.rol == 'tecnico':
        # Los técnicos solo ven los tickets de las categorías que atienden
        # y los que se les asignaron directamente
        from sqlalchemy import or_
        categorias_del_tecnico = [
            tc.categoria_id for tc in TecnicoCategoria.query.filter_by(tecnico_id=current_user_id).all()
        ]
        query = query.filter(or_(
            Ticket.tecnico_id == current_user_id,
            Ticket.categoria_id.in_(categorias_del_tecnico)
        ))

    # Aplicar filtros
    if estado:
        query = query.filter(Ticket.estado == estado)
    if categoria_id:
        query = query.filter(Ticket.categoria_id == int(categoria_id))
    if prioridad:
        query = query.filter(Ticket.prioridad == prioridad)
    if tecnico_id:
        query = query.filter(Ticket.tecnico_id == int(tecnico_id))

    # Ordenar por fecha de creación desc
    tickets = query.order_by(Ticket.created_at.desc()).all()
    return jsonify([t.to_dict() for t in tickets]), 200

@tickets_bp.route('/<int:id>', methods=['GET'])
@jwt_required()
def obtener_ticket(id):
    current_user_id = int(get_jwt_identity())
    usuario = Usuario.query.get(current_user_id)
    ticket = Ticket.query.get(id)
    
    if not ticket:
        return jsonify({"error": "No encontrado", "message": "Ticket no encontrado"}), 404

    # Validar permisos
    if usuario.rol == 'usuario' and ticket.usuario_id != current_user_id:
        return jsonify({"error": "No autorizado", "message": "No tiene permisos para ver este ticket"}), 403
    if usuario.rol == 'tecnico':
        categorias_del_tecnico = [
            tc.categoria_id for tc in TecnicoCategoria.query.filter_by(tecnico_id=current_user_id).all()
        ]
        if ticket.tecnico_id != current_user_id and ticket.categoria_id not in categorias_del_tecnico:
            return jsonify({"error": "No autorizado", "message": "Este ticket no pertenece a tus categorías asignadas"}), 403

    # Obtener comentarios asociados
    comentarios = Comentario.query.filter_by(ticket_id=ticket.id).order_by(Comentario.created_at.asc()).all()
    
    ticket_data = ticket.to_dict()
    ticket_data['comentarios'] = [c.to_dict() for c in comentarios]

    return jsonify(ticket_data), 200

@tickets_bp.route('/<int:id>', methods=['PATCH'])
@jwt_required()
def actualizar_ticket(id):
    current_user_id = int(get_jwt_identity())
    usuario = Usuario.query.get(current_user_id)
    ticket = Ticket.query.get(id)
    
    if not ticket:
        return jsonify({"error": "No encontrado", "message": "Ticket no encontrado"}), 404

    # Solo técnicos y admins pueden actualizar estado, prioridad o técnico asignado
    if usuario.rol == 'usuario':
        return jsonify({"error": "No autorizado", "message": "Solo técnicos o administradores pueden modificar los tickets"}), 403

    data = request.get_json()
    
    nuevo_estado = data.get('estado')
    nueva_prioridad = data.get('prioridad')
    nuevo_tecnico_id = data.get('tecnico_id')
    nueva_categoria_id = data.get('categoria_id')

    if nuevo_estado:
        ticket.estado = nuevo_estado
        if nuevo_estado in ['resuelto', 'cerrado']:
            ticket.resolved_at = datetime.utcnow()
    if nueva_prioridad:
        ticket.prioridad = nueva_prioridad
    if nuevo_tecnico_id:
        ticket.tecnico_id = int(nuevo_tecnico_id)
    if nueva_categoria_id:
        ticket.categoria_id = int(nueva_categoria_id)

    try:
        db.session.commit()
        return jsonify({
            "message": "Ticket actualizado con éxito",
            "ticket": ticket.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Error interno", "message": str(e)}), 500

@tickets_bp.route('/<int:id>/comentarios', methods=['POST'])
@jwt_required()
def agregar_comentario(id):
    current_user_id = int(get_jwt_identity())
    usuario = Usuario.query.get(current_user_id)
    ticket = Ticket.query.get(id)
    
    if not ticket:
        return jsonify({"error": "No encontrado", "message": "Ticket no encontrado"}), 404

    # Validar permisos
    if usuario.rol == 'usuario' and ticket.usuario_id != current_user_id:
        return jsonify({"error": "No autorizado", "message": "No tiene permisos para comentar en este ticket"}), 403

    data = request.get_json()
    mensaje = data.get('mensaje')

    if not mensaje:
        return jsonify({"error": "Validación fallida", "message": "El mensaje no puede estar vacío"}), 400

    nuevo_comentario = Comentario(
        ticket_id=ticket.id,
        usuario_id=current_user_id,
        mensaje=mensaje
    )

    try:
        db.session.add(nuevo_comentario)
        
        # Si se agrega un comentario humano en un ticket resuelto por IA que estaba pendiente,
        # significa que sigue habiendo interacción, así que cambiamos el estado a 'en proceso'
        if ticket.estado == 'resuelto por ia - pendiente':
            ticket.estado = 'en proceso'

        db.session.commit()
        return jsonify({
            "message": "Comentario agregado",
            "comentario": nuevo_comentario.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Error interno", "message": str(e)}), 500

@tickets_bp.route('/<int:id>/confirmar', methods=['POST'])
@jwt_required()
def confirmar_resolucion(id):
    current_user_id = int(get_jwt_identity())
    usuario = Usuario.query.get(current_user_id)
    ticket = Ticket.query.get(id)
    
    if not ticket:
        return jsonify({"error": "No encontrado", "message": "Ticket no encontrado"}), 404

    # Solo el creador del ticket puede confirmar
    if ticket.usuario_id != current_user_id and usuario.rol != 'admin':
        return jsonify({"error": "No autorizado", "message": "Solo el usuario que reportó el ticket puede confirmar la resolución"}), 403

    data = request.get_json()
    confirmado = data.get('confirmado', True)  # True para resuelto, False para escalar

    if confirmado:
        ticket.estado = 'cerrado'
        ticket.resolved_at = datetime.utcnow()
        mensaje_sistema = "El usuario ha confirmado que la solución propuesta resolvió el problema. Ticket cerrado."
    else:
        ticket.estado = 'abierto'
        # Asignarle al técnico si aún no tiene o reasignarlo
        mensaje_sistema = "El usuario rechazó la solución de la IA. El ticket ha sido reabierto y escalado para soporte técnico humano."

    # Registrar mensaje en comentarios
    usuario_sistema = Usuario.query.filter_by(email="ia@drasac.com").first()
    sys_uid = usuario_sistema.id if usuario_sistema else current_user_id

    comentario_sistema = Comentario(
        ticket_id=ticket.id,
        usuario_id=sys_uid,
        mensaje=f"📢 [Aviso del Sistema]: {mensaje_sistema}"
    )

    try:
        db.session.add(comentario_sistema)
        db.session.commit()
        return jsonify({
            "message": "Respuesta registrada correctamente",
            "ticket": ticket.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Error interno", "message": str(e)}), 500

@tickets_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
def eliminar_ticket(id):
    current_user_id = int(get_jwt_identity())
    usuario = Usuario.query.get(current_user_id)
    
    if not usuario or usuario.rol != 'admin':
        return jsonify({"error": "No autorizado", "message": "Solo administradores pueden eliminar tickets."}), 403

    ticket = Ticket.query.get_or_404(id)
    try:
        db.session.delete(ticket)
        db.session.commit()
        return jsonify({"message": "Ticket eliminado correctamente."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Error de servidor", "message": str(e)}), 500
