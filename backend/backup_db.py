"""Respaldo de la base de datos para conservar SIEMPRE el registro de
conversaciones, tickets e inventario.

- SQLite: copia segura del archivo .db (usa el backup API de SQLite para no
  copiar un archivo a medio escribir).
- MySQL/PostgreSQL: se recomienda mysqldump/pg_dump programado (ver README).

Uso manual:
    python backend/backup_db.py

Programar (Windows Task Scheduler o cron del VPS, ej. cada 6 horas):
    cron: 0 */6 * * * cd /ruta/backend && ./venv/bin/python backup_db.py
"""
import os
import sqlite3
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app import create_app  # noqa: E402

CARPETA_BACKUPS = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backups')
CONSERVAR_ULTIMOS = 60  # respaldos a retener


def limpiar_uploads():
    """Borra adjuntos antiguos según UPLOAD_RETENTION_DAYS (evita llenar el disco)."""
    from app.routes.uploads import limpiar_antiguos
    eliminados = limpiar_antiguos()
    print(f"Limpieza de adjuntos antiguos: {eliminados} archivo(s) eliminado(s)")


def respaldar_sqlite(ruta_db):
    os.makedirs(CARPETA_BACKUPS, exist_ok=True)
    nombre = f"drasac_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
    destino = os.path.join(CARPETA_BACKUPS, nombre)

    origen = sqlite3.connect(ruta_db)
    copia = sqlite3.connect(destino)
    with copia:
        origen.backup(copia)  # copia consistente aunque haya escrituras en curso
    copia.close()
    origen.close()
    return destino


def limpiar_antiguos():
    """Deja solo los últimos CONSERVAR_ULTIMOS respaldos."""
    archivos = sorted(
        f for f in os.listdir(CARPETA_BACKUPS) if f.endswith('.db')
    )
    for viejo in archivos[:-CONSERVAR_ULTIMOS]:
        os.remove(os.path.join(CARPETA_BACKUPS, viejo))
    return len(archivos) - min(len(archivos), CONSERVAR_ULTIMOS)


if __name__ == '__main__':
    app = create_app()
    uri = app.config['SQLALCHEMY_DATABASE_URI']
    if not uri.startswith('sqlite'):
        print("La base de datos NO es SQLite. Usa mysqldump/pg_dump programado:")
        print("  MySQL: mysqldump -u usuario -p drasac > drasac_$(date +%F).sql")
        sys.exit(0)

    # Resolver la ruta real del archivo SQLite (instance/drasac.db)
    with app.app_context():
        ruta_db = app.config['SQLALCHEMY_DATABASE_URI'].replace('sqlite:///', '')
        if not os.path.isabs(ruta_db):
            ruta_db = os.path.join(app.instance_path, os.path.basename(ruta_db))

    if not os.path.exists(ruta_db):
        print(f"No se encontró la base de datos en: {ruta_db}")
        sys.exit(1)

    destino = respaldar_sqlite(ruta_db)
    borrados = limpiar_antiguos()
    tamanio = os.path.getsize(destino) / 1024
    print(f"Respaldo creado: {destino} ({tamanio:.0f} KB) · antiguos eliminados: {borrados}")
    limpiar_uploads()
