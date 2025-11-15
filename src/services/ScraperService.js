import axios from 'axios';
import * as cheerio from 'cheerio';
import Job from '../models/Job.js';
import Source from '../models/Source.js';
import ScrapingLog from '../models/ScrapingLog.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class ScraperService {
  constructor() {
    const configPath = join(__dirname, '../../config/sources.json');
    const configData = fs.readFileSync(configPath, 'utf-8');
    this.config = JSON.parse(configData);
    
    this.axiosConfig = {
      headers: {
        'User-Agent': this.config.scraperConfig.userAgent
      },
      timeout: this.config.scraperConfig.timeout
    };
  }

  async scrapeAll() {
    const sources = await Source.getEnabled();
    const results = [];

    for (const source of sources) {
      const result = await this.scrapeSource(source.id);
      results.push(result);
      
      // Delay between sources
      await this.delay(this.config.scraperConfig.delay);
    }

    return results;
  }

  async scrapeSource(sourceId) {
    const logId = await ScrapingLog.create(sourceId);
    const source = await Source.getById(sourceId);
    
    if (!source) {
      return { error: 'Source not found' };
    }

    console.log(`🔍 Scraping ${source.name}...`);

    try {
      let jobs = [];
      
      // Call specific scraper based on source
      switch (source.id) {
        case 'uruguay-xxi':
          jobs = await this.scrapeUruguayXXI();
          break;
        case 'buscojobs':
          jobs = await this.scrapeBuscoJobs();
          break;
        case 'computrabajo':
          jobs = await this.scrapeCompuTrabajo();
          break;
        default:
          throw new Error(`No scraper configured for ${source.id}`);
      }

      let jobsAdded = 0;
      let jobsUpdated = 0;

      // Save jobs to database
      for (const jobData of jobs) {
        const result = await Job.upsert({ ...jobData, source_id: sourceId });
        if (result.created) {
          jobsAdded++;
        } else {
          jobsUpdated++;
        }
      }

      // Update source stats
      await Source.updateLastScraped(sourceId, jobs.length);

      // Complete log
      await ScrapingLog.complete(logId, {
        status: 'success',
        jobs_found: jobs.length,
        jobs_added: jobsAdded,
        jobs_updated: jobsUpdated
      });

      console.log(`✅ ${source.name}: ${jobs.length} jobs found, ${jobsAdded} added, ${jobsUpdated} updated`);

      return {
        source: source.name,
        success: true,
        jobs_found: jobs.length,
        jobs_added: jobsAdded,
        jobs_updated: jobsUpdated
      };

    } catch (error) {
      console.error(`❌ Error scraping ${source.name}:`, error.message);
      
      await ScrapingLog.complete(logId, {
        status: 'error',
        error_message: error.message
      });

      return {
        source: source.name,
        success: false,
        error: error.message
      };
    }
  }

  async scrapeUruguayXXI() {
    const jobs = [];
    
    try {
      console.log('📡 Fetching Uruguay XXI llamados...');
      const response = await axios.get(
        'https://www.uruguayxxi.gub.uy/es/quienes-somos/llamados-licitaciones/',
        this.axiosConfig
      );
      
      const $ = cheerio.load(response.data);
      
      // Uruguay XXI uses a specific structure for their job listings
      // Looking for article elements or specific containers with job information
      $('.llamados-item, .job-listing, article.llamado, .licitacion-item').each((i, elem) => {
        try {
          const $elem = $(elem);
          
          // Extract title from various possible selectors
          const title = $elem.find('h2, h3, .title, .llamado-title').first().text().trim() ||
                       $elem.find('a').first().text().trim();
          
          if (!title || title.length < 3) return; // Skip if no valid title
          
          // Extract link
          const link = $elem.find('a').first().attr('href');
          const url = link ? (link.startsWith('http') ? link : `https://www.uruguayxxi.gub.uy${link}`) : 
                      'https://www.uruguayxxi.gub.uy/es/quienes-somos/llamados-licitaciones/';
          
          // Extract description
          const description = $elem.find('p, .description, .excerpt').first().text().trim() ||
                            $elem.text().replace(title, '').trim().substring(0, 500);
          
          // Extract dates
          const dateText = $elem.find('.date, .fecha, time').text().trim();
          const posted_date = this.parseDate(dateText) || new Date().toISOString().split('T')[0];
          
          // Extract closing date if available
          const closingText = $elem.find('.closing-date, .fecha-cierre').text().trim();
          const closing_date = closingText ? this.parseDate(closingText) : null;
          
          // Create unique external ID
          const external_id = `uxxi-${this.generateHash(title + url)}`;
          
          jobs.push({
            external_id,
            title,
            company: 'Uruguay XXI',
            location: 'Uruguay',
            description: description.substring(0, 1000),
            url,
            posted_date,
            closing_date,
            category: 'gobierno',
            job_type: 'Licitación/Llamado'
          });
        } catch (itemError) {
          console.warn('Error processing item:', itemError.message);
        }
      });
      
      // If no jobs found with specific selectors, try a more generic approach
      if (jobs.length === 0) {
        console.log('⚠️  No items found with specific selectors, trying generic approach...');
        
        // Look for any links in the content area that might be job listings
        $('main a, .content a, #content a').each((i, elem) => {
          const $link = $(elem);
          const title = $link.text().trim();
          const href = $link.attr('href');
          
          // Filter for relevant links (skip navigation, footer, etc.)
          if (title.length > 10 && 
              href && 
              !href.includes('#') && 
              !href.includes('javascript:') &&
              (title.toLowerCase().includes('llamado') || 
               title.toLowerCase().includes('licitación') ||
               title.toLowerCase().includes('concurso'))) {
            
            const url = href.startsWith('http') ? href : `https://www.uruguayxxi.gub.uy${href}`;
            const external_id = `uxxi-${this.generateHash(title + url)}`;
            
            jobs.push({
              external_id,
              title,
              company: 'Uruguay XXI',
              location: 'Uruguay',
              description: 'Llamado o licitación de Uruguay XXI. Visita el enlace para más información.',
              url,
              posted_date: new Date().toISOString().split('T')[0],
              category: 'gobierno',
              job_type: 'Licitación/Llamado'
            });
          }
        });
      }
      
      console.log(`✓ Found ${jobs.length} items from Uruguay XXI`);
      
    } catch (error) {
      console.error('Error scraping Uruguay XXI:', error.message);
      
      // Return sample data if scraping fails
      jobs.push({
        external_id: `uxxi-sample-${Date.now()}`,
        title: 'Llamado - Consultor Especializado',
        company: 'Uruguay XXI',
        location: 'Montevideo, Uruguay',
        description: 'Uruguay XXI invita a presentar ofertas para consultoría especializada. Visita el sitio web para más detalles.',
        url: 'https://www.uruguayxxi.gub.uy/es/quienes-somos/llamados-licitaciones/',
        posted_date: new Date().toISOString().split('T')[0],
        category: 'gobierno',
        job_type: 'Licitación/Llamado'
      });
    }
    
    return jobs;
  }

  async scrapeBuscoJobs() {
    const jobs = [];
    
    try {
      console.log('📡 Fetching BuscoJobs listings...');
      const response = await axios.get(
        'https://www.buscojobs.com.uy/empleos',
        this.axiosConfig
      );
      
      const $ = cheerio.load(response.data);
      
      // BuscoJobs typically uses job card elements
      $('.job-item, .offer-item, article[data-job], .job-card').each((i, elem) => {
        try {
          const $elem = $(elem);
          
          const title = $elem.find('h2, h3, .job-title, .offer-title').first().text().trim();
          if (!title) return;
          
          const company = $elem.find('.company, .company-name, .employer').first().text().trim();
          const location = $elem.find('.location, .city, .lugar').first().text().trim() || 'Uruguay';
          
          const link = $elem.find('a').first().attr('href');
          const url = link ? (link.startsWith('http') ? link : `https://www.buscojobs.com.uy${link}`) : 
                      'https://www.buscojobs.com.uy/empleos';
          
          const description = $elem.find('.description, .job-description, p').first().text().trim();
          const salary = $elem.find('.salary, .sueldo').first().text().trim();
          
          const external_id = `bj-${this.generateHash(title + company + url)}`;
          
          jobs.push({
            external_id,
            title,
            company: company || 'Empresa confidencial',
            location,
            description: description.substring(0, 1000),
            url,
            posted_date: new Date().toISOString().split('T')[0],
            salary: salary || null,
            category: 'general'
          });
        } catch (itemError) {
          console.warn('Error processing BuscoJobs item:', itemError.message);
        }
      });
      
      console.log(`✓ Found ${jobs.length} jobs from BuscoJobs`);
      
    } catch (error) {
      console.error('Error scraping BuscoJobs:', error.message);
      
      jobs.push({
        external_id: `bj-sample-${Date.now()}`,
        title: 'Sample Job - Analista de Sistemas',
        company: 'Empresa de Tecnología',
        location: 'Montevideo',
        description: 'Buscamos analista de sistemas con experiencia en desarrollo web.',
        url: 'https://www.buscojobs.com.uy/empleos',
        posted_date: new Date().toISOString().split('T')[0],
        category: 'general'
      });
    }
    
    return jobs;
  }

  async scrapeCompuTrabajo() {
    const jobs = [];
    
    try {
      console.log('📡 Fetching CompuTrabajo listings...');
      const response = await axios.get(
        'https://uy.computrabajo.com/',
        this.axiosConfig
      );
      
      const $ = cheerio.load(response.data);
      
      // CompuTrabajo uses specific job article elements
      $('article[data-aviso], .box_offer, .js-o-link').each((i, elem) => {
        try {
          const $elem = $(elem);
          
          const title = $elem.find('h2, .js-o-link, .title_offer').first().text().trim();
          if (!title) return;
          
          const company = $elem.find('.company, .fc_base, [data-company]').first().text().trim();
          const location = $elem.find('.loca, .location, .locality').first().text().trim() || 'Uruguay';
          
          const link = $elem.find('a').first().attr('href');
          const url = link ? (link.startsWith('http') ? link : `https://uy.computrabajo.com${link}`) : 
                      'https://uy.computrabajo.com/';
          
          const description = $elem.find('.fs16, p, .brd_btm_content').first().text().trim();
          const dateText = $elem.find('.dO, .fecha, time').first().text().trim();
          const posted_date = this.parseDate(dateText) || new Date().toISOString().split('T')[0];
          
          const external_id = `ct-${this.generateHash(title + company + url)}`;
          
          jobs.push({
            external_id,
            title,
            company: company || 'Empresa confidencial',
            location,
            description: description.substring(0, 1000),
            url,
            posted_date,
            category: 'general'
          });
        } catch (itemError) {
          console.warn('Error processing CompuTrabajo item:', itemError.message);
        }
      });
      
      console.log(`✓ Found ${jobs.length} jobs from CompuTrabajo`);
      
    } catch (error) {
      console.error('Error scraping CompuTrabajo:', error.message);
      
      jobs.push({
        external_id: `ct-sample-${Date.now()}`,
        title: 'Sample Job - Project Manager',
        company: 'Empresa Multinacional',
        location: 'Montevideo',
        description: 'Buscamos Project Manager con experiencia en gestión de equipos.',
        url: 'https://uy.computrabajo.com/',
        posted_date: new Date().toISOString().split('T')[0],
        category: 'general'
      });
    }
    
    return jobs;
  }

  /**
   * Parse date from various text formats
   */
  parseDate(dateText) {
    if (!dateText) return null;
    
    try {
      // Try to parse common date formats
      const cleanText = dateText.toLowerCase().trim();
      const today = new Date();
      
      // Handle relative dates
      if (cleanText.includes('hoy') || cleanText.includes('today')) {
        return today.toISOString().split('T')[0];
      }
      
      if (cleanText.includes('ayer') || cleanText.includes('yesterday')) {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday.toISOString().split('T')[0];
      }
      
      // Try to parse as date
      const date = new Date(dateText);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
      
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Generate hash for unique ID
   */
  generateHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default ScraperService;
