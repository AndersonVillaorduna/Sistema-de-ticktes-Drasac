from app import db
from datetime import datetime

class TicketLectura(db.Model):
    """Registra cuándo cada usuario vio por última vez un ticket,
    para marcar los tickets con respuestas sin leer."""
    __tablename__ = 'ticket_lecturas'

    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id', ondelete='CASCADE'), primary_key=True)
    ticket_id = db.Column(db.Integer, db.ForeignKey('tickets.id', ondelete='CASCADE'), primary_key=True)
    leido_at = db.Column(db.DateTime, default=datetime.utcnow)
