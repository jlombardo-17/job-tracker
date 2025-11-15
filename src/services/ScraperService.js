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
    const logId = ScrapingLog.create(sourceId);
    const source = Source.getById(sourceId);
    
    if (!source) {
      return { error: 'Source not found' };
    }

    console.log(`🔍 Scraping ${source.name}...`);

    try {
      let jobs = [];
      
      // Call specific scraper based on source
      switch (source.id) {
        case 'llamados-uy':
          jobs = await this.scrapeLlamadosUy();
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
        const result = Job.upsert({ ...jobData, source_id: sourceId });
        if (result.created) {
          jobsAdded++;
        } else {
          jobsUpdated++;
        }
      }

      // Update source stats
      Source.updateLastScraped(sourceId, jobs.length);

      // Complete log
      ScrapingLog.complete(logId, {
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
      
      ScrapingLog.complete(logId, {
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

  async scrapeLlamadosUy() {
    // Placeholder scraper - you'll need to adapt to actual site structure
    const jobs = [];
    
    try {
      const response = await axios.get('https://www.llamados.com.uy', this.axiosConfig);
      const $ = cheerio.load(response.data);
      
      // This is a generic example - adapt selectors to actual site
      $('.job-listing').each((i, elem) => {
        jobs.push({
          external_id: $(elem).attr('data-id') || `llamados-${Date.now()}-${i}`,
          title: $(elem).find('.job-title').text().trim(),
          company: $(elem).find('.company-name').text().trim(),
          location: $(elem).find('.location').text().trim(),
          description: $(elem).find('.description').text().trim(),
          url: $(elem).find('a').attr('href'),
          posted_date: new Date().toISOString().split('T')[0]
        });
      });
    } catch (error) {
      console.warn('Note: Scraper needs to be adapted to actual site structure');
      // Return sample data for testing
      jobs.push({
        external_id: `llamados-sample-${Date.now()}`,
        title: 'Sample Job - Desarrollador Full Stack',
        company: 'Empresa de ejemplo',
        location: 'Montevideo',
        description: 'Este es un trabajo de ejemplo para probar el sistema',
        url: 'https://www.llamados.com.uy',
        posted_date: new Date().toISOString().split('T')[0]
      });
    }
    
    return jobs;
  }

  async scrapeBuscoJobs() {
    const jobs = [];
    
    // Placeholder - adapt to actual site
    jobs.push({
      external_id: `buscojobs-sample-${Date.now()}`,
      title: 'Sample Job - Analista de Sistemas',
      company: 'BuscoJobs Test Company',
      location: 'Montevideo',
      description: 'Trabajo de ejemplo de BuscoJobs',
      url: 'https://www.buscojobs.com.uy',
      posted_date: new Date().toISOString().split('T')[0]
    });
    
    return jobs;
  }

  async scrapeCompuTrabajo() {
    const jobs = [];
    
    // Placeholder - adapt to actual site
    jobs.push({
      external_id: `computrabajo-sample-${Date.now()}`,
      title: 'Sample Job - Project Manager',
      company: 'CompuTrabajo Test Inc',
      location: 'Montevideo',
      description: 'Trabajo de ejemplo de CompuTrabajo',
      url: 'https://www.computrabajo.com.uy',
      posted_date: new Date().toISOString().split('T')[0]
    });
    
    return jobs;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default ScraperService;
