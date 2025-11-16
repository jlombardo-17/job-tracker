import BaseScraper from './BaseScraper.js';
import * as cheerio from 'cheerio';

/**
 * Scraper implementation for Uruguay Concursa (ONSC - Oficina Nacional del Servicio Civil)
 * @extends BaseScraper
 */
class UruguayConcursaScraper extends BaseScraper {
  /**
   * Scrape job listings from Uruguay Concursa
   * @returns {Promise<Array>} Array of job objects
   */
  async scrape() {
    this.log('Fetching llamados públicos...');
    
    const jobs = [];
    
    try {
      // Fetch the main llamados page
      const html = await this.fetchWithRetry(this.source.url);
      const $ = cheerio.load(html);
      
      // Try multiple selector strategies for finding job listings
      // Strategy 1: Look for table rows with job data
      const jobRows = $('table tr, .listado tr, .resultado tr, tbody tr').filter((i, elem) => {
        const text = $(elem).text();
        // Filter rows that look like job listings (have llamado number, department, etc.)
        return text.match(/\d{1,5}\/\d{4}/) || // Pattern: 123/2025
               text.match(/llamado/i);
      });
      
      if (jobRows.length > 0) {
        this.log(`Found ${jobRows.length} potential job rows using table selectors`);
        
        jobRows.each((i, elem) => {
          const job = this.extractJobFromTableRow($, elem);
          if (job) {
            jobs.push(job);
          }
        });
      }
      
      // Strategy 2: Look for div/article containers with job information
      if (jobs.length === 0) {
        this.log('Trying alternative selectors for job listings...', 'warn');
        
        $('.llamado, .job-item, .concurso, article, .resultado-item').each((i, elem) => {
          const job = this.extractJobFromContainer($, elem);
          if (job) {
            jobs.push(job);
          }
        });
      }
      
      // Strategy 3: Look for links that contain llamado information
      if (jobs.length === 0) {
        this.log('Trying generic link extraction...', 'warn');
        
        $('a').each((i, elem) => {
          const $link = $(elem);
          const href = $link.attr('href');
          const text = $link.text().trim();
          
          // Look for links that reference llamado details
          if (href && (
              href.includes('llamado') || 
              href.includes('concurso') ||
              text.match(/\d{1,5}\/\d{4}/)
          )) {
            const job = this.extractJobFromLink($, elem);
            if (job) {
              jobs.push(job);
            }
          }
        });
      }
      
      this.log(`Found ${jobs.length} llamados`, jobs.length > 0 ? 'success' : 'warn');
      
    } catch (error) {
      this.log(`Error: ${error.message}`, 'error');
    }
    
    return jobs;
  }

  /**
   * Extract job data from table row element
   * @param {CheerioStatic} $ - Cheerio instance
   * @param {CheerioElement} elem - Table row element
   * @returns {object|null} Job object or null if invalid
   */
  extractJobFromTableRow($, elem) {
    try {
      const $row = $(elem);
      const cells = $row.find('td');
      
      if (cells.length === 0) return null;
      
      // Common table structure: [Número, Organismo/Departamento, Descripción, Fecha, Estado, etc.]
      const rowText = $row.text().trim();
      
      // Extract llamado number (e.g., "123/2025")
      const numberMatch = rowText.match(/(\d{1,5}\/\d{4})/);
      const llamadoNumber = numberMatch ? numberMatch[1] : null;
      
      if (!llamadoNumber) return null;
      
      // Extract title/description
      let title = '';
      let description = '';
      let company = 'Uruguay Concursa - ONSC';
      let status = 'Abierto';
      
      // Try to extract from cells
      cells.each((i, cell) => {
        const cellText = $(cell).text().trim();
        
        // Skip empty or very short cells
        if (cellText.length < 3) return;
        
        // Department/Institution usually comes first or second
        if (i <= 2 && cellText.length > 3 && !cellText.match(/^\d+$/)) {
          if (!company || company === 'Uruguay Concursa - ONSC') {
            company = `${cellText} - ONSC`;
          }
        }
        
        // Description is usually longer text
        if (cellText.length > 20 && !title) {
          title = cellText;
        }
        
        // Look for state/status
        if (cellText.match(/abierto|cerrado|vigente|finalizado/i)) {
          status = cellText;
        }
      });
      
      // If no title found, use llamado number
      if (!title) {
        title = `Llamado ${llamadoNumber}`;
      }
      
      // Extract link
      const link = $row.find('a').first().attr('href');
      const url = link ? 
        this.normalizeUrl(link, 'https://www.uruguayconcursa.gub.uy') : 
        `https://www.uruguayconcursa.gub.uy/Portal/servlet/com.si.recsel.dspllamados62`;
      
      // Generate external ID from URL or llamado number
      const external_id = `uc-${this.generateHash(url + llamadoNumber)}`;
      
      // Extract dates if present
      let posted_date = null;
      let closing_date = null;
      
      cells.each((i, cell) => {
        const cellText = $(cell).text().trim();
        // Look for date patterns DD/MM/YYYY
        const dateMatch = cellText.match(/(\d{2}\/\d{2}\/\d{4})/);
        if (dateMatch) {
          const parsedDate = this.parseDate(dateMatch[1]);
          if (!posted_date) {
            posted_date = parsedDate;
          } else if (!closing_date) {
            closing_date = parsedDate;
          }
        }
      });
      
      // Use current date as fallback
      if (!posted_date) {
        posted_date = new Date().toISOString().split('T')[0];
      }
      
      const job = {
        external_id,
        title: this.cleanText(title, 200),
        company: this.cleanText(company, 100),
        location: 'Uruguay',
        description: description || `Llamado ${llamadoNumber} - ${company}. Consulta los detalles en el portal de Uruguay Concursa.`,
        url,
        posted_date,
        closing_date,
        category: 'gobierno',
        job_type: 'Concurso Público'
      };
      
      return this.validateJob(job) ? job : null;
      
    } catch (error) {
      this.log(`Error extracting job from table row: ${error.message}`, 'warn');
      return null;
    }
  }

  /**
   * Extract job data from container element (div, article, etc.)
   * @param {CheerioStatic} $ - Cheerio instance
   * @param {CheerioElement} elem - Container element
   * @returns {object|null} Job object or null if invalid
   */
  extractJobFromContainer($, elem) {
    try {
      const $elem = $(elem);
      
      // Extract title
      const title = this.cleanText(
        $elem.find('h1, h2, h3, h4, .title, .titulo').first().text()
      );
      
      if (!title || title.length < 5) return null;
      
      // Extract company/department
      const company = this.cleanText(
        $elem.find('.organismo, .departamento, .institucion, .company').first().text()
      ) || 'Uruguay Concursa - ONSC';
      
      // Extract description
      const description = this.cleanText(
        $elem.find('.descripcion, .description, p').first().text(),
        1000
      ) || title;
      
      // Extract link
      const link = $elem.find('a').first().attr('href') || $elem.closest('a').attr('href');
      const url = link ? 
        this.normalizeUrl(link, 'https://www.uruguayconcursa.gub.uy') : 
        this.source.url;
      
      // Extract dates
      const dateText = $elem.find('.fecha, .date, time').first().text();
      const posted_date = this.parseDate(dateText) || new Date().toISOString().split('T')[0];
      
      // Generate external ID
      const external_id = `uc-${this.generateHash(url)}`;
      
      const job = {
        external_id,
        title,
        company: company === 'Uruguay Concursa - ONSC' ? `${company}` : `${company} - ONSC`,
        location: 'Uruguay',
        description,
        url,
        posted_date,
        category: 'gobierno',
        job_type: 'Concurso Público'
      };
      
      return this.validateJob(job) ? job : null;
      
    } catch (error) {
      this.log(`Error extracting job from container: ${error.message}`, 'warn');
      return null;
    }
  }

  /**
   * Extract job data from link element
   * @param {CheerioStatic} $ - Cheerio instance
   * @param {CheerioElement} elem - Link element
   * @returns {object|null} Job object or null if invalid
   */
  extractJobFromLink($, elem) {
    try {
      const $link = $(elem);
      const href = $link.attr('href');
      const text = this.cleanText($link.text());
      
      if (!href || !text || text.length < 10) return null;
      
      // Skip navigation links
      if (text.match(/inicio|mapa|accesibilidad|sesión|registrarse/i)) {
        return null;
      }
      
      const url = this.normalizeUrl(href, 'https://www.uruguayconcursa.gub.uy');
      const external_id = `uc-${this.generateHash(url)}`;
      
      // Extract llamado number if present
      const numberMatch = text.match(/(\d{1,5}\/\d{4})/);
      const llamadoNumber = numberMatch ? ` - Llamado ${numberMatch[1]}` : '';
      
      const job = {
        external_id,
        title: this.cleanText(text + llamadoNumber, 200),
        company: 'Uruguay Concursa - ONSC',
        location: 'Uruguay',
        description: `Concurso público del Estado. Visita el portal de Uruguay Concursa para más detalles.`,
        url,
        posted_date: new Date().toISOString().split('T')[0],
        category: 'gobierno',
        job_type: 'Concurso Público'
      };
      
      return this.validateJob(job) ? job : null;
      
    } catch (error) {
      this.log(`Error extracting job from link: ${error.message}`, 'warn');
      return null;
    }
  }
}

export default UruguayConcursaScraper;
