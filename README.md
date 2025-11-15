# Job Tracker

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![GitHub Repo](https://img.shields.io/badge/github-job--tracker-blue?logo=github)](https://github.com/jlombardo-17/job-tracker)

Sistema automatizado de seguimiento de ofertas de trabajo y llamados desde múltiples fuentes web uruguayas.

![Job Tracker](https://img.shields.io/badge/Status-Active-success)

## 🚀 Características

- **Scraping automático** de ofertas de trabajo desde múltiples sitios
- **Base de datos SQLite** para almacenamiento eficiente
- **API REST** completa para gestión de datos
- **Frontend moderno** con filtros y búsqueda en tiempo real
- **Sistema de logs** para seguimiento de scraping
- **Configuración flexible** de fuentes de datos

## 📋 Requisitos

- Node.js >= 18.0.0
- npm o yarn

## 🔧 Instalación

1. Clonar el repositorio
2. Instalar dependencias:

```bash
npm install
```

3. Inicializar la base de datos:

```bash
npm run init-db
```

## 🎯 Uso

### Iniciar el servidor

```bash
npm start
```

El servidor estará disponible en `http://localhost:3000`

### Modo desarrollo (con auto-reload)

```bash
npm run dev
```

### Ejecutar scraping manual

```bash
node scripts/run-scraper.js
```

## 📁 Estructura del Proyecto

```
job-tracker/
├── api/
│   └── routes/          # Rutas de la API REST
├── config/              # Configuración de BD y fuentes
├── data/                # Base de datos SQLite
├── logs/                # Logs del sistema
├── public/              # Frontend estático
│   ├── assets/
│   │   ├── css/
│   │   └── js/
│   └── index.html
├── scripts/             # Scripts de utilidad
├── src/
│   ├── models/          # Modelos de datos
│   ├── services/        # Servicios de scraping
│   └── utilities/       # Utilidades y scheduler
└── server.js            # Servidor Express
```

## 🔌 API Endpoints

### Jobs

- `GET /api/jobs` - Obtener todos los trabajos (con filtros)
- `GET /api/jobs/:id` - Obtener trabajo por ID
- `GET /api/jobs/stats/overview` - Estadísticas generales
- `PATCH /api/jobs/:id/deactivate` - Marcar trabajo como inactivo

### Sources

- `GET /api/sources` - Obtener todas las fuentes
- `GET /api/sources/:id` - Obtener fuente por ID
- `GET /api/sources/:id/stats` - Estadísticas de una fuente
- `PATCH /api/sources/:id/toggle` - Activar/desactivar fuente

### Scraper

- `POST /api/scraper/all` - Ejecutar scraping de todas las fuentes
- `POST /api/scraper/source/:sourceId` - Ejecutar scraping de una fuente
- `GET /api/scraper/logs` - Obtener logs de scraping
- `GET /api/scraper/logs/:sourceId` - Obtener logs de una fuente

## ⚙️ Configuración

### Fuentes de datos

Editar `config/sources.json` para agregar o modificar fuentes:

```json
{
  "sources": [
    {
      "id": "mi-fuente",
      "name": "Mi Fuente de Trabajos",
      "url": "https://ejemplo.com",
      "enabled": true,
      "category": "general",
      "scraper": "mi-scraper"
    }
  ]
}
```

### Variables de entorno

Crear archivo `.env` en la raíz:

```env
PORT=3000
NODE_ENV=development
DB_PATH=./data/jobs.db
LOG_LEVEL=info
```

## 🕷️ Agregar nuevos scrapers

1. Editar `src/services/ScraperService.js`
2. Agregar un nuevo método de scraping:

```javascript
async scrapeNuevoSitio() {
  const jobs = [];
  const response = await axios.get('https://sitio.com', this.axiosConfig);
  const $ = cheerio.load(response.data);
  
  // Adaptar selectores al sitio específico
  $('.job-item').each((i, elem) => {
    jobs.push({
      external_id: $(elem).attr('data-id'),
      title: $(elem).find('.title').text().trim(),
      company: $(elem).find('.company').text().trim(),
      // ... más campos
    });
  });
  
  return jobs;
}
```

3. Agregar el caso en el switch de `scrapeSource()`

## 📊 Base de Datos

El sistema utiliza SQLite con las siguientes tablas:

- **jobs** - Ofertas de trabajo
- **sources** - Fuentes de datos
- **scraping_log** - Logs de ejecución

## 🎨 Frontend

El frontend es una Single Page Application (SPA) con:

- Diseño responsive
- Filtros en tiempo real
- Modal de detalles
- Notificaciones toast
- Tema oscuro moderno

## 🔄 Scraping Automático

Para habilitar scraping automático periódico, agregar al `server.js`:

```javascript
import Scheduler from './src/utilities/Scheduler.js';

// Ejecutar cada 6 horas
const scheduler = new Scheduler(6);
scheduler.start();
```

## 📝 Notas

- Los scrapers incluidos son ejemplos básicos que necesitan adaptarse a la estructura real de cada sitio
- Se recomienda revisar los términos de servicio de cada sitio antes de hacer scraping
- Para entornos de producción, considerar usar proxies y rate limiting

## 📄 Licencia

MIT

## 👨‍💻 Desarrollo

Contribuciones son bienvenidas. Por favor crear un issue antes de enviar PRs.
