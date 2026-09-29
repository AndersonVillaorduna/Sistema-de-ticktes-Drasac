from contextlib import closing
"""Consistent database + attachment snapshots; never include plaintext keys."""
import json
import os
import shutil
import sqlite3
import subprocess
import tempfile
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from app import db
from app.locks import shared_lock

CARPETA_BACKUPS = str(Path(__file__).resolve().parent / 'backups')
CONSERVAR_ULTIMOS = 60


def respaldar_sqlite(ruta_db, destination=None):
    directory = Path(destination).parent if destination else Path(CARPETA_BACKUPS)
    directory.mkdir(parents=True, exist_ok=True)
    path = Path(destination) if destination else directory / (datetime.now(timezone.utc).strftime('drasac_%Y%m%d_%H%M%S_%f') + '.db')
    source_uri = Path(ruta_db).resolve().as_uri() + '?mode=ro'
    with closing(sqlite3.connect(source_uri, uri=True)) as source, closing(sqlite3.connect(path)) as target:
        source.backup(target)
        if target.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
            raise RuntimeError('El respaldo no pasó la verificación de integridad')
    return str(path)


def limpiar_antiguos(directory=None, keep=CONSERVAR_ULTIMOS):
    root = Path(directory or CARPETA_BACKUPS).resolve()
    if keep < 1:
        raise ValueError('Debe conservarse al menos un respaldo')
    files = sorted(p for p in root.glob('drasac_*') if p.is_file() and not p.is_symlink() and p.suffix in ('.db', '.zip'))
    for path in files[:-keep]:
        if path.resolve().parent != root:
            raise RuntimeError('Ruta de respaldo fuera de la carpeta autorizada')
        path.unlink()
    return max(0, len(files) - keep)


def _database_dump(path):
    url = db.engine.url
    if url.get_backend_name() == 'sqlite':
        if not url.database or url.database == ':memory:':
            raise RuntimeError('No se respalda una base de datos en memoria')
        return Path(respaldar_sqlite(url.database, str(path / 'database.db')))
    env = os.environ.copy()
    if url.get_backend_name() == 'mysql':
        program = shutil.which('mysqldump')
        env['MYSQL_PWD'] = url.password or ''
        args = [program, '--single-transaction', '--routines', '--events', '--no-tablespaces',
                '--host=' + (url.host or 'localhost'), '--port=' + str(url.port or 3306),
                '--user=' + (url.username or ''), url.database or '']
    elif url.get_backend_name() == 'postgresql':
        program = shutil.which('pg_dump')
        env['PGPASSWORD'] = url.password or ''
        args = [program, '--format=plain', '--no-owner', '--no-acl',
                '--host=' + (url.host or 'localhost'), '--port=' + str(url.port or 5432),
                '--username=' + (url.username or ''), url.database or '']
    else:
        raise RuntimeError('Motor de respaldo no soportado')
    if not program:
        raise RuntimeError('Instala la herramienta de respaldo del motor de base de datos')
    output = path / 'database.sql'
    with output.open('wb') as stream:
        result = subprocess.run(args, stdout=stream, stderr=subprocess.PIPE, env=env, check=False)
    if result.returncode:
        raise RuntimeError('Falló la herramienta de respaldo de la base de datos; no se limpian respaldos previos')
    return output


def snapshot(directory=None):
    from app.routes.uploads import folder
    root = Path(directory or CARPETA_BACKUPS)
    root.mkdir(parents=True, exist_ok=True)
    final = root / (datetime.now(timezone.utc).strftime('drasac_%Y%m%d_%H%M%S_%f') + '.zip')
    with shared_lock('uploads'), tempfile.TemporaryDirectory() as temp:
        database = _database_dump(Path(temp))
        manifest = {
            'created_at': datetime.now(timezone.utc).isoformat(),
            'database': database.name, 'engine': db.engine.url.get_backend_name(),
            'schema': db.session.execute(db.text('SELECT version_num FROM alembic_version')).scalar(),
            'recovery': 'Conservar INVENTORY_ENCRYPTION_KEYS por separado en un almacén seguro.',
        }
        temporary = final.with_suffix('.partial')
        try:
            with zipfile.ZipFile(temporary, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
                archive.write(database, database.name)
                archive.writestr('manifest.json', json.dumps(manifest, ensure_ascii=False))
                uploads = Path(folder()).resolve()
                if uploads.exists():
                    for file in sorted(uploads.iterdir()):
                        if file.is_file() and not file.is_symlink() and file.resolve().parent == uploads:
                            archive.write(file, 'uploads/' + file.name)
            with zipfile.ZipFile(temporary) as archive:
                if archive.testzip() is not None:
                    raise RuntimeError('El archivo de respaldo no pasó la verificación')
            temporary.replace(final)
        except Exception:
            temporary.unlink(missing_ok=True)
            raise
    return str(final)


if __name__ == '__main__':
    from app import create_app
    app = create_app()
    with app.app_context():
        destination = snapshot()
        removed = limpiar_antiguos()
        print(f'Respaldo verificado: {destination}; antiguos eliminados: {removed}')
