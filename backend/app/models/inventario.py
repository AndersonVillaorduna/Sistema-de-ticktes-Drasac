from app import db
from app.services.crypto import cifrar, descifrar
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
    anydesk_id = db.Column(db.String(50), nullable=True)   # Solo laptops
    asignado_a = db.Column(db.String(120), nullable=True)  # Nombre o correo del empleado que lo usa
    fecha_adquisicion = db.Column(db.DateTime, nullable=True)
    fecha_entrega = db.Column(db.Date, nullable=True)  # Día en que se entregó el equipo (vida útil)
    # Campos por tipo de equipo:
    imei_chip = db.Column(db.String(30), nullable=True)      # Modem: IMEI del chip
    windows_version = db.Column(db.String(50), nullable=True)  # Laptop: versión de Windows
    password = db.Column(db.String(300), nullable=True)      # Contraseña (cifrada) del modem/laptop

    # Relación muchos a muchos con tickets (a través de la tabla intermedia)
    tickets = db.relationship(
        'Ticket',
        secondary='ticket_inventario',
        back_populates='equipos'
    )

    @property
    def password_plano(self):
        return descifrar(self.password)

    @password_plano.setter
    def password_plano(self, valor):
        self.password = cifrar(valor)

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
            'fecha_entrega': self.fecha_entrega.isoformat() if self.fecha_entrega else None,
            'imei_chip': self.imei_chip,
            'windows_version': self.windows_version,
            'password': self.password_plano
        }
