# 🌮 Rreal Tacos - Sistema de Recepción de Mercadería

Sistema web para el registro automático de recepción de mercadería mediante OCR (Reconocimiento Óptico de Caracteres) usando GPT-4o y integración con ClickUp.

## 🎯 Características

- **📸 Upload de imágenes**: Subida de fotos de invoices
- **🤖 OCR Inteligente**: Extracción automática de datos usando GPT-4o mini
- **📍 Gestión de ubicaciones**: Selector de 7 ubicaciones de Rreal Tacos
- **🔗 Integración ClickUp**: Creación automática de tareas con custom fields
- **🎨 UI Moderna**: Interfaz limpia con paleta azul corporativa
- **📱 Responsive**: Funciona en desktop y móvil

## 🏗️ Arquitectura

```
├── client/          # Frontend React + TypeScript + Tailwind CSS
├── server/          # Backend Node.js + Express
│   ├── services/    # Servicios de OCR y ClickUp
│   └── index.js     # Servidor principal
└── package.json     # Scripts de desarrollo
```

## 🚀 Instalación y Configuración

### 1. Instalar dependencias

```bash
npm run install-all
```

### 2. Configurar variables de entorno

Crea un archivo `server/.env` basado en el ejemplo proporcionado (`server/.env.example`):

```env
OPENAI_API_KEY=your_openai_api_key_here
CLICKUP_ACCESS_TOKEN=your_clickup_access_token_here
CLICKUP_LIST_ID=your_clickup_list_id_here
PORT=3001
```

### 3. Ejecutar la aplicación

```bash
npm run dev
```

Esto iniciará:

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:3001

## 📋 Uso del Sistema

### 1. Subir Invoice

- Selecciona una imagen del invoice (JPG, PNG, etc.)
- Elige la ubicación desde el dropdown
- Haz clic en "🚀 Procesar Invoice"

### 2. Procesamiento Automático

El sistema:

1. Envía la imagen a GPT-4o para análisis OCR
2. Extrae datos estructurados del invoice
3. Crea automáticamente una tarea en ClickUp
4. Muestra los resultados en pantalla

### 3. Datos Extraídos

- **🏢 Proveedor**: Nombre del proveedor
- **📦 Ítems Pedidos**: Lista de productos solicitados
- **❌ Ítems Faltantes**: Productos que no llegaron
- **🔍 Faltantes Detectados**: Yes/No
- **💰 Valor Total**: Monto total del invoice
- **💸 Valor Faltantes**: Costo de productos faltantes

## 🏪 Ubicaciones Disponibles

- Cumming
- Chamblee
- West Midtown
- Sugar Hill
- Buckhead
- Decatur
- Lawrenceville

## 🔧 API Endpoints

### `POST /api/process-invoice`

Procesa un invoice y crea tarea en ClickUp.

**Request:**

```
Content-Type: multipart/form-data
- invoice: File (imagen)
- location: String (ubicación)
```

**Response:**

```json
{
  "success": true,
  "ocrData": {
    "proveedor": "Sysco Atlanta",
    "items_pedidos": "10 Avocados, 5 Tomatoes",
    "items_faltantes": "5 Avocados",
    "faltantes_detectados": "Yes",
    "valor_faltantes_usd": 32.9,
    "valor_total_invoice_usd": 135.45
  },
  "clickupTask": {
    "id": "task_id",
    "url": "https://app.clickup.com/..."
  }
}
```

### `GET /health`

Health check del servidor.

## 🔗 Integración ClickUp

### Custom Fields Configurados

- **Proveedor** (`0135f063-647c-4786-9c9b-0c3e772bad2c`): Nombre del proveedor
- **Faltantes detectados** (`690610b0-3210-4a53-891b-63b6f8df3d28`): Descripción de faltantes

### Lista Destino

- **List ID**: `901313089314`

## 🛠️ Desarrollo

### Scripts Disponibles

```bash
npm run dev          # Ejecutar frontend y backend
npm run server       # Solo backend
npm run client       # Solo frontend
npm run build        # Build de producción
npm run install-all  # Instalar todas las dependencias
```

### Estructura de Servicios

#### OCR Service (`server/services/ocrService.js`)

- Integración con OpenAI GPT-4o
- Procesamiento de imágenes en base64
- Extracción estructurada de datos

#### ClickUp Service (`server/services/clickupService.js`)

- Creación de tareas automáticas
- Mapeo de custom fields
- Manejo de errores de API

## 🔒 Seguridad

- Rate limiting (100 requests/15min)
- Validación de tipos de archivo
- Límite de tamaño de archivo (10MB)
- Timeout de requests (60s)
- Sanitización de datos

## 🐛 Troubleshooting

### Error: "ClickUp authentication failed"

Verificar que el `CLICKUP_ACCESS_TOKEN` sea válido.

### Error: "OCR processing failed"

Verificar que la `OPENAI_API_KEY` sea válida y tenga créditos.

### Error: "File too large"

Las imágenes deben ser menores a 10MB.

## 📞 Soporte

Para soporte técnico o reportar bugs, contactar al equipo de desarrollo.

---

**© 2024 Rreal Tacos - Sistema de Gestión de Mercadería**
