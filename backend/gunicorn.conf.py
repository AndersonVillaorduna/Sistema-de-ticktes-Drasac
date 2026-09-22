"""Configuración de gunicorn para producción en el VPS (Linux).

Ejecutar con:
    gunicorn -c gunicorn.conf.py "app:create_app()"

Dimensionado para 200+ usuarios concurrentes:
- 4 workers: cada uno es un proceso independiente que atiende peticiones en
  paralelo (regla base: (2 x CPUs) + 1; en un VPS de 2-4 vCPU esto cubre el
  tráfico de DRASAC con margen).
- 2 hilos por worker para las esperas de I/O (Ollama, base de datos, disco).
"""
import multiprocessing
import os

bind = f"127.0.0.1:{os.getenv('PORT', '5000')}"
workers = int(os.getenv('WEB_CONCURRENCY', multiprocessing.cpu_count() * 2 + 1))
threads = 2
timeout = 180        # las llamadas a Ollama pueden tardar; no matarlas a medio proceso
graceful_timeout = 30
keepalive = 5
max_requests = 2000          # recicla workers periódicamente (evita fugas de memoria)
max_requests_jitter = 200
accesslog = '-'              # access log a stdout (lo recoge journald/nginx)
errorlog = '-'
preload_app = False          # cada worker carga su app (mejor con Ollama en el mismo host)
