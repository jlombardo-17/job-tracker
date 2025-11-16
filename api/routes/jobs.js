import express from 'express';
import Job from '../../src/models/Job.js';

const router = express.Router();

// Get all jobs with filters
router.get('/', async (req, res) => {
  try {
    // First, update any expired jobs
    await Job.updateExpiredJobs();
    
    const filters = {
      is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined,
      source_id: req.query.source_id,
      search: req.query.search,
      location: req.query.location,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined
    };

    const jobs = await Job.getAll(filters);
    res.json({
      success: true,
      count: jobs.length,
      data: jobs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get job by ID
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.getById(req.params.id);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    res.json({
      success: true,
      data: job
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get job statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await Job.getStats();
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

// Mark job as inactive
router.patch('/:id/deactivate', async (req, res) => {
  try {
    await Job.markInactive(req.params.id);
    res.json({
      success: true,
      message: 'Job marked as inactive'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update all expired jobs
router.post('/update-expired', async (req, res) => {
  try {
    const updatedCount = await Job.updateExpiredJobs();
    res.json({
      success: true,
      message: `${updatedCount} job(s) marked as inactive due to expired closing date`,
      count: updatedCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
