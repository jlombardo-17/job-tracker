import axios from 'axios';

/**
 * Base abstract class for all job scrapers
 * Each source should extend this class and implement the scrape() method
 */
class BaseScraper {
  constructor(source, config = {}) {
    if (this.constructor === BaseScraper) {
      throw new Error("BaseScraper is an abstract class and cannot be instantiated directly");
    }

    this.source = source;
    this.config = {
      userAgent: config.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      timeout: config.timeout || 30000,
      retries: config.retries || 3,
      delay: config.delay || 1000,
      ...config
    };

    this.axiosConfig = {
      headers: {
        'User-Agent': this.config.userAgent
      },
      timeout: this.config.timeout
    };
  }

  /**
   * Abstract method - must be implemented by subclasses
   * @returns {Promise<Array>} Array of job objects
   */
  async scrape() {
    throw new Error("scrape() method must be implemented by subclass");
  }

  /**
   * Fetch a URL with retry logic
   * @param {string} url - URL to fetch
   * @param {object} options - Axios options
   * @returns {Promise<object>} Axios response
   */
  async fetchWithRetry(url, options = {}) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.config.retries; attempt++) {
      try {
        console.log(`  Attempt ${attempt}/${this.config.retries}: Fetching ${url}`);
        const response = await axios.get(url, { ...this.axiosConfig, ...options });
        return response;
      } catch (error) {
        lastError = error;
        console.warn(`  Attempt ${attempt} failed: ${error.message}`);
        
        if (attempt < this.config.retries) {
          const delay = this.config.delay * attempt; // Exponential backoff
          console.log(`  Retrying in ${delay}ms...`);
          await this.delay(delay);
        }
      }
    }
    
    throw new Error(`Failed to fetch ${url} after ${this.config.retries} attempts: ${lastError.message}`);
  }

  /**
   * Delay execution
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Parse a date string into ISO format (YYYY-MM-DD)
   * @param {string} dateText - Date text to parse
   * @returns {string|null} ISO date string or null
   */
  parseDate(dateText) {
    if (!dateText) return null;

    const text = dateText.toLowerCase().trim();
    const today = new Date();

    // Handle relative dates
    if (text.includes('hoy') || text.includes('today')) {
      return today.toISOString().split('T')[0];
    }

    if (text.includes('ayer') || text.includes('yesterday')) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday.toISOString().split('T')[0];
    }

    // Handle DD/MM/YYYY format
    const ddmmyyyyMatch = dateText.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (ddmmyyyyMatch) {
      const [, day, month, year] = ddmmyyyyMatch;
      return `${year}-${month}-${day}`;
    }

    // Handle YYYY-MM-DD format (already ISO)
    const isoMatch = dateText.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return isoMatch[0];
    }

    // Try native Date parsing as fallback
    try {
      const parsed = new Date(dateText);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
    } catch (e) {
      // Ignore parsing errors
    }

    return null;
  }

  /**
   * Generate a simple hash from a string
   * @param {string} str - String to hash
   * @returns {string} Hash string
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

  /**
   * Normalize a URL (ensure it's absolute)
   * @param {string} url - URL to normalize
   * @param {string} baseUrl - Base URL for relative paths
   * @returns {string} Absolute URL
   */
  normalizeUrl(url, baseUrl) {
    if (!url) return baseUrl;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    if (url.startsWith('//')) {
      return 'https:' + url;
    }
    if (url.startsWith('/')) {
      const base = new URL(baseUrl);
      return `${base.protocol}//${base.host}${url}`;
    }
    return baseUrl + '/' + url;
  }

  /**
   * Clean and truncate text
   * @param {string} text - Text to clean
   * @param {number} maxLength - Maximum length
   * @returns {string} Cleaned text
   */
  cleanText(text, maxLength = null) {
    if (!text) return '';
    
    let cleaned = text
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .replace(/\n+/g, ' ')   // Remove newlines
      .trim();
    
    if (maxLength && cleaned.length > maxLength) {
      cleaned = cleaned.substring(0, maxLength).trim();
    }
    
    return cleaned;
  }

  /**
   * Get scraper name
   * @returns {string} Scraper name
   */
  getName() {
    return this.constructor.name;
  }

  /**
   * Get source information
   * @returns {object} Source info
   */
  getSourceInfo() {
    return {
      id: this.source.id,
      name: this.source.name,
      url: this.source.url,
      scraper: this.getName()
    };
  }

  /**
   * Validate a job object has required fields
   * @param {object} job - Job object to validate
   * @returns {boolean} Whether job is valid
   */
  validateJob(job) {
    return job 
      && job.external_id 
      && job.title 
      && job.url 
      && job.title.length >= 3;
  }

  /**
   * Log scraping activity
   * @param {string} message - Log message
   * @param {string} level - Log level (info, warn, error)
   */
  log(message, level = 'info') {
    const prefix = `[${this.source.name}]`;
    
    switch (level) {
      case 'error':
        console.error(`❌ ${prefix} ${message}`);
        break;
      case 'warn':
        console.warn(`⚠️  ${prefix} ${message}`);
        break;
      case 'success':
        console.log(`✅ ${prefix} ${message}`);
        break;
      default:
        console.log(`ℹ️  ${prefix} ${message}`);
    }
  }
}

export default BaseScraper;
