from contextlib import closing
import base64
import hashlib
import json
import logging
import sqlite3
import tempfile
import unittest
import zipfile
import multiprocessing
import io
from flask_jwt_extended import create_access_token
from PIL import Image
from pathlib import Path
from cryptography.fernet import Fernet
from app import create_app, db
from app.models import Usuario, Inventario
from backup_db import snapshot, limpiar_antiguos


def upload_worker(config, content, queue):
    app = create_app(config)
    try:
        with app.app_context():
            token = create_access_token(identity='1')
        client = app.test_client()
        statuses = [client.post('/api/uploads', data={'archivo': (io.BytesIO(content), 'image.png')},
                    headers={'Authorization': 'Bearer '+token}).status_code for _ in range(3)]
        queue.put(statuses)
    finally:
        with app.app_context():
            db.session.remove()
            db.engine.dispose()


class MigrationAndBackupTest(unittest.TestCase):
    def setUp(self):
        logging.getLogger('alembic').setLevel(logging.WARNING)
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.database = self.root / 'old.db'
        self.uploads = self.root / 'uploads'
        self.uploads.mkdir()
        self.legacy = base64.urlsafe_b64encode(hashlib.sha256(b's' * 64).digest())
        self.primary = Fernet.generate_key()
        with closing(sqlite3.connect(self.database)) as conn, conn:
            conn.execute('CREATE TABLE usuarios (id INTEGER PRIMARY KEY, nombre VARCHAR(100) NOT NULL, email VARCHAR(120) NOT NULL UNIQUE, password_hash VARCHAR(128) NOT NULL, rol VARCHAR(20) NOT NULL, tienda_area VARCHAR(100), created_at DATETIME)')
            conn.execute('CREATE TABLE inventario (id INTEGER PRIMARY KEY, nombre_equipo VARCHAR(100) NOT NULL, tipo VARCHAR(50) NOT NULL, marca VARCHAR(50), modelo VARCHAR(50), numero_serie VARCHAR(100) NOT NULL UNIQUE, ubicacion_tienda VARCHAR(100) NOT NULL, estado VARCHAR(50) NOT NULL, anydesk_id VARCHAR(50), asignado_a VARCHAR(120), fecha_adquisicion DATETIME, password VARCHAR(300))')
            conn.executemany('INSERT INTO usuarios(id,nombre,email,password_hash,rol,created_at) VALUES(?,?,?,?,?,?)', [
                (1, 'Admin', 'admin@invalid.test', 'hash', 'admin', '2026-01-01 00:00:00'),
                (2, 'IA', 'ia@drasac.com', 'hash', 'admin', '2026-01-01 00:00:00')])
            for n, stored in enumerate(['OldPlaintext', Fernet(self.legacy).encrypt(b'OldCiphertext').decode()], 1):
                conn.execute('INSERT INTO inventario (id,nombre_equipo,tipo,numero_serie,ubicacion_tienda,estado,password) VALUES(?,?,?,?,?,?,?)', (n, 'Equipo', 'Laptop', str(n), 'Pruebas', 'activo', stored))
        self.config = {
            'TESTING': True, 'CORS_ORIGINS': 'http://localhost:5173', 'SQLALCHEMY_DATABASE_URI': 'sqlite:///' + self.database.as_posix(),
            'INSTANCE_PATH': str(self.root / 'instance'), 'MIGRATION_BACKUP_DIR': str(self.root / 'backups'),
            'SECRET_KEY': 's' * 64, 'JWT_SECRET_KEY': 'j' * 64,
            'INVENTORY_ENCRYPTION_KEYS': self.primary.decode() + ',' + self.legacy.decode(),
            'RATELIMIT_ENABLED': False, 'UPLOAD_FOLDER': str(self.uploads),
        }

    def tearDown(self):
        self.temp.cleanup()

    def open(self):
        return create_app(self.config)

    def close(self, app):
        with app.app_context():
            db.session.remove()
            db.engine.dispose()

    def test_existing_accounts_and_credentials_survive_additive_upgrade(self):
        app = self.open()
        try:
            with app.app_context():
                self.assertEqual(Usuario.query.count(), 2)
                self.assertTrue(db.session.get(Usuario, 1).activo)
                self.assertFalse(db.session.get(Usuario, 2).activo)
                self.assertEqual(db.session.get(Usuario, 2).rol, 'sistema')
                self.assertEqual([e.password_plano for e in Inventario.query.order_by(Inventario.id)], ['OldPlaintext', 'OldCiphertext'])
                self.assertTrue(all(e.password.startswith('v1:') for e in Inventario.query))
                self.assertEqual(db.session.execute(db.text('PRAGMA foreign_key_check')).all(), [])
            backups = list((self.root / 'backups').glob('pre_security_*.db'))
            self.assertEqual(len(backups), 1)
            with closing(sqlite3.connect(backups[0])) as conn:
                self.assertEqual(conn.execute('SELECT password FROM inventario WHERE id=1').fetchone()[0], 'OldPlaintext')
                self.assertNotIn('activo', {r[1] for r in conn.execute('PRAGMA table_info(usuarios)')})
        finally:
            self.close(app)

    def test_orphan_comment_author_is_archived_without_losing_the_conversation(self):
        app = self.open()
        self.close(app)
        with closing(sqlite3.connect(self.database)) as conn, conn:
            conn.execute("INSERT INTO tickets (id,usuario_id,titulo,descripcion,estado,prioridad,created_at,updated_at) VALUES(1,1,'Título','Descripción','abierto','media','2026-01-01','2026-01-01')")
            conn.execute("INSERT INTO comentarios_ticket (id,ticket_id,usuario_id,mensaje,created_at) VALUES(1,1,99,'Conservar este mensaje','2026-01-01')")
            conn.execute("INSERT INTO ticket_lecturas (usuario_id,ticket_id,leido_at) VALUES(100,100,'2026-01-01')")
            conn.execute('DELETE FROM alembic_version')
        app = self.open()
        try:
            with app.app_context():
                archived = db.session.get(Usuario, 99)
                self.assertFalse(archived.activo)
                self.assertEqual(archived.rol, 'archivado')
                self.assertEqual(db.session.execute(db.text('SELECT mensaje FROM comentarios_ticket WHERE id=1')).scalar(), 'Conservar este mensaje')
                self.assertEqual(db.session.execute(db.text('SELECT COUNT(*) FROM ticket_lecturas')).scalar(), 0)
                self.assertEqual(db.session.execute(db.text('PRAGMA foreign_key_check')).all(), [])
        finally:
            self.close(app)

    def test_upgrade_is_idempotent_and_does_not_create_repeated_backups(self):
        first = self.open()
        self.close(first)
        second = self.open()
        try:
            with second.app_context():
                self.assertEqual(Inventario.query.count(), 2)
                self.assertEqual(db.session.execute(db.text('SELECT version_num FROM alembic_version')).scalar(), 'security_20260929')
            self.assertEqual(len(list((self.root / 'backups').glob('pre_security_*.db'))), 1)
        finally:
            self.close(second)

    def test_snapshot_contains_restorable_database_and_attachments_without_keys(self):
        attachment = self.uploads / ('a'*32 + '.png')
        attachment.write_bytes(b'dummy attachment')
        app = self.open()
        try:
            with app.app_context():
                archive_path = snapshot(self.root / 'snapshots')
            with zipfile.ZipFile(archive_path) as archive:
                self.assertIsNone(archive.testzip())
                self.assertEqual(archive.read('uploads/' + attachment.name), b'dummy attachment')
                manifest = json.loads(archive.read('manifest.json'))
                self.assertEqual(manifest['schema'], 'security_20260929')
                self.assertNotIn(self.primary.decode(), archive.read('manifest.json').decode())
                restored = self.root / 'restored.db'
                restored.write_bytes(archive.read('database.db'))
            with closing(sqlite3.connect(restored)) as conn:
                self.assertEqual(conn.execute('PRAGMA integrity_check').fetchone()[0], 'ok')
                self.assertEqual(conn.execute('SELECT COUNT(*) FROM inventario').fetchone()[0], 2)
        finally:
            self.close(app)

    def test_upload_quota_is_enforced_across_independent_processes(self):
        app = self.open()
        self.close(app)
        image = io.BytesIO()
        Image.new('RGB', (2, 2), 'red').save(image, format='PNG')
        content = image.getvalue()
        self.config['UPLOAD_DAILY_QUOTA_BYTES'] = len(content) * 3
        self.config['UPLOAD_USER_QUOTA_BYTES'] = len(content) * 3
        context = multiprocessing.get_context('spawn')
        queue = context.Queue()
        workers = [context.Process(target=upload_worker, args=(self.config, content, queue)) for _ in range(2)]
        try:
            for worker in workers:
                worker.start()
            statuses = queue.get(timeout=30) + queue.get(timeout=30)
            for worker in workers:
                worker.join(timeout=10)
                self.assertEqual(worker.exitcode, 0)
            self.assertEqual(statuses.count(201), 3)
            self.assertEqual(statuses.count(429), 3)
            with closing(sqlite3.connect(self.database)) as conn:
                self.assertEqual(conn.execute('SELECT SUM(bytes) FROM uploads_quota').fetchone()[0], len(content)*3)
                self.assertEqual(conn.execute('SELECT COUNT(*) FROM uploads_metadata').fetchone()[0], 3)
        finally:
            for worker in workers:
                if worker.is_alive():
                    worker.terminate()
                    worker.join(timeout=5)
            queue.close()
            queue.join_thread()

    def test_retention_only_removes_generated_archives_and_keeps_pre_migration_backup(self):
        folder = self.root / 'retention'
        folder.mkdir()
        for name in ('drasac_01.zip', 'drasac_02.zip', 'drasac_03.zip', 'drasac_00.partial', 'notes.txt', 'pre_security_01.db'):
            (folder / name).write_bytes(b'test')
        self.assertEqual(limpiar_antiguos(folder, keep=2), 1)
        self.assertFalse((folder / 'drasac_01.zip').exists())
        self.assertTrue((folder / 'pre_security_01.db').exists())
        self.assertTrue((folder / 'drasac_00.partial').exists())
        with self.assertRaises(ValueError):
            limpiar_antiguos(folder, keep=0)


if __name__ == '__main__':
    unittest.main()
