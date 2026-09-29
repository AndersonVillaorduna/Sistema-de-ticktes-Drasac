from contextlib import closing
"""Run versioned migrations once, serialized across local workers."""
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from contextlib import nullcontext
from alembic import command
from alembic.config import Config
from filelock import FileLock
from app import db


def _backup_before_upgrade(app):
    url = db.engine.url
    if url.get_backend_name() != 'sqlite' or not url.database or url.database == ':memory:':
        return
    source = Path(url.database).resolve()
    if not source.is_file() or not source.stat().st_size:
        return
    with closing(sqlite3.connect(source.as_uri() + '?mode=ro', uri=True)) as connection:
        names = {row[0] for row in connection.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        if not names or ('alembic_version' in names and connection.execute('SELECT version_num FROM alembic_version').fetchone()):
            return
        directory = Path(app.config.get('MIGRATION_BACKUP_DIR', Path(app.instance_path).parent / 'backups'))
        directory.mkdir(parents=True, exist_ok=True)
        destination = directory / (datetime.now(timezone.utc).strftime('pre_security_%Y%m%d_%H%M%S_%f') + '.db')
        with closing(sqlite3.connect(destination)) as target:
            connection.backup(target)
            if target.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
                raise RuntimeError('El respaldo previo a la migración no pasó la verificación')
        app.logger.info('Respaldo previo a la migración guardado en %s', destination)


def upgrade_schema(app):
    in_memory = db.engine.url.database in (None, '', ':memory:')
    if not in_memory:
        os.makedirs(app.instance_path, exist_ok=True)
    lock = nullcontext() if in_memory else FileLock(os.path.join(app.instance_path, '.schema.lock'), timeout=120)
    with lock:
        _backup_before_upgrade(app)
        config = Config()
        config.set_main_option('script_location', os.path.join(os.path.dirname(os.path.dirname(__file__)), 'migrations'))
        with db.engine.begin() as connection:
            config.attributes['connection'] = connection
            command.upgrade(config, 'head')
