import re

def clasificador_heuristico(titulo, descripcion):
    """
    Clasificador heurístico basado en palabras clave para actuar como fallback de Ollama.
    Retorna un diccionario estructurado similar al de la IA.
    """
    texto = (titulo + " " + descripcion).lower()

    # Mapeo de categorías y sus palabras clave regex
    reglas = {
        "Red/Módem": [r"modem", r"mdem", r"módem", r"router", r"wifi", r"wi-fi", r"internet", r"red", r"conexion", r"conexin", r"conexión", r"enlace", r"cable de red", r"ip"],
        "Impresoras": [r"impresora", r"imprimir", r"toner", r"tner", r"tóner", r"papel", r"atascad", r"hoja", r"multifuncional"],
        "Hardware": [r"laptop", r"pc", r"computadora", r"teclado", r"mouse", r"monitor", r"pantalla", r"disco", r"memoria", r"ram", r"no enciende", r"cargador", r"auricular"],
        "Software": [r"sistema", r"excel", r"windows", r"programa", r"drasac app", r"error", r"word", r"aplicacin", r"aplicación", r"navegador", r"crush"],
        "Accesos": [r"usuario", r"contrasea", r"contraseña", r"clave", r"cuenta", r"correo", r"acceso", r"login", r"desbloquear", r"permiso", r"credenciales"]
    }

    # Determinar categoría por número de coincidencias
    coincidencias = {}
    for categoria, palabras in reglas.items():
        coincidencias[categoria] = 0
        for palabra in palabras:
            matches = re.findall(palabra, texto)
            coincidencias[categoria] += len(matches)

    # Buscar la categoría con más coincidencias
    max_categoria = max(coincidencias, key=coincidencias.get)
    
    # Si no hay ninguna coincidencia (todos son 0), usamos un valor por defecto
    if coincidencias[max_categoria] == 0:
        # Por defecto asignamos a Soporte General o Software
        max_categoria = "Software"

    # Determinar prioridad aproximada
    prioridad = "media"
    urgente_words = [r"urgente", r"bloqueado", r"no puedo trabajar", r"caido", r"cado", r"grave", r"importante"]
    for w in urgente_words:
        if re.search(w, texto):
            prioridad = "alta"
            break

    return {
        "categoria": max_categoria,
        "prioridad": prioridad,
        "confianza": 0.50,  # Confianza baja por ser heurística
        "es_caso_conocido": False,
        "respuesta_sugerida": None
    }
