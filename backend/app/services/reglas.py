"""Reglas de palabras clave centralizadas del sistema:
- Detección de la intención de la tienda en el flujo guiado de pasos.
"""

# Orden de evaluación: éxito claro > queja/fracaso > acción hecha. La queja
# manda sobre el "ya lo hice" (ej: "ya lo hice pero sigue sin imprimir").
_FRASES_EXITO = [
    'ya funciona', 'funciono', 'funcionó', 'se soluciono', 'se solucionó', 'solucionado',
    'se arreglo', 'se arregló', 'ya no sale', 'ya no aparece', 'perfecto', 'excelente',
    'gracias', 'quedo bien', 'sirvio',
]
_FRASES_NEGACION = [
    'no funciona', 'no funciono', 'no funcionó', 'sigue igual', 'sigue sin', 'sigue el error',
    'sigue el problema', 'sigue fallando', 'sigue sin funcionar', 'no se soluciona',
    'no se solucino', 'no se solucionó', 'sale error', 'sale un error', 'tira error',
    'no aparece', 'no puedo', 'no resulta', 'tampoco', 'peor', 'sigue en negro',
    'sigue apagada', 'sigue roja', 'no carga', 'no imprime',
]
_FRASES_ACCION = [
    'ya lo hice', 'ya lo hize', 'ya hice', 'lo hice', 'ya lo realice', 'ya realice',
    'listo', 'ya esta', 'ya está', 'ya quedo', 'ya quedó', 'continuo', 'continuar',
    'siguiente paso', 'ya lo hago', 'hecho',
]

def detectar_intencion(texto):
    """'confirmacion' | 'negacion' | 'neutro' según el mensaje de la tienda."""
    t = (texto or '').lower()
    for f in _FRASES_EXITO:
        if f in t:
            return 'confirmacion'
    for f in _FRASES_NEGACION:
        if f in t:
            return 'negacion'
    for f in _FRASES_ACCION:
        if f in t:
            return 'confirmacion'
    return 'neutro'
