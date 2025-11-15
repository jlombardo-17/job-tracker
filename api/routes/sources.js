import express from 'express';
import Source from '../../src/models/Source.js';

const router = express.Router();

// Get all sources
router.get('/', async (req, res) => {
  try {
    const sources = await Source.getAll();
    res.json({
      success: true,
      data: sources
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get source by ID
router.get('/:id', async (req, res) => {
  try {
    const source = await Source.getById(req.params.id);
    
    if (!source) {
      return res.status(404).json({
        success: false,
        error: 'Source not found'
      });
    }

    res.json({
      success: true,
      data: source
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get source statistics
router.get('/:id/stats', async (req, res) => {
  try {
    const stats = await Source.getStats(req.params.id);
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Toggle source enabled/disabled
router.patch('/:id/toggle', async (req, res) => {
  try {
    const { enabled } = req.body;
    await Source.toggleEnabled(req.params.id, enabled);
    
    res.json({
      success: true,
      message: `Source ${enabled ? 'enabled' : 'disabled'}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
