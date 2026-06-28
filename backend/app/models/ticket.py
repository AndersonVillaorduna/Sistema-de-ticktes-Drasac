from app import db
from datetime import datetime

class Ticket(db.Model):
    __tablename__ = 'tickets'

    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id', ondelete='CASCADE'), nullable=False, index=True)
    categoria_id = db.Column(db.Integer, db.ForeignKey('categorias.id', ondelete='SET NULL'), nullable=True, index=True)
    tecnico_id = db.Column(db.Integer, db.ForeignKey('usuarios.id', ondelete='SET NULL'), nullable=True, index=True)
    
    titulo = db.Column(db.String(255), nullable=False)
    descripcion = db.Column(db.Text, nullable=False)
    estado = db.Column(db.String(50), nullable=False, default='abierto')  # 'abierto', 'en proceso', 'resuelto por ia - pendiente', 'resuelto', 'cerrado'
    prioridad = db.Column(db.String(20), nullable=False, default='media')  # 'baja', 'media', 'alta'
    
    clasificado_por_ia = db.Column(db.Boolean, default=False)
    respuesta_ia = db.Column(db.Text, nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolved_at = db.Column(db.DateTime, nullable=True)

    # Relaciones
    usuario = db.relationship('Usuario', foreign_keys=[usuario_id], backref='tickets_creados')
    categoria = db.relationship('Categoria', backref='tickets')
    tecnico = db.relationship('Usuario', foreign_keys=[tecnico_id], backref='tickets_asignados')
    
    comentarios = db.relationship('Comentario', back_populates='ticket', cascade='all, delete-orphan')
    
    equipos = db.relationship(
        'Inventario',
        secondary='ticket_inventario',
        back_populates='tickets'
    )

    def to_dict(self):
        return {
            'id': self.id,
            'usuario_id': self.usuario_id,
            'usuario_nombre': self.usuario.nombre if self.usuario else None,
            'categoria_id': self.categoria_id,
            'categoria_nombre': self.categoria.nombre if self.categoria else None,
            'tecnico_id': self.tecnico_id,
            'tecnico_nombre': self.tecnico.nombre if self.tecnico else 'No asignado',
            'titulo': self.titulo,
            'descripcion': self.descripcion,
            'estado': self.estado,
            'prioridad': self.prioridad,
            'clasificado_por_ia': self.clasificado_por_ia,
            'respuesta_ia': self.respuesta_ia,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
            'equipos': [eq.to_dict() for eq in self.equipos]
        }
