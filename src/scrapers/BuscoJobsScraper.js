import BaseScraper from './BaseScraper.js';
import * as cheerio from 'cheerio';

/**
 * Scraper for BuscoJobs Uruguay
 */
class BuscoJobsScraper extends BaseScraper {
  constructor(source, config) {
    super(source, config);
    this.baseUrl = 'https://www.buscojobs.com.uy';
  }

  /**
   * Scrape jobs from BuscoJobs
   * @returns {Promise<Array>} Array of job objects
   */
  async scrape() {
    const jobs = [];
    
    try {
      this.log('Fetching job listings...');
      const response = await this.fetchWithRetry(this.source.url);
      const $ = cheerio.load(response.data);
      
      // BuscoJobs uses job cards or similar structure
      const selectors = [
        '.job-item',
        '.job-card',
        'article.job',
        '.offer-item'
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
      // Return empty array on error - let service handle it
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
      $elem.find('h2, h3, .job-title, .title').first().text()
    );
    
    if (!title || title.length < 3) return null;
    
    const link = $elem.find('a').first().attr('href');
    const url = this.normalizeUrl(link, this.baseUrl);
    
    const company = this.cleanText(
      $elem.find('.company, .employer, .company-name').first().text()
    );
    
    const location = this.cleanText(
      $elem.find('.location, .city, .place').first().text()
    ) || 'Uruguay';
    
    const description = this.cleanText(
      $elem.find('.description, .summary, p').first().text(),
      500
    );
    
    const dateText = $elem.find('.date, .posted, time').text().trim();
    const postedDate = this.parseDate(dateText) || new Date().toISOString().split('T')[0];
    
    return {
      external_id: `buscojobs-${this.generateHash(url)}`,
      title,
      company: company || 'No especificada',
      location,
      description: description || title,
      url,
      posted_date: postedDate,
      closing_date: null,
      salary: null,
      job_type: null,
      category: null
    };
  }
}

export default BuscoJobsScraper;
