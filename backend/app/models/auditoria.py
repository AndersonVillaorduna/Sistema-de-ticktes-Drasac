from app import db
from datetime import datetime

class Auditoria(db.Model):
    """Registro de acciones administrativas: quién hizo qué y cuándo.
    Inmutable: solo se inserta, nunca se edita ni borra."""
    __tablename__ = 'auditoria'

    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id', ondelete='SET NULL'), nullable=True)
    usuario_nombre = db.Column(db.String(100), nullable=False)  # snapshot: sobrevive si borran al usuario
    usuario_rol = db.Column(db.String(20), nullable=False)
    accion = db.Column(db.String(60), nullable=False)   # ej: 'ticket_eliminado'
    detalle = db.Column(db.String(500), nullable=True)
    ticket_id = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    @classmethod
    def registrar(cls, usuario, accion, detalle='', ticket_id=None):
        """Helper para dejar registro desde cualquier ruta."""
        if not usuario:
            return
        db.session.add(cls(
            usuario_id=usuario.id,
            usuario_nombre=usuario.nombre,
            usuario_rol=usuario.rol,
            accion=accion,
            detalle=(detalle or '')[:500],
            ticket_id=ticket_id
        ))

    def to_dict(self):
        return {
            'id': self.id,
            'usuario_id': self.usuario_id,
            'usuario_nombre': self.usuario_nombre,
            'usuario_rol': self.usuario_rol,
            'accion': self.accion,
            'detalle': self.detalle,
            'ticket_id': self.ticket_id,
            'created_at': self.created_at.isoformat()
        }
