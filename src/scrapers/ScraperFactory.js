import UruguayXXIScraper from './UruguayXXIScraper.js';
import BuscoJobsScraper from './BuscoJobsScraper.js';
import CompuTrabajoScraper from './CompuTrabajoScraper.js';
import LinkedInScraper from './LinkedInScraper.js';

/**
 * Factory for creating scraper instances based on source
 */
class ScraperFactory {
  /**
   * Registry of available scrapers
   * Maps source IDs to their corresponding scraper classes
   */
  static scrapers = {
    'uruguay-xxi': UruguayXXIScraper,
    'buscojobs': BuscoJobsScraper,
    'computrabajo': CompuTrabajoScraper,
    'linkedin': LinkedInScraper,
    // Add more scrapers here as they are implemented
  };

  /**
   * Create a scraper instance for a given source
   * @param {object} source - Source object with id, name, url
   * @param {object} config - Scraper configuration
   * @returns {BaseScraper} Scraper instance
   * @throws {Error} If no scraper is configured for the source
   */
  static create(source, config = {}) {
    const ScraperClass = this.scrapers[source.id];
    
    if (!ScraperClass) {
      throw new Error(`No scraper configured for source: ${source.id}`);
    }
    
    return new ScraperClass(source, config);
  }

  /**
   * Check if a scraper exists for a source
   * @param {string} sourceId - Source ID
   * @returns {boolean} Whether scraper exists
   */
  static hasScraperFor(sourceId) {
    return sourceId in this.scrapers;
  }

  /**
   * Get list of available scraper source IDs
   * @returns {Array<string>} Array of source IDs
   */
  static getAvailableScrapers() {
    return Object.keys(this.scrapers);
  }

  /**
   * Register a new scraper
   * @param {string} sourceId - Source ID
   * @param {class} ScraperClass - Scraper class (must extend BaseScraper)
   */
  static register(sourceId, ScraperClass) {
    if (!ScraperClass.prototype || !ScraperClass.prototype.scrape) {
      throw new Error('Scraper class must extend BaseScraper and implement scrape() method');
    }
    
    this.scrapers[sourceId] = ScraperClass;
    console.log(`✅ Registered scraper for source: ${sourceId}`);
  }

  /**
   * Unregister a scraper
   * @param {string} sourceId - Source ID
   */
  static unregister(sourceId) {
    if (this.hasScraperFor(sourceId)) {
      delete this.scrapers[sourceId];
      console.log(`🗑️  Unregistered scraper for source: ${sourceId}`);
    }
  }
}

export default ScraperFactory;
