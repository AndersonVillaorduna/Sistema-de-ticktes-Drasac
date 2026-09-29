"""Conservative defaults; size workers and pools using measurements."""
import multiprocessing
import os
bind = f"127.0.0.1:{os.getenv('PORT', '5000')}"
workers = int(os.getenv('WEB_CONCURRENCY', min(4, multiprocessing.cpu_count() * 2 + 1)))
threads = int(os.getenv('WEB_THREADS', '8'))
if threads <= max(1, int(os.getenv('OLLAMA_MAX_CONCURRENTES', '2'))):
    raise RuntimeError('WEB_THREADS debe superar OLLAMA_MAX_CONCURRENTES para dejar capacidad disponible')
timeout = 210
graceful_timeout = 30
keepalive = 5
max_requests = 2000
max_requests_jitter = 200
limit_request_line = 4094
limit_request_fields = 100
limit_request_field_size = 8190
accesslog = '-'
errorlog = '-'
preload_app = False
