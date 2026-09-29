from alembic import context
from app import db
from app import models  # register metadata
from app import security_models

connection = context.config.attributes['connection']
context.configure(connection=connection, target_metadata=db.metadata, compare_type=True)
with context.begin_transaction():
    context.run_migrations()
