import os
import sys
import json
import requests
from dotenv import load_dotenv

# Cargar variables de entorno del backend
backend_dir = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(backend_dir, '.env'))

OLLAMA_API_URL = os.getenv('OLLAMA_API_URL', 'http://localhost:11434')
OLLAMA_MODEL = os.getenv('OLLAMA_MODEL', 'llama3.1:8b')

def test_ollama_integration():
    print(f"Probando comunicación con Ollama...")
    print(f"URL: {OLLAMA_API_URL}")
    print(f"Modelo: {OLLAMA_MODEL}")

    # Verificar si el servicio está activo
    try:
        ver_resp = requests.get(OLLAMA_API_URL, timeout=3)
        print(f"Estado del servicio Ollama: Activo (Status: {ver_resp.status_code})")
    except Exception as e:
        print(f"ERROR: No se pudo conectar con Ollama en {OLLAMA_API_URL}. ¿Está encendido el servicio?")
        print(f"Detalle del error: {str(e)}")
        sys.exit(1)

    # Caso de prueba
    titulo = "El módem de la tienda del sur se reinicia constantemente"
    descripcion = "Cada 5 minutos la luz de internet se apaga y se vuelve a encender de color rojo, perdiendo conexión en cajas."
    
    lista_categorias = ["Red/Módem", "Impresoras", "Hardware", "Software", "Accesos"]

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
            "temperature": 0.1
        }
    }

    print("\nEnviando prompt a Ollama...")
    try:
        # Incrementar timeout a 90 segundos para dar tiempo a que cargue el modelo localmente
        response = requests.post(f"{OLLAMA_API_URL}/api/generate", json=payload, timeout=90)
        if response.status_code == 200:
            res_data = response.json()
            raw_text = res_data.get('response', '').strip()
            print("\nRespuesta cruda de Ollama:")
            print(raw_text)

            # Limpiar markdown si existiera
            if raw_text.startswith("```json"):
                raw_text = raw_text.split("```json")[1]
            if raw_text.endswith("```"):
                raw_text = raw_text.rsplit("```", 1)[0]
            raw_text = raw_text.strip()

            print("\nParseando JSON de respuesta...")
            parsed = json.loads(raw_text)
            
            # Validar campos esperados
            required_fields = ["categoria", "prioridad", "confianza", "es_caso_conocido", "respuesta_sugerida"]
            missing = [f for f in required_fields if f not in parsed]
            
            if missing:
                print(f"[FAIL] FALLO DE VALIDACION: Faltan los campos: {', '.join(missing)}")
            else:
                print("[OK] VALIDACION EXITOSA. Estructura de JSON correcta:")
                print(json.dumps(parsed, indent=2, ensure_ascii=False))
                
                # Validar categoría
                if parsed['categoria'] in lista_categorias:
                    print(f"[OK] Categoria clasificada correctamente: {parsed['categoria']}")
                else:
                    print(f"[WARN] Alerta: Categoria devuelta '{parsed['categoria']}' no esta en la lista permitida.")
        else:
            print(f"[FAIL] Error al consultar Ollama. Status: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"[FAIL] Ocurrio un error inesperado durante el test: {str(e)}")

if __name__ == "__main__":
    test_ollama_integration()
