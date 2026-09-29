from datetime import datetime, timezone
"""Additive, portable upgrade of existing installations."""
from alembic import op
import sqlalchemy as sa
from app import db

revision = 'security_20260929'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    db.metadata.create_all(bind=bind)
    additions = {
        'usuarios': [sa.Column('activo', sa.Boolean(), nullable=False, server_default=sa.true())],
        'inventario': [sa.Column('fecha_entrega', sa.Date()), sa.Column('imei_chip', sa.String(30)),
                       sa.Column('windows_version', sa.String(50)), sa.Column('password', sa.String(1024))],
        'base_conocimiento': [sa.Column('imagen_url', sa.String(500)), sa.Column('pasos', sa.Text())],
        'comentarios_ticket': [sa.Column('adjunto_url', sa.String(500))],
        'tickets': [sa.Column('articulo_id', sa.Integer()), sa.Column('paso_actual', sa.Integer(), server_default='0'),
                    sa.Column('resuelto_por', sa.String(20)), sa.Column('resuelto_por_id', sa.Integer())],
    }
    for table, columns in additions.items():
        existing = {c['name'] for c in sa.inspect(bind).get_columns(table)}
        for column in columns:
            if column.name not in existing:
                op.add_column(table, column)
    # Preserve historical tickets/comments whose author was deleted while FK checks were off.
    missing_users = set()
    for table in ('tickets', 'comentarios_ticket'):
        missing_users.update(bind.execute(sa.text(
            f'SELECT DISTINCT x.usuario_id FROM {table} x LEFT JOIN usuarios u ON u.id=x.usuario_id WHERE u.id IS NULL'
        )).scalars())
    import secrets
    import bcrypt
    for user_id in sorted(missing_users):
        if user_id is None:
            raise RuntimeError('Hay autores nulos en registros históricos; revisar antes de migrar.')
        bind.execute(sa.text(
            'INSERT INTO usuarios (id,nombre,email,password_hash,rol,activo,created_at) VALUES (:id,:name,:email,:hash,:role,:active,:created)'
        ), {'id': user_id, 'name': 'Usuario eliminado', 'email': f'archived-{user_id}@invalid.example',
            'hash': bcrypt.hashpw(secrets.token_bytes(32), bcrypt.gensalt()).decode(),
            'role': 'archivado', 'active': False, 'created': datetime.now(timezone.utc).replace(tzinfo=None)})
    # Reading markers referring to removed tickets/accounts contain no conversation content.
    bind.execute(sa.text('DELETE FROM ticket_lecturas WHERE ticket_id NOT IN (SELECT id FROM tickets) OR usuario_id NOT IN (SELECT id FROM usuarios)'))
    bind.execute(sa.text("UPDATE usuarios SET activo = :active, rol = :role WHERE lower(email) = :email"),
                 {'active': False, 'role': 'sistema', 'email': 'ia@drasac.com'})
    if bind.dialect.name != 'sqlite':
        op.alter_column('inventario', 'password', type_=sa.String(1024), existing_type=sa.String(300), existing_nullable=True)
    from app.services.crypto import cifrar, descifrar
    for row in bind.execute(sa.text('SELECT id, password FROM inventario WHERE password IS NOT NULL')).mappings().all():
        stored = row['password']
        if stored.startswith('v1:'):
            continue
        clear = descifrar(stored) if stored.startswith('gAAAA') else stored
        if clear is None:
            raise RuntimeError('Conserva la llave anterior para migrar las credenciales')
        bind.execute(sa.text('UPDATE inventario SET password = :password WHERE id = :id'),
                     {'id': row['id'], 'password': cifrar(clear)})
    indices = [
        ('ix_tickets_fecha', 'tickets', ['created_at'], False),
        ('ix_tickets_estado_fecha', 'tickets', ['estado', 'created_at'], False),
        ('ix_comentarios_ticket_ultimo', 'comentarios_ticket', ['ticket_id', 'created_at', 'id'], False),
        ('ix_notificaciones_usuario_fecha', 'notificaciones', ['usuario_id', 'created_at'], False),
        ('ux_tecnicos_categoria', 'tecnicos_categorias', ['categoria_id'], True),
        ('ux_ticket_equipo', 'ticket_inventario', ['ticket_id', 'inventario_id'], True),
    ]
    for name, table, columns, unique in indices:
        existing = {i['name'] for i in sa.inspect(bind).get_indexes(table)}
        if name in existing:
            continue
        if unique:
            cols = ', '.join(columns)
            duplicate = bind.execute(sa.text(
                f'SELECT {cols} FROM {table} GROUP BY {cols} HAVING COUNT(*) > 1'
            )).first()
            if duplicate:
                raise RuntimeError(f'Hay relaciones duplicadas en {table}; revisar antes de migrar.')
        op.create_index(name, table, columns, unique=unique)


def downgrade():
    raise RuntimeError('La reversión requiere restaurar el respaldo previo; no se eliminan datos automáticamente.')
