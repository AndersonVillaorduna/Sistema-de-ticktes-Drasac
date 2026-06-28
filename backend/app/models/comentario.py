from app import db
from datetime import datetime

class Comentario(db.Model):
    __tablename__ = 'comentarios_ticket'

    id = db.Column(db.Integer, primary_key=True)
    ticket_id = db.Column(db.Integer, db.ForeignKey('tickets.id', ondelete='CASCADE'), nullable=False, index=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id', ondelete='CASCADE'), nullable=False, index=True)
    mensaje = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relación
    ticket = db.relationship('Ticket', back_populates='comentarios')
    usuario = db.relationship('Usuario', backref='comentarios')

    def to_dict(self):
        return {
            'id': self.id,
            'ticket_id': self.ticket_id,
            'usuario_id': self.usuario_id,
            'usuario_nombre': self.usuario.nombre if self.usuario else None,
            'usuario_rol': self.usuario.rol if self.usuario else None,
            'mensaje': self.mensaje,
            'created_at': self.created_at.isoformat()
        }
