import os
from app import create_app

app = create_app()

if __name__ == '__main__':
    # debug solo en desarrollo; en producción usar gunicorn detrás de nginx
    debug = os.getenv('FLASK_DEBUG', '1' if os.getenv('FLASK_ENV') != 'production' else '0') == '1'
    if os.getenv('FLASK_ENV') == 'production' and debug:
        raise RuntimeError(
            "debug=True está prohibido en producción: el debugger de Werkzeug "
            "permite ejecución remota de código. Usa gunicorn (ver README)."
        )
    app.run(host='0.0.0.0', port=5000, debug=debug)
