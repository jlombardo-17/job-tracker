import BaseScraper from './BaseScraper.js';
import * as cheerio from 'cheerio';

/**
 * Scraper for Uruguay XXI job listings
 * Extracts llamados and licitaciones from Uruguay XXI website
 */
class UruguayXXIScraper extends BaseScraper {
  constructor(source, config) {
    super(source, config);
    this.baseUrl = 'https://www.uruguayxxi.gub.uy';
  }

  /**
   * Scrape jobs from Uruguay XXI
   * @returns {Promise<Array>} Array of job objects
   */
  async scrape() {
    const jobs = [];
    
    try {
      this.log('Fetching llamados...');
      const response = await this.fetchWithRetry(this.source.url);
      const $ = cheerio.load(response.data);
      
      // Try specific selectors first
      const specificJobs = this.extractWithSpecificSelectors($);
      if (specificJobs.length > 0) {
        jobs.push(...specificJobs);
      } else {
        // Fallback to generic approach
        this.log('No items found with specific selectors, trying generic approach...', 'warn');
        const genericJobs = this.extractWithGenericSelectors($);
        jobs.push(...genericJobs);
      }
      
      this.log(`Found ${jobs.length} items`, 'success');
      
    } catch (error) {
      this.log(`Error: ${error.message}`, 'error');
      throw error;
    }
    
    return jobs.filter(job => this.validateJob(job));
  }

  /**
   * Extract jobs using specific CSS selectors
   * @param {object} $ - Cheerio instance
   * @returns {Array} Array of job objects
   */
  extractWithSpecificSelectors($) {
    const jobs = [];
    const selectors = [
      '.llamados-item',
      '.job-listing',
      'article.llamado',
      '.licitacion-item'
    ];
    
    $(selectors.join(', ')).each((i, elem) => {
      try {
        const job = this.extractJobFromElement($, $(elem));
        if (job) jobs.push(job);
      } catch (error) {
        this.log(`Error processing item: ${error.message}`, 'warn');
      }
    });
    
    return jobs;
  }

  /**
   * Extract jobs using generic link matching
   * @param {object} $ - Cheerio instance
   * @returns {Array} Array of job objects
   */
  extractWithGenericSelectors($) {
    const jobs = [];
    const contentSelectors = ['main a', '.content a', '#content a'];
    
    $(contentSelectors.join(', ')).each((i, elem) => {
      const $link = $(elem);
      let title = this.cleanText($link.text());
      const href = $link.attr('href');
      
      // Filter for relevant links
      if (this.isRelevantLink(title, href)) {
        const job = this.createJobFromLink(title, href);
        if (job) jobs.push(job);
      }
    });
    
    return jobs;
  }

  /**
   * Extract job data from a single element
   * @param {object} $ - Cheerio instance
   * @param {object} $elem - Element to extract from
   * @returns {object|null} Job object or null
   */
  extractJobFromElement($, $elem) {
    // Extract title
    let title = this.cleanText(
      $elem.find('h2, h3, .title, .llamado-title').first().text() ||
      $elem.find('a').first().text()
    );
    
    if (!title || title.length < 3) return null;
    
    // Extract and clean closing date from title
    const { cleanTitle, closingDate } = this.extractClosingDateFromTitle(title);
    title = cleanTitle;
    
    // Extract link
    const link = $elem.find('a').first().attr('href');
    const url = this.normalizeUrl(link, this.baseUrl);
    
    // Extract description
    const description = this.cleanText(
      $elem.find('p, .description, .excerpt').first().text() ||
      $elem.text().replace(title, ''),
      1000
    );
    
    // Extract posted date
    const dateText = $elem.find('.date, .fecha, time').text().trim();
    const postedDate = this.parseDate(dateText) || new Date().toISOString().split('T')[0];
    
    // Create job object
    return {
      external_id: `uxxi-${this.generateHash(url)}`,
      title,
      company: 'Uruguay XXI',
      location: 'Uruguay',
      description: description || 'Llamado o licitación de Uruguay XXI. Visita el enlace para más información.',
      url,
      posted_date: postedDate,
      closing_date: closingDate,
      category: 'gobierno',
      job_type: 'Licitación/Llamado'
    };
  }

  /**
   * Create job object from a link
   * @param {string} title - Job title
   * @param {string} href - Link href
   * @returns {object|null} Job object or null
   */
  createJobFromLink(title, href) {
    const { cleanTitle, closingDate } = this.extractClosingDateFromTitle(title);
    const url = this.normalizeUrl(href, this.baseUrl);
    
    return {
      external_id: `uxxi-${this.generateHash(url)}`,
      title: cleanTitle,
      company: 'Uruguay XXI',
      location: 'Uruguay',
      description: 'Llamado o licitación de Uruguay XXI. Visita el enlace para más información.',
      url,
      posted_date: new Date().toISOString().split('T')[0],
      closing_date: closingDate,
      category: 'gobierno',
      job_type: 'Licitación/Llamado'
    };
  }

  /**
   * Check if a link is relevant (related to llamados/licitaciones)
   * @param {string} title - Link text
   * @param {string} href - Link href
   * @returns {boolean} Whether link is relevant
   */
  isRelevantLink(title, href) {
    if (!title || title.length < 10 || !href) return false;
    if (href.includes('#') || href.includes('javascript:')) return false;
    
    const keywords = ['llamado', 'licitación', 'licitacion', 'concurso'];
    const titleLower = title.toLowerCase();
    
    return keywords.some(keyword => titleLower.includes(keyword));
  }

  /**
   * Extract closing date from title and return clean title
   * @param {string} title - Title with possible date
   * @returns {object} Object with cleanTitle and closingDate
   */
  extractClosingDateFromTitle(title) {
    let closingDate = null;
    let cleanTitle = title;
    
    // Match DD/MM/YYYY format at the end of title
    const dateMatch = title.match(/(\d{2}\/\d{2}\/\d{4})/);
    if (dateMatch) {
      const [day, month, year] = dateMatch[1].split('/');
      closingDate = `${year}-${month}-${day}`;
      // Remove the date from title
      cleanTitle = title.replace(/\s*\d{2}\/\d{2}\/\d{4}\s*$/g, '').trim();
    }
    
    return { cleanTitle, closingDate };
  }
}

export default UruguayXXIScraper;
