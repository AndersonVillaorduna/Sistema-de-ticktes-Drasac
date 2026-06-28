import os
from app import create_app, db
from app.models.usuario import Usuario
from app.models.categoria import Categoria
from app.models.tecnico_categoria import TecnicoCategoria
from app.models.base_conocimiento import BaseConocimiento
from app.models.inventario import Inventario
from app.models.ticket import Ticket
from datetime import datetime, timedelta

def seed_database():
    print("Iniciando la población de la base de datos...")
    
    # 1. Crear categorías por defecto
    categorias_defecto = [
        {"nombre": "Red/Módem", "descripcion": "Problemas de conexión a internet, Wi-Fi, routers o módems corporativos"},
        {"nombre": "Impresoras", "descripcion": "Fallas de impresión, atascos de papel, recambio de tóner o configuración"},
        {"nombre": "Hardware", "descripcion": "Problemas con laptops, PCs, pantallas, teclados, componentes físicos o cargadores"},
        {"nombre": "Software", "descripcion": "Errores de sistemas internos (Drasac App), Office, Windows u otras aplicaciones"},
        {"nombre": "Accesos", "descripcion": "Restablecimiento de contraseñas, desbloqueo de usuarios, accesos a carpetas compartidas"}
    ]
    
    categorias_db = {}
    for cat_data in categorias_defecto:
        cat = Categoria.query.filter_by(nombre=cat_data["nombre"]).first()
        if not cat:
            cat = Categoria(nombre=cat_data["nombre"], descripcion=cat_data["descripcion"])
            db.session.add(cat)
            db.session.commit()
            print(f"Categoría creada: {cat.nombre}")
        categorias_db[cat_data["nombre"]] = cat

    # 2. Crear usuarios (Admin, Técnicos, Usuarios, IA)
    usuarios_defecto = [
        {"nombre": "Administrador Principal", "email": "admin@drasac.com", "password": "admin123", "rol": "admin", "tienda_area": "Sistemas Central"},
        {"nombre": "Técnico Redes (Técnico A)", "email": "tecnico_redes@drasac.com", "password": "tecnico123", "rol": "tecnico", "tienda_area": "Soporte Nivel 2"},
        {"nombre": "Técnico Impresoras (Técnico B)", "email": "tecnico_impresoras@drasac.com", "password": "tecnico123", "rol": "tecnico", "tienda_area": "Soporte Nivel 1"},
        {"nombre": "Técnico General (Técnico C)", "email": "tecnico_general@drasac.com", "password": "tecnico123", "rol": "tecnico", "tienda_area": "Soporte Nivel 1"},
        {"nombre": "Tienda Sur - Cajero", "email": "tienda_sur@drasac.com", "password": "usuario123", "rol": "usuario", "tienda_area": "Tienda Sur (Mall)"},
        {"nombre": "Tienda Norte - Administrador", "email": "tienda_norte@drasac.com", "password": "usuario123", "rol": "usuario", "tienda_area": "Tienda Norte (Avenida)"},
        {"nombre": "Inteligencia Artificial Drasac", "email": "ia@drasac.com", "password": "iapassword123", "rol": "admin", "tienda_area": "Servicio de Clasificación Automática"}
    ]

    usuarios_db = {}
    for user_data in usuarios_defecto:
        user = Usuario.query.filter_by(email=user_data["email"]).first()
        if not user:
            user = Usuario(
                nombre=user_data["nombre"],
                email=user_data["email"],
                rol=user_data["rol"],
                tienda_area=user_data["tienda_area"]
            )
            user.set_password(user_data["password"])
            db.session.add(user)
            db.session.commit()
            print(f"Usuario creado: {user.nombre} ({user.rol})")
        usuarios_db[user_data["email"]] = user

    # 3. Asignar técnicos a categorías en la tabla intermedia (tecnicos_categorias)
    asignaciones_tecnicos = [
        ("tecnico_redes@drasac.com", "Red/Módem"),
        ("tecnico_impresoras@drasac.com", "Impresoras"),
        ("tecnico_general@drasac.com", "Hardware"),
        ("tecnico_general@drasac.com", "Software"),
        ("tecnico_general@drasac.com", "Accesos")
    ]

    for email, cat_name in asignaciones_tecnicos:
        tec = usuarios_db[email]
        cat = categorias_db[cat_name]
        
        rel = TecnicoCategoria.query.filter_by(tecnico_id=tec.id, categoria_id=cat.id).first()
        if not rel:
            rel = TecnicoCategoria(tecnico_id=tec.id, categoria_id=cat.id)
            db.session.add(rel)
            db.session.commit()
            print(f"Asignado técnico {tec.nombre} a categoría {cat.nombre}")

    # 4. Poblar base de conocimiento (11 casos comunes)
    conocimientos = [
        {
            "categoria": "Red/Módem",
            "problema_tipo": "No hay conexión a internet / módem apagado",
            "solucion": "Reinicie el módem principal apagándolo durante 30 segundos. Verifique si la luz 'WAN' o 'Internet' está verde. Si está roja o naranja, revise la conexión del cable de fibra/coaxial en la parte trasera del módem.",
            "palabras_clave": "internet,conexion,conexión,wifi,wi-fi,módem,modem,luz roja,sin red,caido,cable"
        },
        {
            "categoria": "Red/Módem",
            "problema_tipo": "Red lenta o intermitencia",
            "solucion": "Verifique si hay descargas masivas o streaming en la red de la tienda. Si está conectado por Wi-Fi, intente conectarse temporalmente mediante cable Ethernet para verificar si la señal Wi-Fi es inestable.",
            "palabras_clave": "lento,lentitud,intermitencia,se corta,cargando,lenta"
        },
        {
            "categoria": "Impresoras",
            "problema_tipo": "Impresora no imprime",
            "solucion": "Verifique que la impresora esté encendida, conectada por cable USB/Red y que no tenga papel atascado en la bandeja trasera. Si continúa parpadeando la luz naranja, abra y vuelva a cerrar la cubierta del tóner.",
            "palabras_clave": "impresora,imprimir,hoja,atascado,no imprime,cola,impresion,impresión"
        },
        {
            "categoria": "Impresoras",
            "problema_tipo": "Reemplazar cartucho de tóner vacío",
            "solucion": "Abra la tapa frontal de la impresora, retire el cartucho de tóner agotado tirando firmemente de la manija verde. Desembale el nuevo tóner, agítelo lateralmente 5 veces para distribuir el polvo y deslícelo hasta escuchar un clic.",
            "palabras_clave": "toner,tóner,impresora,tinta,reemplazar,vacio,vacío,cambiar"
        },
        {
            "categoria": "Hardware",
            "problema_tipo": "Pantalla negra en laptop",
            "solucion": "Mantenga presionado el botón de encendido por 15 segundos para forzar un reinicio de hardware. Conecte el cargador y verifique si el indicador de carga enciende, si no, cambie de enchufe.",
            "palabras_clave": "pantalla,monitor,negra,encender,portatil,laptop,no prende,no enciende"
        },
        {
            "categoria": "Hardware",
            "problema_tipo": "Teclado o mouse no responde",
            "solucion": "Desconecte el cable USB del teclado/mouse y conéctelo en otro puerto de la computadora. Si es inalámbrico, reemplace las baterías AA/AAA y presione el botón de sincronización en el receptor USB.",
            "palabras_clave": "teclado,escribir,teclas,teclado usb,mouse,raton,ratón,puerto usb"
        },
        {
            "categoria": "Software",
            "problema_tipo": "Error o congelamiento en Microsoft Excel",
            "solucion": "Cierre todas las ventanas de Excel. Abra el Administrador de Tareas (Ctrl+Shift+Esc), finalice el proceso 'EXCEL.EXE'. Vuelva a abrir la aplicación. Si el problema persiste, intente iniciar Excel en modo seguro manteniendo presionada la tecla Ctrl al abrirlo.",
            "palabras_clave": "excel,office,microsoft,hoja calculo,congelado,se traba,error"
        },
        {
            "categoria": "Software",
            "problema_tipo": "Drasac App (sistema de ventas) se cierra sola",
            "solucion": "Reinicie su navegador web e intente borrar la caché y las cookies presionando Ctrl + Shift + Delete. Asegúrese de estar utilizando Google Chrome actualizado. Si persiste, reinicie el equipo.",
            "palabras_clave": "drasac,app,sistema,congela,se cae,cierra,error sistema"
        },
        {
            "categoria": "Accesos",
            "problema_tipo": "Desbloqueo de usuario en Active Directory",
            "solucion": "La cuenta del sistema se desbloquea automáticamente después de 15 minutos por políticas de seguridad. Si requiere acceso urgente, comuníquese con el administrador para el desbloqueo manual inmediato.",
            "palabras_clave": "desbloquear,cuenta,usuario,bloqueada,active directory,ad,bloqueo"
        },
        {
            "categoria": "Accesos",
            "problema_tipo": "Restablecer contraseña del correo corporativo",
            "solucion": "Ingrese al portal de autogestión de Microsoft (passwordreset.microsoftonline.com), ingrese su correo y complete el segundo factor de autenticación enviado a su teléfono registrado para crear una nueva clave.",
            "palabras_clave": "contraseña,contrasea,clave,correo,outlook,restablecer,cambiar,olvido"
        }
    ]

    for bc_data in conocimientos:
        cat = categorias_db[bc_data["categoria"]]
        bc = BaseConocimiento.query.filter_by(problema_tipo=bc_data["problema_tipo"]).first()
        if not bc:
            bc = BaseConocimiento(
                categoria_id=cat.id,
                problema_tipo=bc_data["problema_tipo"],
                solucion=bc_data["solucion"],
                palabras_clave=bc_data["palabras_clave"]
            )
            db.session.add(bc)
            db.session.commit()
            print(f"Base conocimiento creada: {bc.problema_tipo}")

    # 5. Crear Equipos de Inventario de ejemplo
    equipos_inventario = [
        {"nombre_equipo": "Módem Principal Tienda Sur", "tipo": "Modem", "marca": "Huawei", "modelo": "HG8245H", "numero_serie": "HW12345678", "ubicacion_tienda": "Tienda Sur (Mall)", "estado": "activo", "anydesk_id": "987 654 321", "asignado_a": "Cajero Principal"},
        {"nombre_equipo": "Laptop Administración Norte", "tipo": "Laptop", "marca": "Lenovo", "modelo": "ThinkPad E14", "numero_serie": "LNV87654321", "ubicacion_tienda": "Tienda Norte (Avenida)", "estado": "activo", "anydesk_id": "123 456 789", "asignado_a": "Administrador Norte"},
        {"nombre_equipo": "Impresora Boletas Sur", "tipo": "Impresora", "marca": "Epson", "modelo": "L3210", "numero_serie": "EPS44332211", "ubicacion_tienda": "Tienda Sur (Mall)", "estado": "activo", "anydesk_id": "", "asignado_a": "Cajero 1"},
        {"nombre_equipo": "PC Caja Norte 1", "tipo": "PC", "marca": "HP", "modelo": "ProDesk 400", "numero_serie": "HP99887766", "ubicacion_tienda": "Tienda Norte (Avenida)", "estado": "mantenimiento", "anydesk_id": "555 666 777", "asignado_a": "Cajero Auxiliar"}
    ]

    for eq_data in equipos_inventario:
        eq = Inventario.query.filter_by(numero_serie=eq_data["numero_serie"]).first()
        if not eq:
            eq = Inventario(
                nombre_equipo=eq_data["nombre_equipo"],
                tipo=eq_data["tipo"],
                marca=eq_data["marca"],
                modelo=eq_data["modelo"],
                numero_serie=eq_data["numero_serie"],
                ubicacion_tienda=eq_data["ubicacion_tienda"],
                estado=eq_data["estado"],
                anydesk_id=eq_data["anydesk_id"],
                asignado_a=eq_data["asignado_a"],
                fecha_adquisicion=datetime.utcnow() - timedelta(days=120)
            )
            db.session.add(eq)
            db.session.commit()
            print(f"Equipo creado en inventario: {eq.nombre_equipo} ({eq.numero_serie})")

    # 6. Crear un ticket de muestra (resuelto y otro abierto)
    user_sur = usuarios_db["tienda_sur@drasac.com"]
    tec_red = usuarios_db["tecnico_redes@drasac.com"]
    cat_red = categorias_db["Red/Módem"]
    
    t_antiguo = Ticket.query.filter_by(titulo="Caída de Wi-Fi en el área de cajas").first()
    if not t_antiguo:
        t_antiguo = Ticket(
            usuario_id=user_sur.id,
            categoria_id=cat_red.id,
            tecnico_id=tec_red.id,
            titulo="Caída de Wi-Fi en el área de cajas",
            descripcion="El Wi-Fi se desconecta constantemente e interrumpe las transacciones de pago.",
            estado="cerrado",
            prioridad="alta",
            clasificado_por_ia=True,
            respuesta_ia="Reinicio del punto de acceso principal desde la consola remota.",
            created_at=datetime.utcnow() - timedelta(days=2),
            resolved_at=datetime.utcnow() - timedelta(days=2)
        )
        db.session.add(t_antiguo)
        db.session.commit()
        print(f"Ticket antiguo creado: {t_antiguo.titulo}")

    print("Base de datos poblada exitosamente.")

if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        seed_database()
