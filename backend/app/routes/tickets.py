import logging
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.ticket import Ticket
from app.models.usuario import Usuario
from app.models.categoria import Categoria
from app.models.comentario import Comentario
from app.models.base_conocimiento import BaseConocimiento
from app.models.notificacion import Notificacion
from app.models.ticket_lectura import TicketLectura
from app.models.inventario import Inventario
from app.models.tecnico_categoria import TecnicoCategoria
from app.services.ia_service import (
    clasificar_y_resolver_ticket,
    resolver_articulo_para_ticket,
    articulo_coincide_con_texto,
)
from app.services.heuristica import clasificador_heuristico
from app.services.reglas import detectar_intencion
from app import db, limiter
from datetime import datetime

logger = logging.getLogger('drasac.tickets')

tickets_bp = Blueprint('tickets', __name__)

def _notificar(usuario_ids, ticket_id, tipo, mensaje, excluir_id=None):
    """Crea notificaciones para un conjunto de usuarios (sin auto-notificarse)."""
    for uid in {u for u in usuario_ids if u and u != excluir_id}:
        db.session.add(Notificacion(usuario_id=uid, ticket_id=ticket_id, tipo=tipo, mensaje=mensaje))

def _admins_ids():
    return [a.id for a in Usuario.query.filter_by(rol='admin').all()]

def _categorias_del_tecnico(tecnico_id):
    return [tc.categoria_id for tc in TecnicoCategoria.query.filter_by(tecnico_id=tecnico_id).all()]

def _enviar_siguiente_paso(ticket):
    """Envía el siguiente paso del manual como comentario de la IA. Devuelve (ok, mensaje)."""
    articulo = BaseConocimiento.query.get(ticket.articulo_id)
    pasos = articulo.get_pasos() if articulo else []
    paso_actual = ticket.paso_actual or 0
    if not pasos or paso_actual >= len(pasos):
        return False, 'No hay pasos pendientes'

    siguiente = pasos[paso_actual] or {}
    ticket.paso_actual = paso_actual + 1

    usuario_ia = Usuario.query.filter_by(email="ia@drasac.com").first()
    autor_id = usuario_ia.id if usuario_ia else ticket.usuario_id

    db.session.add(Comentario(
        ticket_id=ticket.id,
        usuario_id=autor_id,
        mensaje=f"🧭 [Paso {ticket.paso_actual} de {len(pasos)}]: {siguiente.get('texto', '')}",
        adjunto_url=siguiente.get('imagen_url') or None
    ))
    _notificar(
        {ticket.usuario_id},
        ticket.id,
        'paso',
        f"🧭 Nuevo paso ({ticket.paso_actual}/{len(pasos)}) en tu ticket #{ticket.id}"
    )
    return True, f'Paso {ticket.paso_actual} de {len(pasos)} enviado'

@tickets_bp.route('/ia-preview', methods=['POST'])
@jwt_required()
@limiter.limit("10 per minute")  # cada llamada dispara la IA local: evitar abuso
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
        logger.exception("Error en clasificación IA (preview)")

    if not ia_res:
        ia_res = clasificador_heuristico(titulo, descripcion)

    cat_nombre = ia_res.get('categoria', 'Software')
    confianza = ia_res.get('confianza', 0.5)

    # Resolución unificada por artículos (misma lógica que al crear el ticket)
    articulo_aplicado, es_conocido = resolver_articulo_para_ticket(
        titulo, descripcion, texto_completo,
        categoria_id=Categoria.query.filter_by(nombre=cat_nombre).first().id if Categoria.query.filter_by(nombre=cat_nombre).first() else None,
        articulo_id_ia=ia_res.get('articulo_id'),
        es_caso_conocido_ia=ia_res.get('es_caso_conocido', False),
        confianza=confianza,
    )

    if articulo_aplicado:
        respuesta = articulo_aplicado.solucion
    elif usando_ia:
        respuesta = f"La IA detectó que el problema pertenece a la categoría **{cat_nombre}** con un {int(confianza*100)}% de confianza. Se creará un ticket para que un técnico especializado te atienda."
    else:
        respuesta = f"Detectamos que tu problema está relacionado con **{cat_nombre}**. Se creará un ticket para que un técnico revise tu caso lo antes posible."

    return jsonify({"sugerencia": respuesta, "respuesta_ia": respuesta}), 200

@tickets_bp.route('', methods=['POST'])
@jwt_required()
@limiter.limit("20 per minute")
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
    # validamos que realmente coincida con el ticket. La resolución unificada
    # también busca por palabras clave (categoría y luego global): la solución
    # registrada en un artículo SIEMPRE tiene prioridad sobre una respuesta
    # inventada por la IA.
    texto_ticket = (titulo + " " + descripcion).lower()

    articulo_aplicado, es_caso_conocido = resolver_articulo_para_ticket(
        titulo, descripcion, texto_ticket,
        categoria_id=categoria_id,
        articulo_id_ia=ia_res.get('articulo_id'),
        es_caso_conocido_ia=es_caso_conocido,
        confianza=confianza,
    )
    if articulo_aplicado:
        respuesta_sugerida = articulo_aplicado.solucion
        # Alinear la categoría con la del artículo si el usuario no eligió una
        if not user_categoria_id and articulo_aplicado.categoria_id:
            categoria_id = articulo_aplicado.categoria_id
    else:
        respuesta_sugerida = None

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
    # Si la solución viene de un artículo del centro de conocimiento
    # (por IA o por búsqueda por palabras clave), se pre-resuelve por la IA.
    # Sin artículo oficial, solo con confianza >= 85% de la IA.
    estado_inicial = 'abierto'
    if usando_ia and es_caso_conocido and respuesta_sugerida and (articulo_aplicado or confianza >= 0.85):
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

            # Si el artículo tiene flujo de pasos, el primer mensaje es el paso 1
            pasos = articulo_aplicado.get_pasos() if articulo_aplicado else []
            if pasos:
                primer = pasos[0] or {}
                mensaje_ia = f"🤖 [Paso 1 de {len(pasos)}]: {primer.get('texto') or respuesta_sugerida}"
                adjunto_ia = primer.get('imagen_url') or articulo_aplicado.imagen_url
                nuevo_ticket.articulo_id = articulo_aplicado.id
                nuevo_ticket.paso_actual = 1
            else:
                mensaje_ia = f"🤖 [Respuesta Automática de IA]: {respuesta_sugerida}"
                adjunto_ia = articulo_aplicado.imagen_url if articulo_aplicado else None
                if articulo_aplicado:
                    nuevo_ticket.articulo_id = articulo_aplicado.id

            comentario_ia = Comentario(
                ticket_id=nuevo_ticket.id,
                usuario_id=ia_uid,
                mensaje=mensaje_ia,
                adjunto_url=adjunto_ia
            )
            db.session.add(comentario_ia)
            db.session.commit()

        # Notificar el nuevo ticket al técnico asignado y a los administradores
        tienda = usuario.tienda_area or usuario.nombre
        _notificar(
            {nuevo_ticket.tecnico_id} | set(_admins_ids()),
            nuevo_ticket.id,
            'nuevo_ticket',
            f"🆕 Nuevo ticket #{nuevo_ticket.id} de {tienda}: {titulo}",
            excluir_id=current_user_id
        )
        db.session.commit()

        return jsonify({
            "message": "Ticket creado exitosamente",
            "ticket": nuevo_ticket.to_dict()
        }), 201
    except Exception:
        db.session.rollback()
        logger.exception("Error interno")
        return jsonify({"error": "Error interno", "message": "Ocurrió un error interno. Intenta de nuevo."}), 500

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

    # Marcar tickets con respuestas que el usuario aún no ha visto ("punto azul")
    ids = [t.id for t in tickets]
    ultimo_comentario = {}
    if ids:
        for c in Comentario.query.filter(Comentario.ticket_id.in_(ids))\
                .order_by(Comentario.created_at.asc()).all():
            ultimo_comentario[c.ticket_id] = c
    lecturas = {l.ticket_id: l.leido_at for l in TicketLectura.query.filter(
        TicketLectura.usuario_id == current_user_id, TicketLectura.ticket_id.in_(ids)).all()}

    resultado = []
    for t in tickets:
        d = t.to_dict()
        ultimo = ultimo_comentario.get(t.id)
        if ultimo and ultimo.usuario_id != current_user_id:
            referencia = lecturas.get(t.id) or t.created_at
            d['tiene_nuevo'] = ultimo.created_at > referencia
        resultado.append(d)

    return jsonify(resultado), 200

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

    # Registrar la lectura del ticket por este usuario (para los puntos de "sin leer")
    lectura = TicketLectura.query.filter_by(usuario_id=current_user_id, ticket_id=ticket.id).first()
    if lectura:
        lectura.leido_at = datetime.utcnow()
    else:
        db.session.add(TicketLectura(usuario_id=current_user_id, ticket_id=ticket.id))
    db.session.commit()

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

    # Un técnico solo puede modificar tickets de las categorías que atiende
    # (o que se le asignaron directamente): evita IDOR entre técnicos
    if usuario.rol == 'tecnico':
        cats = _categorias_del_tecnico(current_user_id)
        if ticket.tecnico_id != current_user_id and ticket.categoria_id not in cats:
            return jsonify({"error": "No autorizado", "message": "Este ticket no pertenece a tus categorías asignadas"}), 403

    data = request.get_json()
    
    nuevo_estado = data.get('estado')
    nueva_prioridad = data.get('prioridad')
    nuevo_tecnico_id = data.get('tecnico_id')
    nueva_categoria_id = data.get('categoria_id')

    if nuevo_estado:
        ticket.estado = nuevo_estado
        if nuevo_estado in ['resuelto', 'cerrado']:
            ticket.resolved_at = datetime.utcnow()
            # Cerrado desde el panel por un humano (técnico/admin)
            ticket.resuelto_por = 'humano'
        else:
            # Reabierto o devuelto a flujo: se limpia el autor de la resolución
            ticket.resuelto_por = None
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
    except Exception:
        db.session.rollback()
        logger.exception("Error interno")
        return jsonify({"error": "Error interno", "message": "Ocurrió un error interno. Intenta de nuevo."}), 500

@tickets_bp.route('/<int:id>/comentarios', methods=['POST'])
@jwt_required()
@limiter.limit("30 per minute")
def agregar_comentario(id):
    current_user_id = int(get_jwt_identity())
    usuario = Usuario.query.get(current_user_id)
    ticket = Ticket.query.get(id)
    
    if not ticket:
        return jsonify({"error": "No encontrado", "message": "Ticket no encontrado"}), 404

    # Validar permisos
    if usuario.rol == 'usuario' and ticket.usuario_id != current_user_id:
        return jsonify({"error": "No autorizado", "message": "No tiene permisos para comentar en este ticket"}), 403

    # Un ticket cerrado/resuelto conserva la conversación como registro,
    # pero ya no admite mensajes nuevos
    if ticket.estado in ('cerrado', 'resuelto'):
        return jsonify({
            "error": "Ticket cerrado",
            "message": "Este ticket ya está cerrado: la conversación quedó guardada como registro y no admite más mensajes. Si el problema reaparece, crea un ticket nuevo."
        }), 400

    data = request.get_json()
    mensaje = (data.get('mensaje') or '').strip()
    adjunto_url = (data.get('adjunto_url') or '').strip() or None

    if not mensaje and not adjunto_url:
        return jsonify({"error": "Validación fallida", "message": "El mensaje no puede estar vacío"}), 400

    # El adjunto debe ser un archivo subido previamente al servidor
    if adjunto_url and not adjunto_url.startswith('/api/uploads/'):
        return jsonify({"error": "Validación fallida", "message": "Adjunto no válido"}), 400

    nuevo_comentario = Comentario(
        ticket_id=ticket.id,
        usuario_id=current_user_id,
        mensaje=mensaje or '(adjunto)',
        adjunto_url=adjunto_url
    )

    try:
        db.session.add(nuevo_comentario)

        # Si se agrega un comentario humano en un ticket resuelto por IA que estaba pendiente,
        # significa que sigue habiendo interacción, así que cambiamos el estado a 'en proceso'
        if ticket.estado == 'resuelto por ia - pendiente':
            ticket.estado = 'en proceso'

        # Notificar la respuesta a la otra parte
        if current_user_id == ticket.usuario_id:
            # La tienda respondió → avisar al técnico asignado y a los admins
            tienda = usuario.tienda_area or usuario.nombre
            _notificar(
                ({ticket.tecnico_id} if ticket.tecnico_id else set()) | set(_admins_ids()),
                ticket.id,
                'respuesta',
                f"💬 {tienda} respondió al ticket #{ticket.id}",
                excluir_id=current_user_id
            )

            # ── Flujo guiado automático con Sí/No ──
            # Estados de paso_actual: 0 = no iniciado · 1..N = pasos enviados ·
            # N+10 = pregunta final enviada, esperando el Sí/No de la tienda
            articulo_flujo = BaseConocimiento.query.get(ticket.articulo_id) if ticket.articulo_id else None
            pasos_flujo = articulo_flujo.get_pasos() if articulo_flujo else []
            if pasos_flujo and (ticket.paso_actual or 0) > 0:
                intencion = detectar_intencion(mensaje)
                n_pasos = len(pasos_flujo)
                pregunta_final_pendiente = (ticket.paso_actual or 0) > n_pasos
                usuario_ia = Usuario.query.filter_by(email="ia@drasac.com").first()
                autor_ia = usuario_ia.id if usuario_ia else current_user_id
                tienda_n = usuario.tienda_area or usuario.nombre

                if intencion == 'confirmacion':
                    if pregunta_final_pendiente:
                        # La tienda confirmó al final: CERRAR el ticket automáticamente
                        ticket.estado = 'cerrado'
                        ticket.resolved_at = datetime.utcnow()
                        ticket.resuelto_por = 'ia'  # cierre automático del flujo guiado
                        db.session.add(Comentario(
                            ticket_id=ticket.id,
                            usuario_id=autor_ia,
                            mensaje="🎉 ¡Excelente! Me alegra que el problema quedara resuelto. El ticket ha sido cerrado automáticamente. Si vuelve a ocurrir, no dudes en reportarlo."
                        ))
                        _notificar(
                            ({ticket.tecnico_id} if ticket.tecnico_id else set()) | set(_admins_ids()),
                            ticket.id,
                            'respuesta',
                            f"✅ {tienda_n} confirmó que su problema quedó resuelto. Ticket #{ticket.id} cerrado automáticamente.",
                            excluir_id=current_user_id
                        )
                    elif (ticket.paso_actual or 0) < n_pasos:
                        # "Ya lo hice" en un paso intermedio: enviar el siguiente paso
                        ok, _msg = _enviar_siguiente_paso(ticket)
                        if ok:
                            _notificar(
                                ({ticket.tecnico_id} if ticket.tecnico_id else set()) | set(_admins_ids()),
                                ticket.id,
                                'respuesta',
                                f"🧭 {tienda_n} completó el paso {ticket.paso_actual - 1} del ticket #{ticket.id}",
                                excluir_id=current_user_id
                            )
                    else:
                        # Completó el ÚLTIMO paso: la IA hace la pregunta de verificación final
                        ticket.paso_actual = n_pasos + 10
                        db.session.add(Comentario(
                            ticket_id=ticket.id,
                            usuario_id=autor_ia,
                            mensaje=f"❓ [Pregunta Final]: ¿Terminaste todos los pasos? ¿Ya cuentas con el servicio funcionando? Responde con las opciones: si todo está bien el ticket se cerrará, y si no, un técnico te ayudará."
                        ))
                elif intencion == 'negacion':
                    # El problema continúa: escalar a un técnico (en cualquier fase)
                    if not pregunta_final_pendiente and (ticket.paso_actual or 0) < n_pasos:
                        # "Todavía no" en un paso intermedio: NO avanzar; esperar
                        db.session.add(Comentario(
                            ticket_id=ticket.id,
                            usuario_id=autor_ia,
                            mensaje="🤖 Está bien, tómate tu tiempo. Cuando termines el paso, respóndeme con las opciones de abajo. Si prefieres, también puedes pedir que un técnico te atienda directamente."
                        ))
                    else:
                        ticket.estado = 'abierto'
                        db.session.add(Comentario(
                            ticket_id=ticket.id,
                            usuario_id=autor_ia,
                            mensaje="🤖 Entendido, el problema continúa. He escalado tu ticket para revisión directa de un técnico. Te atenderemos a la brevedad."
                        ))
                        _notificar(
                            ({ticket.tecnico_id} if ticket.tecnico_id else set()) | set(_admins_ids()),
                            ticket.id,
                            'respuesta',
                            f"⚠️ {tienda_n} reporta que el problema continúa en el ticket #{ticket.id}",
                            excluir_id=current_user_id
                        )
        elif usuario.rol in ('tecnico', 'admin'):
            _notificar(
                {ticket.usuario_id},
                ticket.id,
                'respuesta',
                f"💬 {usuario.nombre} respondió a tu ticket #{ticket.id}",
                excluir_id=current_user_id
            )

        db.session.commit()
        return jsonify({
            "message": "Comentario agregado",
            "comentario": nuevo_comentario.to_dict()
        }), 201
    except Exception:
        db.session.rollback()
        logger.exception("Error interno")
        return jsonify({"error": "Error interno", "message": "Ocurrió un error interno. Intenta de nuevo."}), 500

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
        ticket.resuelto_por = 'ia'  # el usuario confirmó la solución de la IA
        mensaje_sistema = "El usuario ha confirmado que la solución propuesta resolvió el problema. Ticket cerrado."
    else:
        ticket.estado = 'abierto'
        ticket.resuelto_por = None
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
    except Exception:
        db.session.rollback()
        logger.exception("Error interno")
        return jsonify({"error": "Error interno", "message": "Ocurrió un error interno. Intenta de nuevo."}), 500

@tickets_bp.route('/<int:id>/siguiente-paso', methods=['POST'])
@jwt_required()
def enviar_siguiente_paso(id):
    """Envía el siguiente paso del manual/artículo al usuario en el chat del ticket."""
    current_user_id = int(get_jwt_identity())
    usuario = Usuario.query.get(current_user_id)
    ticket = Ticket.query.get(id)

    if not ticket:
        return jsonify({"error": "No encontrado", "message": "Ticket no encontrado"}), 404
    if usuario.rol == 'usuario':
        return jsonify({"error": "No autorizado", "message": "Solo técnicos o administradores pueden enviar pasos"}), 403
    if not ticket.articulo_id:
        return jsonify({"error": "Validación fallida", "message": "Este ticket no está ligado a un artículo con pasos"}), 400

    ok, mensaje = _enviar_siguiente_paso(ticket)
    if not ok:
        return jsonify({"error": "Validación fallida", "message": mensaje}), 400

    try:
        db.session.commit()
        return jsonify({"message": mensaje, "ticket": ticket.to_dict()}), 200
    except Exception:
        db.session.rollback()
        logger.exception("Error interno")
        return jsonify({"error": "Error interno", "message": "Ocurrió un error interno. Intenta de nuevo."}), 500

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
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Error de servidor", "message": "Ocurrió un error interno. Intenta de nuevo."}), 500
