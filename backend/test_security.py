import io
import logging
import os
import tempfile
import unittest
from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import patch

os.environ.setdefault('FLASK_ENV', 'development')
from app import create_app, db
from app.models import Usuario, Categoria, Inventario, Ticket, Comentario, Auditoria, Notificacion, TicketLectura, TecnicoCategoria, BaseConocimiento
from app.security_models import Upload, UploadQuota
from app.services.reglas import detectar_intencion
from app.services.crypto import cifrar, descifrar
from flask_jwt_extended import create_access_token
from PIL import Image
import bcrypt


class SecurityRegressionTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.password_hash = bcrypt.hashpw(b'AuditPass123', bcrypt.gensalt(rounds=4)).decode()
        logging.getLogger('alembic').setLevel(logging.WARNING)

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.app = create_app({
            'TESTING': True, 'CORS_ORIGINS': 'http://localhost:5173', 'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
            'JWT_SECRET_KEY': 'j' * 64, 'SECRET_KEY': 's' * 64,
            'INVENTORY_ENCRYPTION_KEYS': '', 'RATELIMIT_ENABLED': False,
            'UPLOAD_FOLDER': self.temp.name, 'UPLOAD_DAILY_QUOTA_BYTES': 100000,
            'UPLOAD_USER_QUOTA_BYTES': 100000,
        })
        self.context = self.app.app_context()
        self.context.push()
        self.client = self.app.test_client()
        self.user = Usuario(nombre='Usuario', email='user@invalid.test', rol='usuario', tienda_area='Sur', password_hash=self.password_hash)
        self.other = Usuario(nombre='Otro', email='other@invalid.test', rol='usuario', tienda_area='Norte', password_hash=self.password_hash)
        self.admin = Usuario(nombre='Admin', email='admin@invalid.test', rol='admin', password_hash=self.password_hash)
        self.tech = Usuario(nombre='Técnico', email='tech@invalid.test', rol='tecnico', password_hash=self.password_hash)
        self.cat = Categoria(nombre='Red/Módem', descripcion='Problemas de conexión')
        self.othercat = Categoria(nombre='Impresoras')
        db.session.add_all([self.user, self.other, self.admin, self.tech, self.cat, self.othercat])
        db.session.flush()
        db.session.add(TecnicoCategoria(tecnico_id=self.tech.id, categoria_id=self.cat.id))
        self.eq = Inventario(nombre_equipo='Equipo Norte', tipo='Laptop', numero_serie='AUDIT-1', ubicacion_tienda='Norte')
        self.eq.password_plano = 'DeviceSecret'
        db.session.add(self.eq)
        db.session.flush()
        self.ticket = Ticket(usuario_id=self.user.id, categoria_id=self.othercat.id, titulo='Ticket de prueba', descripcion='Descripción de prueba')
        self.ticket.equipos.append(self.eq)
        self.owned = Ticket(usuario_id=self.other.id, categoria_id=self.cat.id, tecnico_id=self.tech.id, titulo='Ticket asignado', descripcion='Descripción de prueba')
        self.article = BaseConocimiento(problema_tipo='Manual', solucion='Solución', palabras_clave='audit')
        self.article.pasos = '[{"texto":"Paso uno"},{"texto":"Paso dos"}]'
        db.session.add_all([self.ticket, self.owned, self.article])
        db.session.commit()
        self.ticket.articulo_id = self.article.id
        db.session.commit()
        self.uh = self.header(self.user)
        self.oh = self.header(self.other)
        self.ah = self.header(self.admin)
        self.th = self.header(self.tech)

    def tearDown(self):
        db.session.remove()
        self.context.pop()
        self.temp.cleanup()

    def header(self, user):
        return {'Authorization': 'Bearer ' + create_access_token(identity=str(user.id))}

    def image_upload(self, headers=None):
        content = io.BytesIO()
        Image.new('RGB', (2, 2), 'red').save(content, format='PNG')
        return self.client.post('/api/uploads', data={'archivo': (io.BytesIO(content.getvalue()), 'photo.png')}, headers=headers or self.uh)

    def create(self, **extra):
        payload = {'titulo': 'Un problema nuevo', 'descripcion': 'Descripción de prueba'}
        payload.update(extra)
        with patch('app.routes.tickets.clasificar_y_resolver_ticket', return_value=None):
            return self.client.post('/api/tickets', json=payload, headers=self.uh)

    def test_browser_cookie_is_httponly_persistent_and_csrf_protected(self):
        result = self.client.post('/api/auth/login', json={'email': self.user.email, 'password': 'AuditPass123'})
        self.assertEqual(result.status_code, 200)
        cookie = next(c for c in result.headers.getlist('Set-Cookie') if c.startswith('access_token_cookie='))
        self.assertIn('HttpOnly', cookie)
        self.assertIn('SameSite=Lax', cookie)
        self.assertIn('Expires=', cookie)
        response = self.client.get('/api/auth/me')
        self.assertEqual(response.status_code, 200)
        csrf = response.headers['X-CSRF-Token']
        self.assertEqual(self.client.post('/api/auth/logout', json={}).status_code, 401)
        self.assertEqual(self.client.post('/api/auth/logout', json={}, headers={'X-CSRF-TOKEN': csrf}).status_code, 200)
        self.assertEqual(self.client.get('/api/auth/me').status_code, 401)

    def test_cookie_password_change_preserves_current_browser_and_revokes_old_session(self):
        login = self.client.post('/api/auth/login', json={'email': self.user.email, 'password': 'AuditPass123'})
        old = login.json['token']
        changed = self.client.post('/api/auth/cambiar-password', json={
            'password_actual': 'AuditPass123', 'password_nueva': 'NewAuditPass123'},
            headers={'X-CSRF-TOKEN': login.headers['X-CSRF-Token']})
        self.assertEqual(changed.status_code, 200)
        self.assertEqual(self.client.get('/api/auth/me').status_code, 200)
        self.assertEqual(self.client.get('/api/auth/me', headers={'Authorization': 'Bearer '+old}).status_code, 401)
        self.assertEqual(self.client.post('/api/auth/logout', json={}, headers={'X-CSRF-TOKEN': changed.headers['X-CSRF-Token']}).status_code, 200)

    def test_single_article_and_keyword_boundaries(self):
        from app.services.ia_service import keyword_matches
        result = self.client.get(f'/api/base-conocimiento/{self.article.id}', headers=self.uh)
        self.assertEqual(result.status_code, 200)
        self.assertEqual(len(result.json['pasos']), 2)
        self.assertEqual(self.client.get('/api/base-conocimiento/999999', headers=self.uh).status_code, 404)
        self.assertTrue(keyword_matches('impresora', 'La IMPRESORA falla'))
        self.assertFalse(keyword_matches('red', 'credenciales'))
        self.assertTrue(keyword_matches('conexión', 'No hay conexion'))

    def test_login_allows_email_longer_than_bcrypt_password_limit(self):
        self.user.email = 'u'*64 + '@example.test'
        db.session.commit()
        self.assertGreater(len(self.user.email), 72)
        result = self.client.post('/api/auth/login', json={'email': self.user.email, 'password': 'AuditPass123'})
        self.assertEqual(result.status_code, 200)

    def test_production_rejects_unsafe_configurations(self):
        from cryptography.fernet import Fernet
        config = {'TESTING': True, 'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
            'CORS_ORIGINS': 'https://tickets.example.com', 'SECRET_KEY': 'p'*64, 'JWT_SECRET_KEY': 'q'*64,
            'INVENTORY_ENCRYPTION_KEYS': Fernet.generate_key().decode(),
            'RATELIMIT_STORAGE_URI': 'redis://localhost:6379/0', 'RATELIMIT_ENABLED': False}
        bad = ({'SECRET_KEY': 'default-dev-key'}, {'JWT_SECRET_KEY': 'short'},
            {'INVENTORY_ENCRYPTION_KEYS': ''}, {'RATELIMIT_STORAGE_URI': 'memory://'},
            {'CORS_ORIGINS': '*'}, {'CORS_ORIGINS': 'https://.*'}, {'CORS_ORIGINS': 'http://tickets.example.com'})
        with patch.dict(os.environ, {'FLASK_ENV': 'production'}):
            for change in bad:
                with self.subTest(change=list(change)), self.assertRaises(RuntimeError):
                    create_app(dict(config, **change))
            app = create_app(config)
            self.assertTrue(app.config['JWT_COOKIE_SECURE'])

    def test_bootstrap_admin_creates_disabled_system_actor_without_demo_credentials(self):
        from manage import main
        with patch('manage.create_app', return_value=self.app), patch('sys.argv',
                ['manage.py', 'bootstrap-admin', '--email', 'bootstrap@invalid.test']), \
                patch('manage.getpass.getpass', side_effect=['NewAdminPass123', 'NewAdminPass123']), patch('builtins.print'):
            main()
        admin = Usuario.query.filter_by(email='bootstrap@invalid.test').one()
        self.assertEqual(admin.rol, 'admin')
        self.assertTrue(admin.check_password('NewAdminPass123'))
        system = Usuario.query.filter_by(email='ia@drasac.com').one()
        self.assertEqual(system.rol, 'sistema')
        self.assertFalse(system.activo)
        self.assertFalse(system.check_password('iapassword123'))

    def test_regular_user_cannot_read_or_export_inventory(self):
        for path in ('/api/inventario', '/api/inventario?exportar=1', f'/api/inventario/{self.eq.id}'):
            self.assertEqual(self.client.get(path, headers=self.uh).status_code, 403)

    def test_ticket_payloads_never_contain_passwords(self):
        for path in ('/api/tickets', f'/api/tickets/{self.ticket.id}', '/api/dashboard/stats'):
            result = self.client.get(path, headers=self.uh)
            self.assertEqual(result.status_code, 200)
            self.assertNotIn('DeviceSecret', result.get_data(as_text=True))
            self.assertNotIn('"password"', result.get_data(as_text=True))

    def test_cannot_link_foreign_equipment(self):
        self.assertEqual(self.create(equipos_ids=[self.eq.id]).status_code, 403)

    def test_can_link_own_equipment_without_leaking_password(self):
        self.eq.ubicacion_tienda = 'Sur'
        db.session.commit()
        result = self.create(equipos_ids=[self.eq.id])
        self.assertEqual(result.status_code, 201)
        self.assertNotIn('password', result.json['ticket']['equipos'][0])

    def test_authorized_inventory_details_and_exports_still_work(self):
        for headers in (self.ah, self.th):
            result = self.client.get(f'/api/inventario/{self.eq.id}', headers=headers)
            self.assertEqual(result.status_code, 200)
            self.assertEqual(result.json['password'], 'DeviceSecret')
            self.assertEqual(self.client.get('/api/inventario?exportar=1', headers=headers).json[0]['password'], 'DeviceSecret')

    def test_cross_technician_operations_are_denied(self):
        for suffix, method, data in (('', 'get', None), ('/comentarios', 'post', {'mensaje': 'Mensaje'}), ('/siguiente-paso', 'post', None)):
            result = getattr(self.client, method)(f'/api/tickets/{self.ticket.id}{suffix}', json=data, headers=self.th)
            self.assertEqual(result.status_code, 403)

    def test_export_and_store_report_respect_technician_scope(self):
        result = self.client.get('/api/tickets/exportar', headers=self.th)
        self.assertEqual([t['id'] for t in result.json], [self.owned.id])
        result = self.client.get('/api/dashboard/por-tienda', headers=self.th)
        self.assertEqual([t['tienda'] for t in result.json['tiendas']], ['Norte'])

    def test_assigned_technician_can_comment(self):
        result = self.client.post(f'/api/tickets/{self.owned.id}/comentarios', json={'mensaje': 'Respuesta'}, headers=self.th)
        self.assertEqual(result.status_code, 201)

    def test_invalid_ticket_values_are_rejected(self):
        for payload in ({'estado': 'inventado'}, {'prioridad': 'inventada'}, {'tecnico_id': self.user.id}, {'categoria_id': 999999}, {'tecnico_id': True}):
            with self.subTest(payload=payload):
                self.assertEqual(self.client.patch(f'/api/tickets/{self.ticket.id}', json=payload, headers=self.ah).status_code, 400)

    def test_json_types_and_long_text_are_rejected(self):
        for payload in ([], None, {'titulo': 12, 'descripcion': 'Descripción'}, {'titulo': 'x' * 256, 'descripcion': 'Descripción'}):
            self.assertIn(self.client.post('/api/tickets', json=payload, headers=self.uh).status_code, (400, 415))

    def test_category_audits_survive_new_session(self):
        response = self.client.post('/api/categorias', json={'nombre': 'Nueva categoría'}, headers=self.ah)
        self.assertEqual(response.status_code, 201)
        db.session.remove()
        self.assertEqual(Auditoria.query.filter_by(accion='categoria_creada').count(), 1)

    def test_password_can_be_cleared_without_clearing_on_omission(self):
        result = self.client.put(f'/api/inventario/{self.eq.id}', json={'modelo': 'Modelo'}, headers=self.ah)
        self.assertEqual(result.json['equipo']['password'], 'DeviceSecret')
        result = self.client.put(f'/api/inventario/{self.eq.id}', json={'password': None}, headers=self.ah)
        self.assertIsNone(result.json['equipo']['password'])

    def test_password_change_revokes_all_old_tokens_and_returns_working_replacement(self):
        another = self.header(self.user)
        result = self.client.post('/api/auth/cambiar-password', json={'password_actual': 'AuditPass123', 'password_nueva': 'NewAuditPass123'}, headers=self.uh)
        self.assertEqual(result.status_code, 200)
        for old in (self.uh, another):
            self.assertEqual(self.client.get('/api/auth/me', headers=old).status_code, 401)
        fresh = {'Authorization': 'Bearer ' + result.json['token']}
        self.assertEqual(self.client.get('/api/auth/me', headers=fresh).status_code, 200)

    def test_logout_revokes_only_current_session(self):
        other = self.header(self.user)
        self.assertEqual(self.client.post('/api/auth/logout', headers=self.uh).status_code, 200)
        self.assertEqual(self.client.get('/api/auth/me', headers=self.uh).status_code, 401)
        self.assertEqual(self.client.get('/api/auth/me', headers=other).status_code, 200)

    def test_system_account_and_inactive_users_cannot_login(self):
        self.user.activo = False
        self.other.email = 'ia@drasac.com'
        self.other.rol = 'admin'
        db.session.commit()
        for email in ('user@invalid.test', 'ia@drasac.com'):
            result = self.client.post('/api/auth/login', json={'email': email, 'password': 'AuditPass123'})
            self.assertEqual(result.status_code, 401)
        self.assertEqual(self.client.get('/api/auth/me', headers=self.uh).status_code, 401)

    def test_upload_signed_url_preserves_image_extension_and_blocks_unsigned_access(self):
        result = self.image_upload()
        self.assertEqual(result.status_code, 201)
        url = result.json['url']
        self.assertTrue(url.endswith('.png'))
        download = self.client.get(url)
        self.assertEqual(download.status_code, 200)
        download.close()
        filename = url.rsplit('/', 1)[-1]
        self.assertEqual(self.client.get('/api/uploads/' + filename).status_code, 401)
        self.assertEqual(self.client.get('/api/uploads/' + filename, headers=self.oh).status_code, 403)

    def test_invalid_image_content_is_rejected(self):
        result = self.client.post('/api/uploads', data={'archivo': (io.BytesIO(b'not an image'), 'fake.png')}, headers=self.uh)
        self.assertEqual(result.status_code, 400)
        self.assertEqual(Upload.query.count(), 0)

    def test_upload_quota_is_cumulative(self):
        first = self.image_upload()
        size = Upload.query.first().bytes
        self.app.config['UPLOAD_DAILY_QUOTA_BYTES'] = size * 2
        self.assertEqual(self.image_upload().status_code, 201)
        self.assertEqual(UploadQuota.query.first().bytes, size * 2)
        self.assertEqual(self.image_upload().status_code, 429)
        self.assertEqual(Upload.query.count(), 2)

    def test_attachment_ownership_and_ticket_access(self):
        url = self.image_upload().json['url']
        response = self.client.post(f'/api/tickets/{self.owned.id}/comentarios', json={'adjunto_url': url}, headers=self.th)
        self.assertEqual(response.status_code, 403)
        response = self.client.post(f'/api/tickets/{self.ticket.id}/comentarios', json={'adjunto_url': url}, headers=self.uh)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json['comentario']['adjunto_url'].rsplit('/', 1)[-1], url.rsplit('/', 1)[-1])

    def test_signed_download_is_revoked_after_password_change(self):
        url = self.image_upload().json['url']
        self.client.post('/api/auth/cambiar-password', json={'password_actual': 'AuditPass123', 'password_nueva': 'NewAuditPass123'}, headers=self.uh)
        self.assertEqual(self.client.get(url).status_code, 403)

    def test_confirm_endpoint_only_accepts_pending_ia_and_is_idempotent(self):
        path = f'/api/tickets/{self.ticket.id}/confirmar'
        self.assertEqual(self.client.post(path, json={'confirmado': True}, headers=self.uh).status_code, 400)
        self.ticket.estado = 'resuelto por ia - pendiente'
        db.session.commit()
        self.assertEqual(self.client.post(path, json={'confirmado': True}, headers=self.uh).status_code, 200)
        count = Comentario.query.filter_by(ticket_id=self.ticket.id).count()
        self.assertEqual(self.client.post(path, json={'confirmado': True}, headers=self.uh).status_code, 200)
        self.assertEqual(Comentario.query.filter_by(ticket_id=self.ticket.id).count(), count)

    def test_negative_message_does_not_close_guided_ticket(self):
        self.ticket.estado = 'en proceso'
        self.ticket.paso_actual = 12
        db.session.commit()
        result = self.client.post(f'/api/tickets/{self.ticket.id}/comentarios', json={'mensaje': 'Gracias, pero no funciona'}, headers=self.uh)
        self.assertEqual(result.status_code, 201)
        self.assertEqual(db.session.get(Ticket, self.ticket.id).estado, 'abierto')

    def test_quick_reply_success_still_closes_guided_ticket(self):
        self.ticket.estado = 'en proceso'
        self.ticket.paso_actual = 12
        db.session.commit()
        result = self.client.post(f'/api/tickets/{self.ticket.id}/comentarios', json={'mensaje': 'Sí, quedó resuelto'}, headers=self.uh)
        self.assertEqual(result.status_code, 201)
        self.assertEqual(db.session.get(Ticket, self.ticket.id).estado, 'cerrado')

    def test_reopen_clears_resolution_data(self):
        self.ticket.estado = 'cerrado'
        self.ticket.resolved_at = datetime.utcnow()
        self.ticket.resuelto_por = 'humano'
        self.ticket.resuelto_por_id = self.admin.id
        db.session.commit()
        result = self.client.patch(f'/api/tickets/{self.ticket.id}', json={'estado': 'abierto'}, headers=self.ah)
        self.assertEqual(result.status_code, 200)
        for field in ('resolved_at', 'resuelto_por', 'resuelto_por_id'):
            self.assertIsNone(result.json['ticket'][field])

    def test_close_without_resolution_is_not_counted_as_human_resolution(self):
        result = self.client.patch(f'/api/tickets/{self.ticket.id}', json={'estado': 'cerrado', 'marcado_resuelto': False}, headers=self.ah)
        self.assertEqual(result.json['ticket']['resuelto_por'], 'sin_resolver')
        stats = self.client.get('/api/dashboard/stats', headers=self.ah).json
        self.assertEqual(stats['resoluciones_ia_vs_humana']['humana'], 0)

    def test_delete_ticket_removes_dependent_records(self):
        db.session.add_all([Notificacion(usuario_id=self.user.id, ticket_id=self.ticket.id, mensaje='Aviso'), TicketLectura(usuario_id=self.user.id, ticket_id=self.ticket.id)])
        db.session.commit()
        response = self.client.delete(f'/api/tickets/{self.ticket.id}', headers=self.ah)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(TicketLectura.query.count(), 0)
        self.assertEqual(Notificacion.query.count(), 0)
        self.assertEqual(db.session.execute(db.text('PRAGMA foreign_key_check')).all(), [])

    def test_foreign_keys_and_optional_pagination(self):
        self.assertEqual(db.session.execute(db.text('PRAGMA foreign_keys')).scalar(), 1)
        response = self.client.get('/api/tickets?page=1&per_page=1', headers=self.ah)
        self.assertEqual(len(response.json), 1)
        self.assertEqual(len(self.client.get('/api/tickets', headers=self.ah).json), 2)
        self.assertEqual(self.client.get('/api/tickets?page=-1', headers=self.ah).status_code, 400)

    def test_idempotent_create_returns_same_ticket_and_rejects_changed_payload(self):
        headers = dict(self.uh, **{'Idempotency-Key': 'audit-request-123'})
        payload = {'titulo': 'Reintento de ticket', 'descripcion': 'Descripción de prueba'}
        with patch('app.routes.tickets.clasificar_y_resolver_ticket', return_value=None):
            first = self.client.post('/api/tickets', json=payload, headers=headers)
            second = self.client.post('/api/tickets', json=payload, headers=headers)
            self.assertEqual(first.status_code, 201)
            self.assertEqual(first.json['ticket']['id'], second.json['ticket']['id'])
            payload['titulo'] = 'Otros datos'
            self.assertEqual(self.client.post('/api/tickets', json=payload, headers=headers).status_code, 409)

    def test_creation_is_atomic_if_notifications_fail(self):
        before = Ticket.query.count()
        with patch('app.routes.tickets.clasificar_y_resolver_ticket', return_value=None), patch('app.routes.tickets._notificar', side_effect=RuntimeError('simulated')):
            result = self.client.post('/api/tickets', json={'titulo': 'Ticket fallido', 'descripcion': 'Descripción de prueba'}, headers=self.uh)
        self.assertEqual(result.status_code, 500)
        self.assertEqual(Ticket.query.count(), before)

    def test_corrupt_ciphertext_is_not_returned_as_plaintext(self):
        self.assertEqual(descifrar(cifrar('Secret')), 'Secret')
        self.assertIsNone(descifrar('v1:invalid'))
        self.assertIsNone(descifrar('legacy plaintext'))

    def test_login_normalization_and_persistent_lockout(self):
        for _ in range(5):
            self.assertEqual(self.client.post('/api/auth/login', json={'email': ' USER@INVALID.TEST ', 'password': 'wrong'}).status_code, 401)
        self.assertEqual(self.client.post('/api/auth/login', json={'email': 'user@invalid.test', 'password': 'AuditPass123'}).status_code, 429)

    def test_negative_intentions(self):
        for message in ('Gracias, pero no funciona', 'No está resuelto', 'No me ayudó', 'Ya lo hice pero sigue igual'):
            self.assertEqual(detectar_intencion(message), 'negacion')
        self.assertEqual(detectar_intencion('Gracias'), 'neutro')
        self.assertEqual(detectar_intencion('Ya lo hice'), 'confirmacion')

    def test_cleanup_preserves_referenced_manuals_and_chat(self):
        from app.routes.uploads import limpiar_antiguos
        name = 'a' * 32 + '.png'
        path = Path(self.temp.name) / name
        path.write_bytes(b'old')
        old = (datetime.now() - timedelta(days=90)).timestamp()
        os.utime(path, (old, old))
        self.article.imagen_url = '/api/uploads/' + name
        db.session.commit()
        self.assertEqual(limpiar_antiguos(), 0)
        self.assertTrue(path.exists())

    def test_health_checks_database(self):
        self.assertEqual(self.client.get('/health').status_code, 200)
        with patch('app.db.session.execute', side_effect=RuntimeError('down')):
            self.assertEqual(self.client.get('/health').status_code, 503)


if __name__ == '__main__':
    unittest.main()
