"""Reglas de palabras clave centralizadas del sistema:
- Detección de la intención de la tienda en el flujo guiado de pasos.
"""
import re

# Orden de evaluación: éxito claro > queja/fracaso > sí/no suelto > acción hecha.
# La queja manda sobre el "ya lo hice" (ej: "ya lo hice pero sigue sin imprimir").
_FRASES_EXITO = [
    'ya funciona', 'funciono', 'funcionó', 'se soluciono', 'se solucionó', 'solucionado',
    'se arreglo', 'se arregló', 'ya no sale', 'ya no aparece', 'perfecto', 'excelente',
    'gracias', 'quedo bien', 'sirvio', 'sirvió', 'quedo resuelto', 'esta resuelto',
    'ya resuelto', 'resuelto', 'si me ayudo', 'sí me ayudó', 'me ayudo', 'me ayudó',
    'asi es', 'así es', 'exacto', 'es la correcta', 'es correcto', 'es correcta',
    'muy bien', 'genial',
]
_FRASES_NEGACION = [
    'no funciona', 'no funciono', 'no funcionó', 'sigue igual', 'sigue sin', 'sigue el error',
    'sigue el problema', 'sigue fallando', 'sigue sin funcionar', 'no se soluciona',
    'no se solucino', 'no se solucionó', 'sale error', 'sale un error', 'tira error',
    'no aparece', 'no puedo', 'no resulta', 'tampoco', 'peor', 'sigue en negro',
    'sigue apagada', 'sigue roja', 'no carga', 'no imprime',
    'todavia no', 'todavía no', 'aun no', 'aún no', 'no lo hice', 'no lo he hecho',
    'no sirve', 'no sirvio', 'no sirvió', 'no me ayudo', 'no me ayudó',
    'no se si', 'no sé si', 'no estoy seguro', 'no es la correcta', 'no es correcto',
]
_FRASES_ACCION = [
    'ya lo hice', 'ya lo hize', 'ya hice', 'lo hice', 'ya lo realice', 'ya realice',
    'ya quedo', 'ya quedó', 'continuo', 'continuar', 'ya termine', 'ya terminé',
    'ya acabe', 'ya acabé', 'completado', 'siguiente paso', 'ya lo hago', 'hecho',
]

# Palabras sueltas con límite de palabra: un "Sí" o "Ok" solo también avanza
# el flujo, y un "No" solo también cuenta como negación.
_RE_SI = re.compile(r'\b(si|sí|sip|ok|okey|claro|correcto|correcta|afirmativo|agree)\b')
_RE_NO = re.compile(r'\bno\b')

def detectar_intencion(texto):
    """'confirmacion' | 'negacion' | 'neutro' según el mensaje de la tienda."""
    t = (texto or '').lower()
    for f in _FRASES_EXITO:
        if f in t:
            return 'confirmacion'
    for f in _FRASES_NEGACION:
        if f in t:
            return 'negacion'
    if _RE_SI.search(t):
        return 'confirmacion'
    if _RE_NO.search(t):
        return 'negacion'
    for f in _FRASES_ACCION:
        if f in t:
            return 'confirmacion'
    return 'neutro'
