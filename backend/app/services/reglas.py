"""Conservative confirmation detection for the existing guided chat."""
import re
import unicodedata


def normalizar(texto):
    return ''.join(c for c in unicodedata.normalize('NFKD', texto.lower()) if not unicodedata.combining(c))


def detectar_intencion(texto):
    t = normalizar(texto or '').strip()
    # Negation takes precedence over thanks, success words and isolated "sí".
    negativas = (
        r'\bno\b', r'\btampoco\b', r'\bsigue(?:\s+\w+){0,3}\s+(?:igual|error|problema|fallando|negro|roja)\b',
        r'\b(?:todavia|aun)\s+no\b', r'\bpeor\b', r'\b(?:sale|tira)\s+(?:un\s+)?error\b',
    )
    if any(re.search(p, t) for p in negativas):
        return 'negacion'
    if re.fullmatch(r'(?:si|sip|ok|okey|claro|correcto|correcta|afirmativo|agree)[.!\s]*', t):
        return 'confirmacion'
    positivas = (
        r'\bya\s+funciona\b', r'\bfunciono\b', r'\bse\s+(?:soluciono|arreglo)\b',
        r'\b(?:solucionado|resuelto)\b', r'\bquedo\s+bien\b', r'\bsirvio\b',
        r'\b(?:si\s+)?me\s+ayudo\b', r'\bya\s+(?:lo\s+)?(?:hice|hize|realice|termine|acabe)\b',
        r'\blo\s+hice\b', r'\b(?:completado|hecho)\b', r'\bsiguiente\s+paso\b',
    )
    if any(re.search(p, t) for p in positivas):
        return 'confirmacion'
    return 'neutro'
