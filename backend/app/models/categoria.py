from app import db

class Categoria(db.Model):
    __tablename__ = 'categorias'

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), unique=True, nullable=False)
    descripcion = db.Column(db.String(255), nullable=True)

    # Relación de muchos a muchos con tecnicos
    tecnicos = db.relationship(
        'Usuario',
        secondary='tecnicos_categorias',
        back_populates='categorias_asignadas'
    )

    def to_dict(self):
        return {
            'id': self.id,
            'nombre': self.nombre,
            'descripcion': self.descripcion
        }
