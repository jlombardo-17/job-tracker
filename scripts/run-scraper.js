import ScraperService from '../src/services/ScraperService.js';

const scraperService = new ScraperService();

console.log('🕷️  Starting manual scraping process...');
console.log('⏰ Started at:', new Date().toLocaleString());

scraperService.scrapeAll()
  .then(results => {
    console.log('\n✅ Scraping completed!');
    console.log('📊 Results:');
    results.forEach(result => {
      if (result.success) {
        console.log(`  ✓ ${result.source}: ${result.jobs_found} jobs found, ${result.jobs_added} added, ${result.jobs_updated} updated`);
      } else {
        console.log(`  ✗ ${result.source}: ${result.error}`);
      }
    });
    console.log('\n⏰ Completed at:', new Date().toLocaleString());
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Scraping failed:', error);
    process.exit(1);
  });
