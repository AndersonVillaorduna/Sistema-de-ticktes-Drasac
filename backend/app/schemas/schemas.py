from marshmallow import Schema, fields, validate

class UsuarioSchema(Schema):
    id = fields.Int(dump_only=True)
    nombre = fields.Str(required=True, validate=validate.Length(min=2, max=100))
    email = fields.Email(required=True)
    # Mínimo 8 caracteres, con al menos una letra y un número
    password = fields.Str(load_only=True, required=True, validate=[
        validate.Length(min=8, error="La contraseña debe tener al menos 8 caracteres."),
        validate.Regexp(r'^(?=.*[A-Za-z])(?=.*\d).+$', error="La contraseña debe incluir letras y números."),
    ])
    rol = fields.Str(validate=validate.OneOf(['admin', 'tecnico', 'usuario']))
    tienda_area = fields.Str(allow_none=True)
    created_at = fields.DateTime(dump_only=True)

class CategoriaSchema(Schema):
    id = fields.Int(dump_only=True)
    nombre = fields.Str(required=True, validate=validate.Length(min=2, max=100))
    descripcion = fields.Str(allow_none=True)

class ComentarioSchema(Schema):
    id = fields.Int(dump_only=True)
    ticket_id = fields.Int(required=True)
    usuario_id = fields.Int(dump_only=True)
    usuario_nombre = fields.Str(dump_only=True)
    usuario_rol = fields.Str(dump_only=True)
    mensaje = fields.Str(required=True, validate=validate.Length(min=1))
    created_at = fields.DateTime(dump_only=True)

class InventarioSchema(Schema):
    id = fields.Int(dump_only=True)
    nombre_equipo = fields.Str(required=True, validate=validate.Length(min=2, max=100))
    tipo = fields.Str(required=True, validate=validate.Length(min=2, max=50))
    marca = fields.Str(allow_none=True)
    modelo = fields.Str(allow_none=True)
    # Opcional: laptops y modems nuevos no llevan serie (se autogenera si falta)
    numero_serie = fields.Str(required=False, allow_none=True, validate=validate.Length(max=100))
    ubicacion_tienda = fields.Str(required=True, validate=validate.Length(min=2, max=100))
    estado = fields.Str(validate=validate.OneOf(['activo', 'mantenimiento', 'de_baja']))
    anydesk_id = fields.Str(allow_none=True)
    asignado_a = fields.Str(allow_none=True)
    fecha_adquisicion = fields.DateTime(allow_none=True)
    fecha_entrega = fields.Date(allow_none=True)
    imei_chip = fields.Str(allow_none=True, validate=validate.Length(max=30))
    windows_version = fields.Str(allow_none=True, validate=validate.Length(max=50))
    # load_only: se acepta al guardar pero JAMÁS se devuelve en listados
    # (la contraseña descifrada solo se entrega en el detalle GET /inventario/<id>)
    password = fields.Str(load_only=True, allow_none=True, validate=validate.Length(max=100))

class TicketSchema(Schema):
    id = fields.Int(dump_only=True)
    usuario_id = fields.Int(dump_only=True)
    usuario_nombre = fields.Str(dump_only=True)
    categoria_id = fields.Int(allow_none=True)
    categoria_nombre = fields.Str(dump_only=True)
    tecnico_id = fields.Int(allow_none=True)
    tecnico_nombre = fields.Str(dump_only=True)
    titulo = fields.Str(required=True, validate=validate.Length(min=3, max=255))
    descripcion = fields.Str(required=True, validate=validate.Length(min=5))
    estado = fields.Str(validate=validate.OneOf(['abierto', 'en proceso', 'resuelto por ia - pendiente', 'resuelto', 'cerrado']))
    prioridad = fields.Str(validate=validate.OneOf(['baja', 'media', 'alta']))
    clasificado_por_ia = fields.Bool(dump_only=True)
    respuesta_ia = fields.Str(dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
    resolved_at = fields.DateTime(dump_only=True)
    equipos_ids = fields.List(fields.Int(), load_only=True)
    equipos = fields.List(fields.Nested(InventarioSchema), dump_only=True)
