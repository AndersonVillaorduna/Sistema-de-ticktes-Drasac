import os
import json
import requests
from app.models.categoria import Categoria
from app.models.base_conocimiento import BaseConocimiento
from app import db

# Obtener URL y modelo de Ollama
OLLAMA_API_URL = os.getenv('OLLAMA_API_URL', 'http://localhost:11434')
OLLAMA_MODEL = os.getenv('OLLAMA_MODEL', 'llama3.1:8b')

def clasificar_y_resolver_ticket(titulo, descripcion):
    """
    Se comunica con la API de Ollama para clasificar el ticket y ver si es un caso conocido.
    Devuelve un diccionario con:
    {
      "categoria": str,
      "prioridad": str,  # 'baja', 'media', 'alta'
      "confianza": float, # 0.0 a 1.0
      "es_caso_conocido": bool,
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

    # 2. Construir prompt detallado
    prompt = f"""
Clasifica el siguiente reporte de soporte de TI de la empresa DRASAC.
Debes elegir estrictamente una categoría de la siguiente lista: {', '.join(lista_categorias)}.
Debes determinar la prioridad ('baja', 'media', 'alta') y la confianza en tu clasificación (de 0.0 a 1.0).
Determina si es un caso común conocido (como impresoras atascadas, cambiar contraseñas, reiniciar módem, etc.) y propón una solución corta y directa.

Ticket:
Título: {titulo}
Descripción: {descripcion}

REGLA CRÍTICA: Responde ÚNICAMENTE en formato JSON plano sin bloques de código Markdown (no uses ```json ni ```).
Tu respuesta debe lucir exactamente así:
{{
  "categoria": "Red/Módem",
  "prioridad": "alta",
  "confianza": 0.95,
  "es_caso_conocido": true,
  "respuesta_sugerida": "Reinicie el módem por 30 segundos, si persiste reconecte el cable de red gris en el puerto WAN."
}}
"""
    
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.1  # Baja temperatura para respuestas más predecibles
        }
    }

    try:
        # Petición a Ollama
        response = requests.post(
            f"{OLLAMA_API_URL}/api/generate",
            json=payload,
            timeout=10  # Timeout corto para no bloquear la aplicación
        )
        
        if response.status_code == 200:
            res_data = response.json()
            raw_text = res_data.get('response', '').strip()
            
            # Limpiar posibles bloques de código de markdown si la IA los puso
            if raw_text.startswith("```json"):
                raw_text = raw_text.split("```json")[1]
            if raw_text.endswith("```"):
                raw_text = raw_text.rsplit("```", 1)[0]
            raw_text = raw_text.strip()
            
            # Parsear JSON
            data = json.loads(raw_text)
            
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
                
            return {
                "categoria": data.get('categoria'),
                "prioridad": data.get('prioridad', 'media').lower(),
                "confianza": float(data.get('confianza', 0.5)),
                "es_caso_conocido": bool(data.get('es_caso_conocido', False)),
                "respuesta_sugerida": data.get('respuesta_sugerida')
            }
    except Exception as e:
        print(f"Error al conectar con Ollama o procesar respuesta: {str(e)}")
        return None

    return None


def buscar_solucion_en_base_de_conocimiento(categoria_id, titulo, descripcion):
    """
    Busca soluciones registradas en la base de conocimiento para la categoría especificada.
    Hace una búsqueda por palabras clave.
    """
    try:
        casos = BaseConocimiento.query.filter_by(categoria_id=categoria_id).all()
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
