# 📖 Ejemplos de Uso - Job Tracker API

## 🚀 Primeros Pasos

El servidor debe estar corriendo en `http://localhost:3000`

---

## 📋 Ejemplos de API Calls

### 1. Obtener Todos los Trabajos Activos

```bash
curl http://localhost:3000/api/jobs
```

**Respuesta:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": 1,
      "source_id": "llamados-uy",
      "external_id": "llamados-sample-1731710000000",
      "title": "Sample Job - Desarrollador Full Stack",
      "company": "Empresa de ejemplo",
      "location": "Montevideo",
      "description": "Este es un trabajo de ejemplo...",
      "url": "https://www.llamados.com.uy",
      "is_active": 1,
      "created_at": "2025-11-15 22:15:00"
    }
  ]
}
```

### 2. Buscar Trabajos

```bash
# Buscar por palabra clave
curl "http://localhost:3000/api/jobs?search=desarrollador"

# Buscar por ubicación
curl "http://localhost:3000/api/jobs?location=montevideo"

# Buscar por fuente
curl "http://localhost:3000/api/jobs?source_id=llamados-uy"

# Combinar filtros
curl "http://localhost:3000/api/jobs?search=full%20stack&location=montevideo&is_active=true"
```

### 3. Obtener Estadísticas

```bash
curl http://localhost:3000/api/jobs/stats/overview
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "total": 15,
    "active": 12,
    "bySource": [
      {"source_id": "llamados-uy", "count": 5},
      {"source_id": "buscojobs", "count": 4},
      {"source_id": "computrabajo", "count": 3}
    ]
  }
}
```

### 4. Listar Fuentes

```bash
curl http://localhost:3000/api/sources
```

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "llamados-uy",
      "name": "Llamados.com.uy",
      "url": "https://www.llamados.com.uy",
      "enabled": 1,
      "last_scraped": "2025-11-15 22:15:00",
      "total_jobs": 5
    }
  ]
}
```

### 5. Ejecutar Scraping

```bash
# Scraping de todas las fuentes
curl -X POST http://localhost:3000/api/scraper/all

# Scraping de una fuente específica
curl -X POST http://localhost:3000/api/scraper/source/llamados-uy
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Scraping started",
  "note": "This will run in the background"
}
```

### 6. Ver Logs de Scraping

```bash
# Logs recientes (últimos 50)
curl http://localhost:3000/api/scraper/logs

# Logs de una fuente específica
curl http://localhost:3000/api/scraper/logs/llamados-uy

# Limitar número de logs
curl "http://localhost:3000/api/scraper/logs?limit=10"
```

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "source_id": "llamados-uy",
      "source_name": "Llamados.com.uy",
      "status": "success",
      "jobs_found": 5,
      "jobs_added": 5,
      "jobs_updated": 0,
      "started_at": "2025-11-15 22:15:00",
      "completed_at": "2025-11-15 22:15:05"
    }
  ]
}
```

### 7. Activar/Desactivar Fuente

```bash
# Desactivar una fuente
curl -X PATCH http://localhost:3000/api/sources/buscojobs/toggle \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'

# Activar una fuente
curl -X PATCH http://localhost:3000/api/sources/buscojobs/toggle \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'
```

---

## 🌐 Ejemplos con JavaScript (Fetch API)

### Obtener Trabajos

```javascript
async function getJobs() {
  const response = await fetch('http://localhost:3000/api/jobs');
  const data = await response.json();
  console.log(data.data);
}

getJobs();
```

### Buscar Trabajos

```javascript
async function searchJobs(searchTerm) {
  const params = new URLSearchParams({
    search: searchTerm,
    is_active: 'true'
  });
  
  const response = await fetch(`http://localhost:3000/api/jobs?${params}`);
  const data = await response.json();
  return data.data;
}

searchJobs('desarrollador').then(jobs => console.log(jobs));
```

### Ejecutar Scraping

```javascript
async function runScraping() {
  const response = await fetch('http://localhost:3000/api/scraper/all', {
    method: 'POST'
  });
  const data = await response.json();
  console.log(data.message);
}

runScraping();
```

### Obtener Estadísticas

```javascript
async function getStats() {
  const response = await fetch('http://localhost:3000/api/jobs/stats/overview');
  const data = await response.json();
  console.log('Total trabajos:', data.data.total);
  console.log('Trabajos activos:', data.data.active);
}

getStats();
```

---

## 🐍 Ejemplos con Python (requests)

### Instalar requests

```bash
pip install requests
```

### Obtener Trabajos

```python
import requests

response = requests.get('http://localhost:3000/api/jobs')
data = response.json()

for job in data['data']:
    print(f"{job['title']} - {job['company']}")
```

### Buscar Trabajos

```python
import requests

params = {
    'search': 'desarrollador',
    'location': 'montevideo',
    'is_active': 'true'
}

response = requests.get('http://localhost:3000/api/jobs', params=params)
jobs = response.json()['data']

print(f"Encontrados {len(jobs)} trabajos")
```

### Ejecutar Scraping

```python
import requests

response = requests.post('http://localhost:3000/api/scraper/all')
result = response.json()

print(result['message'])
```

### Ver Logs

```python
import requests

response = requests.get('http://localhost:3000/api/scraper/logs')
logs = response.json()['data']

for log in logs:
    print(f"{log['source_name']}: {log['jobs_found']} trabajos encontrados")
```

---

## 💻 Ejemplos con PowerShell

### Obtener Trabajos

```powershell
$response = Invoke-RestMethod -Uri "http://localhost:3000/api/jobs"
$response.data | Format-Table title, company, location
```

### Buscar Trabajos

```powershell
$params = @{
    search = "desarrollador"
    is_active = "true"
}
$uri = "http://localhost:3000/api/jobs?" + ($params.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join "&"
$response = Invoke-RestMethod -Uri $uri
$response.data
```

### Ejecutar Scraping

```powershell
$response = Invoke-RestMethod -Uri "http://localhost:3000/api/scraper/all" -Method Post
Write-Host $response.message
```

---

## 📱 Integración con Frontend

### React Example

```jsx
import React, { useState, useEffect } from 'react';

function JobList() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:3000/api/jobs')
      .then(res => res.json())
      .then(data => {
        setJobs(data.data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Cargando...</div>;

  return (
    <div>
      {jobs.map(job => (
        <div key={job.id}>
          <h3>{job.title}</h3>
          <p>{job.company} - {job.location}</p>
        </div>
      ))}
    </div>
  );
}
```

### Vue.js Example

```vue
<template>
  <div>
    <div v-for="job in jobs" :key="job.id">
      <h3>{{ job.title }}</h3>
      <p>{{ job.company }} - {{ job.location }}</p>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      jobs: []
    };
  },
  async mounted() {
    const response = await fetch('http://localhost:3000/api/jobs');
    const data = await response.json();
    this.jobs = data.data;
  }
};
</script>
```

---

## 🔄 Automatización con Scripts

### Script de Monitoreo (Node.js)

```javascript
import fetch from 'node-fetch';

async function checkNewJobs() {
  const response = await fetch('http://localhost:3000/api/jobs?limit=5');
  const data = await response.json();
  
  console.log(`\n📋 Últimos ${data.count} trabajos:`);
  data.data.forEach(job => {
    console.log(`  • ${job.title} - ${job.company}`);
  });
}

// Ejecutar cada 30 minutos
setInterval(checkNewJobs, 30 * 60 * 1000);
checkNewJobs(); // Primera ejecución inmediata
```

### Cron Job para Scraping (Linux/Mac)

```bash
# Editar crontab
crontab -e

# Agregar línea para ejecutar cada 6 horas
0 */6 * * * curl -X POST http://localhost:3000/api/scraper/all
```

### Task Scheduler (Windows PowerShell)

```powershell
# Script para ejecutar scraping
$action = New-ScheduledTaskAction -Execute "curl" -Argument "-X POST http://localhost:3000/api/scraper/all"
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Hours 6)
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "JobTrackerScraping"
```

---

## 🧪 Testing con Postman

### Colección de Postman

```json
{
  "info": {
    "name": "Job Tracker API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Get All Jobs",
      "request": {
        "method": "GET",
        "url": "http://localhost:3000/api/jobs"
      }
    },
    {
      "name": "Search Jobs",
      "request": {
        "method": "GET",
        "url": "http://localhost:3000/api/jobs?search=desarrollador"
      }
    },
    {
      "name": "Run Scraping",
      "request": {
        "method": "POST",
        "url": "http://localhost:3000/api/scraper/all"
      }
    }
  ]
}
```

---

## 📊 Casos de Uso Comunes

### 1. Dashboard de Estadísticas

```javascript
async function getDashboardData() {
  const [stats, sources, recentJobs] = await Promise.all([
    fetch('http://localhost:3000/api/jobs/stats/overview').then(r => r.json()),
    fetch('http://localhost:3000/api/sources').then(r => r.json()),
    fetch('http://localhost:3000/api/jobs?limit=10').then(r => r.json())
  ]);

  return {
    stats: stats.data,
    sources: sources.data,
    recentJobs: recentJobs.data
  };
}
```

### 2. Notificaciones de Nuevos Trabajos

```javascript
let lastJobId = 0;

async function checkForNewJobs() {
  const response = await fetch('http://localhost:3000/api/jobs?limit=1');
  const data = await response.json();
  
  if (data.data.length > 0) {
    const latestJob = data.data[0];
    if (latestJob.id > lastJobId) {
      console.log('🆕 Nuevo trabajo:', latestJob.title);
      lastJobId = latestJob.id;
      // Enviar notificación
    }
  }
}

// Verificar cada 5 minutos
setInterval(checkForNewJobs, 5 * 60 * 1000);
```

### 3. Exportar a CSV

```javascript
async function exportToCSV() {
  const response = await fetch('http://localhost:3000/api/jobs');
  const data = await response.json();
  
  const csv = [
    ['Título', 'Empresa', 'Ubicación', 'Fecha', 'URL'].join(','),
    ...data.data.map(job => [
      job.title,
      job.company,
      job.location,
      job.posted_date,
      job.url
    ].join(','))
  ].join('\n');
  
  console.log(csv);
  // O guardar en archivo
}
```

---

## ⚡ Tips y Buenas Prácticas

### 1. Manejo de Errores

```javascript
async function safeApiCall(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error en API call:', error);
    return null;
  }
}
```

### 2. Caché de Resultados

```javascript
let cache = {};
let cacheTime = 5 * 60 * 1000; // 5 minutos

async function getCachedJobs() {
  const now = Date.now();
  
  if (cache.jobs && (now - cache.timestamp < cacheTime)) {
    return cache.jobs;
  }
  
  const response = await fetch('http://localhost:3000/api/jobs');
  const data = await response.json();
  
  cache = {
    jobs: data.data,
    timestamp: now
  };
  
  return data.data;
}
```

### 3. Paginación

```javascript
async function getJobsPaginated(page = 1, perPage = 20) {
  const response = await fetch(`http://localhost:3000/api/jobs?limit=${perPage}`);
  const data = await response.json();
  
  const start = (page - 1) * perPage;
  const end = start + perPage;
  
  return {
    jobs: data.data.slice(start, end),
    total: data.count,
    page,
    totalPages: Math.ceil(data.count / perPage)
  };
}
```

---

¡Estos ejemplos te ayudarán a integrar y usar la API de Job Tracker en tus proyectos! 🚀
