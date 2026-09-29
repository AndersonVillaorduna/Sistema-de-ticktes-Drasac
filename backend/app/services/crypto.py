"""Versioned inventory encryption, retaining legacy keys during rotation."""
import base64
import hashlib
import logging
import os
from cryptography.fernet import Fernet, MultiFernet, InvalidToken
from flask import current_app, has_app_context


def _cipher():
    keys = current_app.config.get('INVENTORY_ENCRYPTION_KEYS') if has_app_context() else os.getenv('INVENTORY_ENCRYPTION_KEYS')
    if keys:
        return MultiFernet([Fernet(k.strip().encode()) for k in keys.split(',') if k.strip()])
    secret = current_app.config['SECRET_KEY'] if has_app_context() else os.getenv('SECRET_KEY', 'default-dev-key')
    legacy = base64.urlsafe_b64encode(hashlib.sha256(secret.encode()).digest())
    return MultiFernet([Fernet(legacy)])


def cifrar(valor):
    return 'v1:' + _cipher().encrypt(str(valor).encode()).decode() if valor else None


def descifrar(valor):
    if not valor:
        return None
    token = valor[3:] if valor.startswith('v1:') else valor
    try:
        return _cipher().decrypt(token.encode()).decode()
    except (InvalidToken, ValueError, UnicodeError):
        logging.getLogger('drasac.crypto').error('No se pudo descifrar una credencial de inventario')
        return None


def migrar_credenciales():
    """Explicit migration of old plaintext; invalid ciphertext is never re-encrypted."""
    from app import db
    from app.models.inventario import Inventario
    for equipo in Inventario.query.filter(Inventario.password.isnot(None)).yield_per(100):
        stored = equipo.password
        if stored.startswith(('v1:', 'gAAAA')):
            clear = descifrar(stored)
            if clear is None:
                raise RuntimeError('Hay credenciales que no se pueden descifrar. Conserva la llave anterior.')
        else:
            clear = stored
        equipo.password = cifrar(clear)
    db.session.commit()
