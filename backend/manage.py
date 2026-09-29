"""Explicit operations for production accounts and encrypted data."""
import argparse
import getpass
import secrets
from app import create_app, db
from app.models.usuario import Usuario
from app.schemas.schemas import UsuarioSchema


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('command', choices=['bootstrap-admin', 'set-password', 'migrate-credentials', 'backup', 'check'])
    parser.add_argument('--email')
    parser.add_argument('--name', default='Administrador')
    args = parser.parse_args()
    app = create_app()
    with app.app_context():
        if args.command in ('bootstrap-admin', 'set-password'):
            if not args.email:
                parser.error('--email es obligatorio')
            email = args.email.strip().lower()
            if email == 'ia@drasac.com':
                parser.error('La cuenta del sistema no puede iniciar sesión')
            user = Usuario.query.filter_by(email=email).first()
            if args.command == 'set-password' and not user:
                parser.error('El usuario no existe')
            if args.command == 'bootstrap-admin' and user:
                parser.error('El usuario ya existe; usa set-password')
            password = getpass.getpass('Nueva contraseña: ')
            if password != getpass.getpass('Repite la contraseña: '):
                parser.error('Las contraseñas no coinciden')
            data = {'nombre': args.name, 'email': email, 'password': password}
            errors = UsuarioSchema().validate(data)
            if errors or len(password.encode()) > 72:
                parser.error('La contraseña debe tener letras y números, al menos 8 caracteres y como máximo 72 bytes; verifica también el correo')
            if not user:
                user = Usuario(nombre=args.name, email=email, rol='admin', activo=True)
                db.session.add(user)
            user.set_password(password)
            if args.command == 'bootstrap-admin' and not Usuario.query.filter_by(email='ia@drasac.com').first():
                system = Usuario(nombre='Inteligencia Artificial Drasac', email='ia@drasac.com', rol='sistema', activo=False)
                system.set_password(secrets.token_urlsafe(32))
                db.session.add(system)
            db.session.commit()
            print('Credencial guardada; las sesiones anteriores quedan revocadas')
        elif args.command == 'migrate-credentials':
            from app.services.crypto import migrar_credenciales
            migrar_credenciales()
            print('Credenciales migradas')
        elif args.command == 'backup':
            from backup_db import snapshot
            print(snapshot())
        else:
            db.session.execute(db.text('SELECT 1'))
            if db.engine.dialect.name == 'sqlite':
                print('Integridad: ' + str(db.session.execute(db.text('PRAGMA integrity_check')).scalar()))
                violations = db.session.execute(db.text('PRAGMA foreign_key_check')).all()
                if violations:
                    raise RuntimeError('Hay referencias inválidas; restaurar o reparar antes de continuar')
            print('Base de datos y migraciones verificadas')


if __name__ == '__main__':
    main()
