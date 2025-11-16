import BaseScraper from './BaseScraper.js';
import * as cheerio from 'cheerio';

/**
 * Scraper for CompuTrabajo Uruguay
 */
class CompuTrabajoScraper extends BaseScraper {
  constructor(source, config) {
    super(source, config);
    this.baseUrl = 'https://uy.computrabajo.com';
  }

  /**
   * Scrape jobs from CompuTrabajo
   * @returns {Promise<Array>} Array of job objects
   */
  async scrape() {
    const jobs = [];
    
    try {
      this.log('Fetching job listings...');
      const response = await this.fetchWithRetry(this.source.url);
      const $ = cheerio.load(response.data);
      
      // CompuTrabajo uses specific job listing structure
      const selectors = [
        'article[data-link]',
        '.box_offer',
        '.job-offer',
        'div[id*="offer"]'
      ];
      
      $(selectors.join(', ')).each((i, elem) => {
        try {
          const job = this.extractJob($, $(elem));
          if (job && this.validateJob(job)) {
            jobs.push(job);
          }
        } catch (error) {
          this.log(`Error processing job: ${error.message}`, 'warn');
        }
      });
      
      this.log(`Found ${jobs.length} jobs`, jobs.length > 0 ? 'success' : 'warn');
      
    } catch (error) {
      this.log(`Error: ${error.message}`, 'error');
      return [];
    }
    
    return jobs;
  }

  /**
   * Extract job from element
   * @param {object} $ - Cheerio instance
   * @param {object} $elem - Job element
   * @returns {object|null} Job object
   */
  extractJob($, $elem) {
    const title = this.cleanText(
      $elem.find('h2, h3, .js-o-link, a[class*="title"]').first().text()
    );
    
    if (!title || title.length < 3) return null;
    
    const link = $elem.find('a').first().attr('href') || 
                 $elem.attr('data-link');
    const url = this.normalizeUrl(link, this.baseUrl);
    
    const company = this.cleanText(
      $elem.find('.company, [class*="company"]').first().text()
    );
    
    const location = this.cleanText(
      $elem.find('.location, [class*="location"], [class*="lugar"]').first().text()
    ) || 'Uruguay';
    
    const description = this.cleanText(
      $elem.find('.offer_description, p').first().text(),
      500
    );
    
    const salary = this.cleanText(
      $elem.find('.salary, [class*="salario"]').first().text()
    );
    
    const dateText = $elem.find('.date, time, [class*="fecha"]').text().trim();
    const postedDate = this.parseDate(dateText) || new Date().toISOString().split('T')[0];
    
    return {
      external_id: `computrabajo-${this.generateHash(url)}`,
      title,
      company: company || 'No especificada',
      location,
      description: description || title,
      url,
      posted_date: postedDate,
      closing_date: null,
      salary: salary || null,
      job_type: null,
      category: null
    };
  }
}

export default CompuTrabajoScraper;
