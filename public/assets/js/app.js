// API Base URL
const API_BASE = '/api';

// State
let allJobs = [];
let filteredJobs = [];
let sources = [];

// DOM Elements
const jobsContainer = document.getElementById('jobsContainer');
const searchInput = document.getElementById('searchInput');
const sourceFilter = document.getElementById('sourceFilter');
const locationFilter = document.getElementById('locationFilter');
const activeOnlyCheckbox = document.getElementById('activeOnly');
const refreshBtn = document.getElementById('refreshBtn');
const scrapeBtn = document.getElementById('scrapeBtn');
const modal = document.getElementById('jobModal');
const closeModal = document.querySelector('.close');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadSources();
    loadJobs();
    loadStats();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    searchInput.addEventListener('input', debounce(applyFilters, 300));
    sourceFilter.addEventListener('change', applyFilters);
    locationFilter.addEventListener('input', debounce(applyFilters, 300));
    activeOnlyCheckbox.addEventListener('change', applyFilters);
    refreshBtn.addEventListener('click', handleRefresh);
    scrapeBtn.addEventListener('click', handleScrape);
    closeModal.addEventListener('click', () => modal.style.display = 'none');
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// Load sources
async function loadSources() {
    try {
        const response = await fetch(`${API_BASE}/sources`);
        const data = await response.json();
        
        if (data.success) {
            sources = data.data;
            populateSourceFilter();
        }
    } catch (error) {
        console.error('Error loading sources:', error);
        showNotification('Error al cargar las fuentes', 'error');
    }
}

// Populate source filter dropdown
function populateSourceFilter() {
    sourceFilter.innerHTML = '<option value="">Todas las fuentes</option>';
    
    sources.forEach(source => {
        const option = document.createElement('option');
        option.value = source.id;
        option.textContent = source.name;
        sourceFilter.appendChild(option);
    });
}

// Load jobs
async function loadJobs() {
    try {
        jobsContainer.innerHTML = '<div class="loading">Cargando trabajos...</div>';
        
        const isActive = activeOnlyCheckbox.checked;
        const response = await fetch(`${API_BASE}/jobs?is_active=${isActive}`);
        const data = await response.json();
        
        if (data.success) {
            allJobs = data.data;
            applyFilters();
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Error loading jobs:', error);
        jobsContainer.innerHTML = '<div class="no-results">Error al cargar los trabajos</div>';
        showNotification('Error al cargar los trabajos', 'error');
    }
}

// Load statistics
async function loadStats() {
    try {
        const response = await fetch(`${API_BASE}/jobs/stats/overview`);
        const data = await response.json();
        
        if (data.success) {
            const stats = data.data;
            document.getElementById('totalJobs').textContent = stats.total;
            document.getElementById('activeJobs').textContent = stats.active;
            document.getElementById('sourcesCount').textContent = stats.bySource.length;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Apply filters
function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedSource = sourceFilter.value;
    const locationTerm = locationFilter.value.toLowerCase();
    
    filteredJobs = allJobs.filter(job => {
        const matchesSearch = !searchTerm || 
            job.title.toLowerCase().includes(searchTerm) ||
            (job.company && job.company.toLowerCase().includes(searchTerm)) ||
            (job.description && job.description.toLowerCase().includes(searchTerm));
        
        const matchesSource = !selectedSource || job.source_id === selectedSource;
        
        const matchesLocation = !locationTerm || 
            (job.location && job.location.toLowerCase().includes(locationTerm));
        
        return matchesSearch && matchesSource && matchesLocation;
    });
    
    displayJobs();
}

// Display jobs
function displayJobs() {
    if (filteredJobs.length === 0) {
        jobsContainer.innerHTML = '<div class="no-results">No se encontraron trabajos</div>';
        return;
    }
    
    jobsContainer.innerHTML = '';
    
    filteredJobs.forEach(job => {
        const jobCard = createJobCard(job);
        jobsContainer.appendChild(jobCard);
    });
}

// Create job card element
function createJobCard(job) {
    const card = document.createElement('div');
    card.className = `job-card ${job.is_active ? '' : 'inactive'}`;
    card.onclick = () => showJobDetails(job);
    
    const source = sources.find(s => s.id === job.source_id);
    const sourceName = source ? source.name : job.source_id;
    
    card.innerHTML = `
        <div class="job-header">
            <div class="job-title">${escapeHtml(job.title)}</div>
            ${job.company ? `<div class="job-company">${escapeHtml(job.company)}</div>` : ''}
            ${job.location ? `<div class="job-location">📍 ${escapeHtml(job.location)}</div>` : ''}
        </div>
        
        <div class="job-meta">
            <span class="job-badge badge-source">${sourceName}</span>
            ${job.posted_date ? `<span class="job-badge badge-date">${formatDate(job.posted_date)}</span>` : ''}
            ${!job.is_active ? '<span class="job-badge badge-inactive">Inactivo</span>' : ''}
        </div>
        
        ${job.description ? `<div class="job-description">${escapeHtml(job.description)}</div>` : ''}
    `;
    
    return card;
}

// Show job details in modal
function showJobDetails(job) {
    const source = sources.find(s => s.id === job.source_id);
    const sourceName = source ? source.name : job.source_id;
    
    const detailsHTML = `
        <h2 class="job-detail-title">${escapeHtml(job.title)}</h2>
        
        ${job.company ? `
            <div class="job-detail-section">
                <div class="job-detail-label">Empresa</div>
                <div class="job-detail-value">${escapeHtml(job.company)}</div>
            </div>
        ` : ''}
        
        ${job.location ? `
            <div class="job-detail-section">
                <div class="job-detail-label">Ubicación</div>
                <div class="job-detail-value">📍 ${escapeHtml(job.location)}</div>
            </div>
        ` : ''}
        
        <div class="job-detail-section">
            <div class="job-detail-label">Fuente</div>
            <div class="job-detail-value">${sourceName}</div>
        </div>
        
        ${job.posted_date ? `
            <div class="job-detail-section">
                <div class="job-detail-label">Fecha de publicación</div>
                <div class="job-detail-value">${formatDate(job.posted_date)}</div>
            </div>
        ` : ''}
        
        ${job.closing_date ? `
            <div class="job-detail-section">
                <div class="job-detail-label">Fecha de cierre</div>
                <div class="job-detail-value">${formatDate(job.closing_date)}</div>
            </div>
        ` : ''}
        
        ${job.salary ? `
            <div class="job-detail-section">
                <div class="job-detail-label">Salario</div>
                <div class="job-detail-value">${escapeHtml(job.salary)}</div>
            </div>
        ` : ''}
        
        ${job.description ? `
            <div class="job-detail-section">
                <div class="job-detail-label">Descripción</div>
                <div class="job-detail-value">${escapeHtml(job.description)}</div>
            </div>
        ` : ''}
        
        ${job.url ? `
            <a href="${escapeHtml(job.url)}" target="_blank" class="job-detail-link">
                Ver oferta completa →
            </a>
        ` : ''}
    `;
    
    document.getElementById('jobDetails').innerHTML = detailsHTML;
    modal.style.display = 'block';
}

// Handle refresh
async function handleRefresh() {
    refreshBtn.disabled = true;
    refreshBtn.textContent = '🔄 Actualizando...';
    
    await loadJobs();
    await loadStats();
    
    refreshBtn.disabled = false;
    refreshBtn.textContent = '🔄 Actualizar datos';
    showNotification('Datos actualizados correctamente', 'success');
}

// Handle scrape
async function handleScrape() {
    if (!confirm('¿Deseas ejecutar el scraping de todas las fuentes activas? Esto puede tardar varios minutos.')) {
        return;
    }
    
    scrapeBtn.disabled = true;
    scrapeBtn.textContent = '🕷️ Ejecutando...';
    
    try {
        const response = await fetch(`${API_BASE}/scraper/all`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Scraping iniciado. Los datos se actualizarán en segundo plano.', 'success');
            
            // Wait a bit and refresh
            setTimeout(async () => {
                await handleRefresh();
                scrapeBtn.disabled = false;
                scrapeBtn.textContent = '🕷️ Ejecutar scraping';
            }, 5000);
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Error executing scrape:', error);
        showNotification('Error al ejecutar el scraping', 'error');
        scrapeBtn.disabled = false;
        scrapeBtn.textContent = '🕷️ Ejecutar scraping';
    }
}

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-UY', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function showNotification(message, type = 'info') {
    // Simple console notification - you can enhance this with a toast library
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // Create a simple toast notification
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#4a90e2'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
