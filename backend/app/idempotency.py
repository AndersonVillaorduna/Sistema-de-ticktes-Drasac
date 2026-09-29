"""Optional request keys preserve a ticket across safe client retries."""
import hashlib
import json
import re
from functools import wraps
from flask import abort, g, jsonify, request
from app import db
from app.locks import shared_lock
from app.security_models import RequestKey
from app.models.ticket import Ticket


def idempotent_ticket(function):
    @wraps(function)
    def wrapped(*args, **kwargs):
        key = request.headers.get('Idempotency-Key')
        if not key:
            return function(*args, **kwargs)
        if not re.fullmatch(r'[A-Za-z0-9_-]{8,128}', key):
            abort(400, description='Clave de solicitud inválida')
        fingerprint = hashlib.sha256(json.dumps(request.get_json(), sort_keys=True, ensure_ascii=True).encode()).hexdigest()
        lockname = 'request-' + hashlib.sha256((str(g.current_user.id) + ':' + key).encode()).hexdigest()
        with shared_lock(lockname):
            db.session.rollback()
            row = db.session.get(RequestKey, (g.current_user.id, key))
            if row:
                if row.fingerprint != fingerprint:
                    abort(409, description='La clave ya fue utilizada con otros datos')
                ticket = db.session.get(Ticket, row.ticket_id)
                if ticket:
                    return jsonify(message='Ticket creado exitosamente', ticket=ticket.to_dict()), 201
            g.request_key = (key, fingerprint)
            return function(*args, **kwargs)
    return wrapped


def serialize_ticket(function):
    @wraps(function)
    def wrapped(id, *args, **kwargs):
        with shared_lock('ticket-' + str(id)):
            # Re-read state after obtaining the cross-process lock.
            db.session.rollback()
            return function(id, *args, **kwargs)
    return wrapped
