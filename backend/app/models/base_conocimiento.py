from app import db

class BaseConocimiento(db.Model):
    __tablename__ = 'base_conocimiento'

    id = db.Column(db.Integer, primary_key=True)
    categoria_id = db.Column(db.Integer, db.ForeignKey('categorias.id', ondelete='SET NULL'), nullable=True)
    problema_tipo = db.Column(db.String(255), nullable=False)  # Ej: 'Impresora no imprime', 'Sin internet'
    solucion = db.Column(db.Text, nullable=False)
    palabras_clave = db.Column(db.String(255), nullable=False)  # Separadas por comas, ej: 'impresora,papel,toner'

    categoria = db.relationship('Categoria', backref='base_conocimiento')

    def to_dict(self):
        return {
            'id': self.id,
            'categoria_id': self.categoria_id,
            'categoria_nombre': self.categoria.nombre if self.categoria else None,
            'problema_tipo': self.problema_tipo,
            'solucion': self.solucion,
            'palabras_clave': self.palabras_clave
        }
