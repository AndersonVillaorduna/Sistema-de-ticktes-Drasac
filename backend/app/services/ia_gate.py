"""Process-shared local Ollama slots, leaving WSGI threads available."""
import os
import threading
from flask import current_app
from filelock import FileLock, Timeout
from app import db


class OllamaGate:
    def __init__(self, capacity):
        self.capacity = capacity
        self.local = threading.BoundedSemaphore(capacity)
        self.held = threading.local()

    def acquire(self, blocking=False):
        if not self.local.acquire(blocking=False):
            return False
        if db.engine.url.database in (None, '', ':memory:'):
            self.held.lock = None
            return True
        os.makedirs(current_app.instance_path, exist_ok=True)
        for slot in range(self.capacity):
            lock = FileLock(os.path.join(current_app.instance_path, f'.ollama-{slot}.lock'), timeout=0)
            try:
                lock.acquire()
                self.held.lock = lock
                return True
            except Timeout:
                continue
        self.local.release()
        return False

    def release(self):
        lock = getattr(self.held, 'lock', None)
        if lock:
            lock.release()
        self.held.lock = None
        self.local.release()
