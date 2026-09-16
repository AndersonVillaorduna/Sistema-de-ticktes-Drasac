import re

def clasificador_heuristico(titulo, descripcion):
    """
    Clasificador heurístico basado en palabras clave para actuar como fallback de Ollama.
    Retorna un diccionario estructurado similar al de la IA.
    """
    texto = (titulo + " " + descripcion).lower()

    reglas = {
        "Red/Módem": [r"modem", r"módem", r"router", r"wifi", r"wi-fi", r"internet", r"conexion", r"conexión", r"enlace", r"cable de red"],
        "Impresoras": [r"impresora", r"imprimir", r"toner", r"tóner", r"papel", r"atascad", r"hoja", r"multifuncional"],
        "Hardware": [r"laptop", r"computadora", r"teclado", r"mouse", r"monitor", r"pantalla", r"disco", r"memoria", r"no enciende", r"cargador", r"auricular"],
        "Software": [r"sistema", r"excel", r"windows", r"programa", r"drasac app", r"error", r"word", r"aplicación", r"navegador"],
        "Accesos": [r"contraseña", r"clave", r"cuenta", r"correo", r"acceso", r"login", r"desbloquear", r"permiso", r"credenciales"],
    }

    coincidencias = {}
    for categoria, palabras in reglas.items():
        coincidencias[categoria] = sum(len(re.findall(p, texto)) for p in palabras)

    max_categoria = max(coincidencias, key=coincidencias.get)
    if coincidencias[max_categoria] == 0:
        max_categoria = "Software"

    return {
        "categoria": max_categoria,
        "confianza": 0.50,
        "es_caso_conocido": False,
        "respuesta_sugerida": None,
    }
