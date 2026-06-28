# DRASAC 2026 - Sistema de Tickets de Soporte TI con IA e Inventario

Este proyecto es un sistema de gestión y resolución automatizada de incidencias de TI para la empresa **DRASAC**, que integra Inteligencia Artificial local para clasificar incidentes, sugerir soluciones para problemas conocidos y auto-asignar técnicos de acuerdo con la categoría. Además, cuenta con un módulo de control de inventario de equipos tecnológicos.

---

## 🛠️ Stack Tecnológico
* **Backend:** Flask, Flask-SQLAlchemy (ORM), Flask-JWT-Extended (Autenticación), Flask-CORS, Flask-Limiter, Marshmallow.
* **Frontend:** React (Vite), Tailwind CSS, Axios, Lucide React, React Router.
* **Base de Datos:** Soporte dual SQLite (Desarrollo) / MySQL (Producción) vía SQLAlchemy y configuración `.env`.
* **Motor IA:** Ollama corriendo localmente con el modelo `LLaMA 3.1 8B`.

---

## 🔒 Buenas Prácticas de Seguridad y Diseño
1. **Contraseñas Seguras:** Encriptadas en la base de datos con hash utilizando `bcrypt` y salts únicos.
2. **Acceso Seguro (JWT):** Todas las rutas de tickets, inventario y estadísticas exigen token Bearer JWT válido.
3. **Control de Roles:** Decoradores de roles en backend y protección de rutas en frontend (`admin`, `tecnico`, `usuario`).
4. **Prevención de Inyección SQL:** Uso obligatorio de SQLAlchemy ORM, evitando consultas SQL en texto plano.
5. **Rate Limiting:** Límites de solicitudes por IP para evitar ataques de fuerza bruta en inicio de sesión.
6. **Robustez ante fallos de IA:** Si el servicio local de Ollama se cae o excede el tiempo de respuesta, el sistema activa un **Clasificador Heurístico** que categoriza y asigna el ticket basándose en palabras clave.

---

## 🚀 Instrucciones de Instalación y Ejecución

### 1. Preparar Ollama (IA)
Asegúrese de tener Ollama instalado y corriendo en su sistema:
```bash
# Descargar el modelo requerido
ollama pull llama3.1:8b
```
Verifique que esté escuchando en `http://localhost:11434`.

### 2. Configurar el Backend (Flask)
Abra una terminal en la carpeta raíz del proyecto y siga estos pasos:

```bash
# Entrar a la carpeta backend (opcional, todos los comandos se pueden ejecutar desde la raíz)
# Crear entorno virtual
python -m venv backend/venv

# Activar entorno virtual
# En Windows (PowerShell):
backend\venv\Scripts\Activate.ps1
# En Windows (CMD):
backend\venv\Scripts\activate.bat

# Instalar dependencias
pip install -r backend/requirements.txt

# Poblar base de datos inicial (seed)
python backend/seed.py

# Iniciar servidor backend
python backend/run.py
```
El servidor backend correrá en `http://localhost:5000`.

### 3. Configurar el Frontend (React)
Abra otra terminal en la raíz del proyecto:

```bash
# Entrar a la carpeta de React
cd frontend

# Instalar dependencias npm
npm install

# Iniciar servidor de desarrollo frontend
npm run dev
```
El frontend estará disponible en `http://localhost:5173`.

---

## 📊 Credenciales de Prueba por Defecto (Creadas por `seed.py`)
* **Administrador:** `admin@drasac.com` (Clave: `admin123`)
* **Técnico A (Redes):** `tecnico_redes@drasac.com` (Clave: `tecnico123`)
* **Técnico B (Impresoras):** `tecnico_impresoras@drasac.com` (Clave: `tecnico123`)
* **Usuario (Tienda Sur):** `tienda_sur@drasac.com` (Clave: `usuario123`)
* **Usuario (Tienda Norte):** `tienda_norte@drasac.com` (Clave: `usuario123`)

---

## 🧪 Ejecución de Pruebas

El sistema incluye dos scripts de verificación:

### 1. Prueba de IA de Ollama
Valida que el servicio Ollama esté activo y retorne las clasificaciones en el formato JSON esperado:
```bash
python backend/test_ai.py
```

### 2. Pruebas Unitarias del Backend (pytest)
Suite completa de pruebas de base de datos, encriptación de contraseñas, login JWT y tolerancia a fallas:
```bash
python backend/test_backend.py
```
*(Nota: Corre las pruebas de forma aislada utilizando una base de datos SQLite en memoria `:memory:`, sin alterar los datos persistidos de desarrollo).*
