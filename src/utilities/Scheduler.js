import ScraperService from './services/ScraperService.js';

class Scheduler {
  constructor(intervalHours = 6) {
    this.intervalHours = intervalHours;
    this.intervalMs = intervalHours * 60 * 60 * 1000;
    this.scraperService = new ScraperService();
    this.isRunning = false;
  }

  async runScraping() {
    if (this.isRunning) {
      console.log('⚠️  Scraping already in progress, skipping...');
      return;
    }

    this.isRunning = true;
    console.log('\n🕷️  Automated scraping started at:', new Date().toLocaleString());

    try {
      const results = await this.scraperService.scrapeAll();
      
      console.log('✅ Automated scraping completed!');
      results.forEach(result => {
        if (result.success) {
          console.log(`  ✓ ${result.source}: ${result.jobs_found} jobs found, ${result.jobs_added} added, ${result.jobs_updated} updated`);
        } else {
          console.log(`  ✗ ${result.source}: ${result.error}`);
        }
      });
    } catch (error) {
      console.error('❌ Automated scraping error:', error);
    } finally {
      this.isRunning = false;
      console.log(`⏰ Next scraping scheduled in ${this.intervalHours} hours\n`);
    }
  }

  start() {
    console.log(`📅 Scheduler started - will run every ${this.intervalHours} hours`);
    console.log(`⏰ First run at: ${new Date(Date.now() + this.intervalMs).toLocaleString()}`);
    
    // Run immediately on start (optional - comment out if not desired)
    // this.runScraping();
    
    // Schedule periodic runs
    setInterval(() => {
      this.runScraping();
    }, this.intervalMs);
  }
}

export default Scheduler;
