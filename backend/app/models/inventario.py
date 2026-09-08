from app import db
from datetime import datetime

class Inventario(db.Model):
    __tablename__ = 'inventario'

    id = db.Column(db.Integer, primary_key=True)
    nombre_equipo = db.Column(db.String(100), nullable=False)
    tipo = db.Column(db.String(50), nullable=False)  # 'PC', 'Laptop', 'Impresora', 'Modem', etc.
    marca = db.Column(db.String(50), nullable=True)
    modelo = db.Column(db.String(50), nullable=True)
    numero_serie = db.Column(db.String(100), unique=True, nullable=False, index=True)
    ubicacion_tienda = db.Column(db.String(100), nullable=False)  # Tienda/Área
    estado = db.Column(db.String(50), nullable=False, default='activo')  # 'activo', 'mantenimiento', 'de_baja'
    anydesk_id = db.Column(db.String(50), nullable=True)
    asignado_a = db.Column(db.String(120), nullable=True)  # Nombre o correo del empleado que lo usa
    fecha_adquisicion = db.Column(db.DateTime, nullable=True)
    fecha_entrega = db.Column(db.Date, nullable=True)  # Día en que se entregó el equipo (vida útil)

    # Relación muchos a muchos con tickets (a través de la tabla intermedia)
    tickets = db.relationship(
        'Ticket',
        secondary='ticket_inventario',
        back_populates='equipos'
    )

    def to_dict(self):
        return {
            'id': self.id,
            'nombre_equipo': self.nombre_equipo,
            'tipo': self.tipo,
            'marca': self.marca,
            'modelo': self.modelo,
            'numero_serie': self.numero_serie,
            'ubicacion_tienda': self.ubicacion_tienda,
            'estado': self.estado,
            'anydesk_id': self.anydesk_id,
            'asignado_a': self.asignado_a,
            'fecha_adquisicion': self.fecha_adquisicion.isoformat() if self.fecha_adquisicion else None,
            'fecha_entrega': self.fecha_entrega.isoformat() if self.fecha_entrega else None
        }
