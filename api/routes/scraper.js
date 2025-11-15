import express from 'express';
import ScraperService from '../../src/services/ScraperService.js';
import ScrapingLog from '../../src/models/ScrapingLog.js';

const router = express.Router();
const scraperService = new ScraperService();

// Scrape all enabled sources
router.post('/all', async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Scraping started',
      note: 'This will run in the background'
    });

    // Run scraping in background
    scraperService.scrapeAll().catch(err => {
      console.error('Background scraping error:', err);
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Scrape specific source
router.post('/source/:sourceId', async (req, res) => {
  try {
    const result = await scraperService.scrapeSource(req.params.sourceId);
    
    res.json({
      success: result.success,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get scraping logs
router.get('/logs', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    const logs = await ScrapingLog.getRecent(limit);
    
    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get logs for specific source
router.get('/logs/:sourceId', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const logs = await ScrapingLog.getBySource(req.params.sourceId, limit);
    
    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
