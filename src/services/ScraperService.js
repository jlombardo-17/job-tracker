import Job from '../models/Job.js';
import Source from '../models/Source.js';
import ScrapingLog from '../models/ScrapingLog.js';
import ScraperFactory from '../scrapers/ScraperFactory.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Service for orchestrating web scraping operations
 * Uses ScraperFactory to instantiate specific scrapers for each source
 */
class ScraperService {
  constructor() {
    const configPath = join(__dirname, '../../config/sources.json');
    const configData = fs.readFileSync(configPath, 'utf-8');
    this.config = JSON.parse(configData);
  }

  /**
   * Scrape all enabled sources
   * @returns {Promise<Array>} Array of scraping results
   */
  async scrapeAll() {
    const sources = await Source.getEnabled();
    const results = [];

    for (const source of sources) {
      const result = await this.scrapeSource(source.id);
      results.push(result);
      
      // Delay between sources to avoid rate limiting
      await this.delay(this.config.scraperConfig.delay);
    }

    return results;
  }

  /**
   * Scrape a specific source
   * @param {string} sourceId - Source ID to scrape
   * @returns {Promise<object>} Scraping result
   */
  async scrapeSource(sourceId) {
    const logId = await ScrapingLog.create(sourceId);
    const source = await Source.getById(sourceId);
    
    if (!source) {
      return { error: 'Source not found' };
    }

    console.log(`🔍 Scraping ${source.name}...`);

    try {
      // Check if scraper is available for this source
      if (!ScraperFactory.hasScraperFor(source.id)) {
        throw new Error(`No scraper configured for ${source.id}`);
      }

      // Create scraper instance using factory
      const scraper = ScraperFactory.create(source, this.config.scraperConfig);
      
      // Execute scraping
      const jobs = await scraper.scrape();

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
      
      // Log error
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

  /**
   * Delay execution
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default ScraperService;
