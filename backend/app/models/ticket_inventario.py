from app import db

class TicketInventario(db.Model):
    __tablename__ = 'ticket_inventario'

    id = db.Column(db.Integer, primary_key=True)
    ticket_id = db.Column(db.Integer, db.ForeignKey('tickets.id', ondelete='CASCADE'), nullable=False)
    inventario_id = db.Column(db.Integer, db.ForeignKey('inventario.id', ondelete='CASCADE'), nullable=False)
