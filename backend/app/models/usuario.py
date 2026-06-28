from app import db
from datetime import datetime
import bcrypt

class Usuario(db.Model):
    __tablename__ = 'usuarios'

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(128), nullable=False)
    rol = db.Column(db.String(20), nullable=False, default='usuario')  # 'admin', 'tecnico', 'usuario'
    tienda_area = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relación de muchos a muchos con categorias (a través de la tabla intermedia para técnicos)
    categorias_asignadas = db.relationship(
        'Categoria',
        secondary='tecnicos_categorias',
        back_populates='tecnicos'
    )

    def set_password(self, password):
        salt = bcrypt.gensalt()
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

    def check_password(self, password):
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))

    def to_dict(self):
        return {
            'id': self.id,
            'nombre': self.nombre,
            'email': self.email,
            'rol': self.rol,
            'tienda_area': self.tienda_area,
            'created_at': self.created_at.isoformat()
        }
