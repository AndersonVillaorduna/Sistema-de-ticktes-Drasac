"""Persistent security state, shared by all WSGI processes."""
from datetime import datetime
from app import db


class Upload(db.Model):
    __tablename__ = 'uploads_metadata'
    nombre = db.Column(db.String(100), primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id', ondelete='SET NULL'), index=True)
    bytes = db.Column(db.BigInteger, nullable=False)
    contexto = db.Column(db.String(20), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)


class UploadQuota(db.Model):
    __tablename__ = 'uploads_quota'
    dia = db.Column(db.String(10), primary_key=True)
    bytes = db.Column(db.BigInteger, nullable=False, default=0)


class LoginAttempt(db.Model):
    __tablename__ = 'login_attempts'
    cuenta = db.Column(db.String(64), primary_key=True)
    intentos = db.Column(db.Integer, nullable=False, default=0)
    hasta = db.Column(db.Float, nullable=False, default=0, index=True)


class RevokedToken(db.Model):
    __tablename__ = 'revoked_tokens'
    jti = db.Column(db.String(64), primary_key=True)
    expires_at = db.Column(db.Float, nullable=False, index=True)


class RequestKey(db.Model):
    __tablename__ = 'request_keys'
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id', ondelete='CASCADE'), primary_key=True)
    clave = db.Column(db.String(128), primary_key=True)
    fingerprint = db.Column(db.String(64), nullable=False)
    ticket_id = db.Column(db.Integer, db.ForeignKey('tickets.id', ondelete='CASCADE'), nullable=False)
