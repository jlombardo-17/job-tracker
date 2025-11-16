import BaseScraper from './BaseScraper.js';
import * as cheerio from 'cheerio';

/**
 * Scraper implementation for LinkedIn Jobs Uruguay
 * @extends BaseScraper
 */
class LinkedInScraper extends BaseScraper {
  /**
   * Scrape LinkedIn job listings
   * @returns {Promise<Array>} Array of job objects
   */
  async scrape() {
    this.log('Fetching job listings...');
    
    const jobs = [];
    
    try {
      // LinkedIn requires authentication for most job listings
      // This is a simplified version that would need proper session handling
      const url = this.source.url || 'https://www.linkedin.com/jobs/search/?location=Uruguay';
      
      const html = await this.fetchWithRetry(url);
      const $ = cheerio.load(html);
      
      // LinkedIn job cards (simplified - actual selectors may vary)
      $('.base-card, .job-card-container, .jobs-search__results-list li').each((i, elem) => {
        const job = this.extractJob($, elem);
        if (job) {
          jobs.push(job);
        }
      });
      
      this.log(`Found ${jobs.length} jobs`, 'success');
      
    } catch (error) {
      this.log(`Error: ${error.message}`, 'error');
    }
    
    return jobs;
  }

  /**
   * Extract job data from LinkedIn job card element
   * @param {CheerioStatic} $ - Cheerio instance
   * @param {CheerioElement} elem - Job card element
   * @returns {object|null} Job object or null if invalid
   */
  extractJob($, elem) {
    try {
      const $elem = $(elem);
      
      // Extract title
      const title = this.cleanText(
        $elem.find('h3, .base-search-card__title, .job-card-list__title').first().text()
      );
      
      if (!title) return null;
      
      // Extract company
      const company = this.cleanText(
        $elem.find('h4, .base-search-card__subtitle, .job-card-container__company-name').first().text()
      ) || 'Empresa confidencial';
      
      // Extract location
      const location = this.cleanText(
        $elem.find('.job-search-card__location, .job-card-container__metadata-item').first().text()
      ) || 'Uruguay';
      
      // Extract URL
      const link = $elem.find('a').first().attr('href');
      if (!link) return null;
      
      const url = this.normalizeUrl(link, 'https://www.linkedin.com');
      
      // Extract description
      const description = this.cleanText(
        $elem.find('.base-search-card__snippet, .job-card-list__snippet').first().text(),
        1000
      ) || 'Visita LinkedIn para más detalles.';
      
      // Extract posting date
      const dateText = $elem.find('time, .job-search-card__listdate').first().attr('datetime') || 
                       $elem.find('time, .job-search-card__listdate').first().text();
      const posted_date = this.parseDate(dateText);
      
      // Generate external ID from URL
      const external_id = `li-${this.generateHash(url)}`;
      
      // Build job object
      const job = {
        external_id,
        title,
        company,
        location,
        description,
        url,
        posted_date,
        category: 'general'
      };
      
      // Validate before returning
      return this.validateJob(job) ? job : null;
      
    } catch (error) {
      this.log(`Error extracting job: ${error.message}`, 'warn');
      return null;
    }
  }
}

export default LinkedInScraper;
