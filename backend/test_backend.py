import os
# Configurar base de datos en memoria para pruebas antes de que se cree el engine de SQLAlchemy
os.environ['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
os.environ['JWT_SECRET_KEY'] = 'test-secret'

import unittest
import json
from app import create_app, db
from app.models.usuario import Usuario
from app.models.categoria import Categoria
from app.models.inventario import Inventario
from app.models.ticket import Ticket
from app.services.heuristica import clasificador_heuristico

class DrasacBackendTestCase(unittest.TestCase):
    
    def setUp(self):
        self.app = create_app()
        self.app.config['TESTING'] = True
        self.client = self.app.test_client()
        
        self.app_context = self.app.app_context()
        self.app_context.push()
        
        db.create_all()
        self.seed_test_data()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def seed_test_data(self):
        # Crear categorías
        self.cat_red = Categoria(nombre="Red/Módem", descripcion="Redes")
        self.cat_imp = Categoria(nombre="Impresoras", descripcion="Impresión")
        db.session.add_all([self.cat_red, self.cat_imp])
        
        # Crear usuarios
        self.admin = Usuario(nombre="Admin Test", email="admin@test.com", rol="admin", tienda_area="Central")
        self.admin.set_password("adminpass")
        
        self.tecnico = Usuario(nombre="Tecnico Test", email="tecnico@test.com", rol="tecnico", tienda_area="Soporte")
        self.tecnico.set_password("tecnicopass")

        self.usuario = Usuario(nombre="Usuario Test", email="usuario@test.com", rol="usuario", tienda_area="Tienda Sur")
        self.usuario.set_password("userpass")
        
        db.session.add_all([self.admin, self.tecnico, self.usuario])
        db.session.commit()

    def get_jwt_token(self, email, password):
        response = self.client.post('/api/auth/login', json={
            "email": email,
            "password": password
        })
        data = json.loads(response.data)
        return data.get('token')

    def test_usuario_contrasena(self):
        """Probar encriptación y validación de contraseñas."""
        user = Usuario(nombre="Clave Test", email="clave@test.com")
        user.set_password("mipassword123")
        self.assertTrue(user.check_password("mipassword123"))
        self.assertFalse(user.check_password("otrapassword"))

    def test_clasificador_heuristico(self):
        """Probar que el clasificador heurístico asigne correctamente según palabras clave."""
        res_red = clasificador_heuristico("El wifi no funciona", "No conecta el modem de internet")
        self.assertEqual(res_red["categoria"], "Red/Módem")
        
        res_imp = clasificador_heuristico("Falla en la impresora", "Se atascó una hoja y falta toner")
        self.assertEqual(res_imp["categoria"], "Impresoras")

    def test_auth_login(self):
        """Probar autenticación de usuario y retorno de JWT."""
        # Intento fallido
        response = self.client.post('/api/auth/login', json={
            "email": "usuario@test.com",
            "password": "incorrect_password"
        })
        self.assertEqual(response.status_code, 401)
        
        # Intento exitoso
        response = self.client.post('/api/auth/login', json={
            "email": "usuario@test.com",
            "password": "userpass"
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn("token", data)
        self.assertEqual(data["usuario"]["rol"], "usuario")

    def test_creacion_ticket_fallback(self):
        """Con la IA no disponible (simulado), el sistema usa el fallback heurístico."""
        token = self.get_jwt_token("usuario@test.com", "userpass")

        # Simulamos Ollama caído para que la prueba no dependa del entorno
        from unittest.mock import patch
        with patch('app.routes.tickets.clasificar_y_resolver_ticket', return_value=None):
            response = self.client.post('/api/tickets', json={
                "titulo": "No hay señal de wifi en tienda",
                "descripcion": "El modem parece apagado y no da red."
            }, headers={"Authorization": f"Bearer {token}"})

        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        self.assertEqual(data["ticket"]["categoria_nombre"], "Red/Módem")
        self.assertEqual(data["ticket"]["estado"], "abierto")
        self.assertFalse(data["ticket"]["clasificado_por_ia"]) # debe ser False si falló Ollama

if __name__ == '__main__':
    unittest.main()
