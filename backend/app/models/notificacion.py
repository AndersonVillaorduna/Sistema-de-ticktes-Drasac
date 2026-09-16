from app import db
from datetime import datetime

class Notificacion(db.Model):
    __tablename__ = 'notificaciones'

    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id', ondelete='CASCADE'), nullable=False, index=True)
    ticket_id = db.Column(db.Integer, db.ForeignKey('tickets.id', ondelete='CASCADE'), nullable=True)
    tipo = db.Column(db.String(50), nullable=False, default='info')  # 'nuevo_ticket', 'respuesta', 'paso'
    mensaje = db.Column(db.String(500), nullable=False)
    leida = db.Column(db.Boolean, default=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    usuario = db.relationship('Usuario', backref='notificaciones')
    ticket = db.relationship('Ticket', backref='notificaciones')

    def to_dict(self):
        return {
            'id': self.id,
            'usuario_id': self.usuario_id,
            'ticket_id': self.ticket_id,
            'tipo': self.tipo,
            'mensaje': self.mensaje,
            'leida': self.leida,
            'created_at': self.created_at.isoformat()
        }
