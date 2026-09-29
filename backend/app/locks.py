"""Locks shared by workers on one host; no files for in-memory tests."""
import os
import threading
from flask import current_app
from filelock import FileLock
from app import db

_local = threading.RLock()


def shared_lock(name):
    if db.engine.url.database in (None, '', ':memory:'):
        return _local
    os.makedirs(current_app.instance_path, exist_ok=True)
    return FileLock(os.path.join(current_app.instance_path, '.' + name + '.lock'), timeout=30)
