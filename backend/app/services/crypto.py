"""Cifrado simétrico para datos sensibles del inventario (contraseñas de
equipos). Usa Fernet con una llave derivada de SECRET_KEY: los valores jamás
quedan en texto plano en la base de datos."""
import base64
import hashlib
import os
from cryptography.fernet import Fernet, InvalidToken

_llave = base64.urlsafe_b64encode(
    hashlib.sha256(os.getenv('SECRET_KEY', 'default-dev-key').encode()).digest()
)
_fernet = Fernet(_llave)


def cifrar(valor):
    """Devuelve el texto cifrado (str) o None si el valor está vacío."""
    if not valor:
        return None
    return _fernet.encrypt(str(valor).encode()).decode()


def descifrar(valor):
    """Devuelve el texto plano o None. Si el valor no estaba cifrado
    (datos antiguos), lo devuelve tal cual."""
    if not valor:
        return None
    try:
        return _fernet.decrypt(valor.encode()).decode()
    except (InvalidToken, ValueError):
        return valor
