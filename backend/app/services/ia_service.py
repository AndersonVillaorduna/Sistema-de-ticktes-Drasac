import os
import json
import requests
from app.models.categoria import Categoria
from app.models.base_conocimiento import BaseConocimiento
from app import db

# Obtener URL y modelo de Ollama
OLLAMA_API_URL = os.getenv('OLLAMA_API_URL', 'http://localhost:11434')
OLLAMA_MODEL = os.getenv('OLLAMA_MODEL', 'llama3.1:8b')
# Límite de hilos de CPU para Ollama (0 = sin límite). Útil en la PC de desarrollo
# para que la generación no sature todos los núcleos mientras se usa la app.
try:
    OLLAMA_NUM_THREAD = int(os.getenv('OLLAMA_NUM_THREAD', '0') or 0)
except ValueError:
    OLLAMA_NUM_THREAD = 0

def _opciones_ia(temperature=0.1):
    opts = {"temperature": temperature}
    if OLLAMA_NUM_THREAD > 0:
        opts["num_thread"] = OLLAMA_NUM_THREAD
    return opts

def _extraer_json(texto):
    """Extrae el primer objeto JSON válido de una respuesta de la IA."""
    texto = texto.strip()
    if texto.startswith("```"):
        texto = texto.split("```")[1] if "```" in texto else texto
        if texto.startswith("json"):
            texto = texto[4:]
        texto = texto.strip()
    inicio = texto.find('{')
    fin = texto.rfind('}')
    if inicio == -1 or fin == -1:
        raise ValueError("No se encontró JSON en la respuesta")
    return json.loads(texto[inicio:fin + 1])


def clasificar_y_resolver_ticket(titulo, descripcion):
    """
    Se comunica con la API de Ollama para clasificar el ticket y ver si es un caso conocido.
    La IA recibe los artículos del centro de conocimiento y decide si el ticket coincide
    con alguno de ellos. Devuelve un diccionario con:
    {
      "categoria": str,
      "prioridad": str,  # 'baja', 'media', 'alta'
      "confianza": float, # 0.0 a 1.0
      "es_caso_conocido": bool,
      "articulo_id": int or None,   # id del artículo del centro de conocimiento que coincide
      "respuesta_sugerida": str or None
    }
    """
    # 1. Obtener las categorías de la base de datos para incluirlas en el prompt
    try:
        categorias = Categoria.query.all()
        lista_categorias = [c.nombre for c in categorias]
        if not lista_categorias:
            lista_categorias = ["Red/Módem", "Impresoras", "Hardware", "Software", "Accesos"]
    except Exception:
        lista_categorias = ["Red/Módem", "Impresoras", "Hardware", "Software", "Accesos"]

    # 2. Obtener los artículos del centro de conocimiento para que la IA los evalúe
    articulos = []
    try:
        for caso in BaseConocimiento.query.all():
            articulos.append({
                "id": caso.id,
                "categoria": caso.categoria.nombre if caso.categoria else "Sin categoría",
                "problema": caso.problema_tipo,
                "palabras_clave": caso.palabras_clave,
                "solucion": caso.solucion,
            })
    except Exception as e:
        print(f"Aviso: no se pudieron cargar artículos de la base de conocimiento: {e}")

    articulos_texto = ""
    if articulos:
        lineas = [
            f'- ID {a["id"]} [{a["categoria"]}] {a["problema"]} (palabras clave: {a["palabras_clave"]}). Solución registrada: {a["solucion"]}'
            for a in articulos
        ]
        articulos_texto = (
            "\nARTÍCULOS DEL CENTRO DE CONOCIMIENTO:\n" + "\n".join(lineas) +
            "\nREGLAS PARA LOS ARTÍCULOS:\n"
            "- Marca \"es_caso_conocido\": true SÓLO si el problema del ticket es ESENCIALMENTE EL MISMO que describe un artículo "
            "(mismo dispositivo y misma falla). Usa ese \"articulo_id\" y en \"respuesta_sugerida\" escribe la solución del artículo.\n"
            "- Si el problema es DIFERENTE, es otro dispositivo, o solo se parece parcialmente, pon "
            "\"es_caso_conocido\": false, \"articulo_id\": null y \"respuesta_sugerida\": null. "
            "NO inventes soluciones y NO elijas un artículo 'parecido por error': ante la duda, false.\n"
        )
    else:
        articulos_texto = (
            "\nNo hay artículos en el centro de conocimiento. "
            "Pon \"es_caso_conocido\": false, \"articulo_id\": null y \"respuesta_sugerida\": null.\n"
        )

    # 3. Construir prompt detallado
    prompt = f"""Clasifica el siguiente reporte de soporte de TI de la empresa DRASAC.
Debes elegir estrictamente una categoría de la siguiente lista: {', '.join(lista_categorias)}.
Debes determinar la confianza en tu clasificación (de 0.0 a 1.0).
{articulos_texto}
Ticket:
Título: {titulo}
Descripción: {descripcion}

REGLA CRÍTICA: Responde ÚNICAMENTE en formato JSON plano sin bloques de código Markdown (no uses ```json ni ```).
Tu respuesta debe lucir exactamente así:
{{
  "categoria": "Red/Módem",
  "confianza": 0.95,
  "es_caso_conocido": true,
  "articulo_id": 3,
  "respuesta_sugerida": "Reinicie el módem por 30 segundos, si persiste reconecte el cable de red gris en el puerto WAN."
}}
"""

    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": _opciones_ia(0.1)
    }

    try:
        # Petición a Ollama
        response = requests.post(
            f"{OLLAMA_API_URL}/api/generate",
            json=payload,
            timeout=120
        )

        if response.status_code == 200:
            res_data = response.json()
            raw_text = res_data.get('response', '').strip()

            # Parsear JSON (con limpieza de posibles bloques de código markdown)
            data = _extraer_json(raw_text)

            # Validar que los campos requeridos estén en la respuesta y la categoría sea válida
            categoria_ia = data.get('categoria')
            # Validar contra lista real
            categoria_valida = None
            for cat in lista_categorias:
                if cat.lower() == str(categoria_ia).lower():
                    categoria_valida = cat
                    break

            if categoria_valida:
                data['categoria'] = categoria_valida
            else:
                # Si no clasifica en una categoría válida, devolvemos None para que use la heurística
                return None

            articulo_id = data.get('articulo_id')
            try:
                articulo_id = int(articulo_id) if articulo_id is not None else None
            except (TypeError, ValueError):
                articulo_id = None

            return {
                "categoria": data.get('categoria'),
                "confianza": float(data.get('confianza', 0.5)),
                "es_caso_conocido": bool(data.get('es_caso_conocido', False)),
                "articulo_id": articulo_id,
                "respuesta_sugerida": data.get('respuesta_sugerida')
            }
    except Exception as e:
        print(f"Error al conectar con Ollama o procesar respuesta: {str(e)}")
        return None

    return None


def articulo_coincide_con_texto(articulo, texto):
    """True si alguna palabra clave del artículo aparece en el texto del ticket."""
    if not articulo:
        return False
    palabras = [p.strip().lower() for p in (articulo.palabras_clave or '').split(',') if p.strip()]
    return any(p in texto for p in palabras)


def buscar_solucion_en_base_de_conocimiento(categoria_id, titulo, descripcion):
    """
    Busca soluciones registradas en la base de conocimiento por palabras clave.
    Si categoria_id es None busca en todas las categorías (la IA a veces confunde
    la categoría pero el artículo correcto sí matchea).
    """
    try:
        query = BaseConocimiento.query
        if categoria_id:
            query = query.filter_by(categoria_id=categoria_id)
        casos = query.all()
        texto_busqueda = (titulo + " " + descripcion).lower()

        mejor_coincidencia = None
        max_palabras_coincidentes = 0

        for caso in casos:
            palabras = [p.strip().lower() for p in caso.palabras_clave.split(',') if p.strip()]
            coincidencias = sum(1 for p in palabras if p in texto_busqueda)

            if coincidencias > max_palabras_coincidentes and coincidencias > 0:
                max_palabras_coincidentes = coincidencias
                mejor_coincidencia = caso

        if mejor_coincidencia:
            return mejor_coincidencia.solucion
    except Exception as e:
        print(f"Error al buscar en base de conocimiento: {str(e)}")

    return None


def generar_informe_equipos(equipos, solo_antiguos=True):
    """
    Genera un informe en lenguaje natural sobre los equipos del inventario,
    enfocado en los más antiguos / que requieren renovación.
    Recibe una lista de dicts con: nombre, tipo, tienda, fecha_entrega, anios, estado.
    Devuelve el texto del informe, o None si Ollama no está disponible.
    """
    if not equipos:
        return None

    lineas = []
    for eq in equipos:
        antiguedad = f"{eq['anios']:.1f} años" if eq.get('anios') is not None else "sin fecha de entrega"
        fecha = eq.get('fecha_entrega') or '—'
        lineas.append(
            f"- {eq['nombre']} ({eq.get('tipo', 'N/D')}, {eq.get('marca') or 'sin marca'} "
            f"{eq.get('modelo') or ''}) · Ubicación: {eq.get('tienda', 'N/D')} · "
            f"Entrega: {fecha} · Antigüedad: {antiguedad} · Estado: {eq.get('estado', 'N/D')}"
        )

    enfasis = (
        "El informe debe PRIORIZAR los equipos con mayor antigüedad, agruparlos por nivel de "
        "riesgo (más de 4 años: cambiar; 3-4 años: revisar) y señalar en qué tienda se concentran."
        if solo_antiguos else
        "El informe debe dar una visión general del parque de equipos por tienda y tipo."
    )

    prompt = f"""Eres el asistente de TI de la empresa DRASAC. Un administrador te ha pedido un informe
sobre los equipos más antiguos del inventario de tecnología.
{enfasis}

Datos del inventario:
{chr(10).join(lineas)}

Escribe el informe en español, con este formato:
1. Un resumen ejecutivo de 2 o 3 frases.
2. Una sección "Prioridad de renovación" listando los equipos más antiguos (usa viñetas con el nombre del equipo, su antigüedad y su tienda).
3. Una sección "Observaciones" con recomendaciones breves (compras sugeridas, reubicar equipos, etc.).
IMPORTANTE: NO uses tablas ni Markdown (nada de |, ni **, ni #). Solo texto plano con viñetas que empiecen con "-". Sé concreto y no inventes equipos que no estén en los datos.
"""

    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": _opciones_ia(0.3)
    }

    try:
        response = requests.post(
            f"{OLLAMA_API_URL}/api/generate",
            json=payload,
            timeout=180
        )
        if response.status_code == 200:
            texto = response.json().get('response', '').strip()
            return texto or None
    except Exception as e:
        print(f"Error al generar informe de equipos con Ollama: {str(e)}")

    return None
