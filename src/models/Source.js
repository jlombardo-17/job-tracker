import db from '../../config/database.js';

class Source {
  static async getAll() {
    return await db.prepare('SELECT * FROM sources ORDER BY name').all();
  }

  static async getById(id) {
    return await db.prepare('SELECT * FROM sources WHERE id = ?').get(id);
  }

  static async getEnabled() {
    return await db.prepare('SELECT * FROM sources WHERE enabled = 1').all();
  }

  static async updateLastScraped(id, jobsCount) {
    return await db.prepare(`
      UPDATE sources 
      SET last_scraped = CURRENT_TIMESTAMP, 
          total_jobs = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(jobsCount, id);
  }

  static async toggleEnabled(id, enabled) {
    return await db.prepare(`
      UPDATE sources 
      SET enabled = ?, 
          updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(enabled ? 1 : 0, id);
  }

  static async getStats(id) {
    const totalJobs = await db.prepare('SELECT COUNT(*) as count FROM jobs WHERE source_id = ?').get(id);
    const activeJobs = await db.prepare('SELECT COUNT(*) as count FROM jobs WHERE source_id = ? AND is_active = 1').get(id);
    const lastLog = await db.prepare('SELECT * FROM scraping_log WHERE source_id = ? ORDER BY started_at DESC LIMIT 1').get(id);

    return {
      total_jobs: totalJobs.count,
      active_jobs: activeJobs.count,
      last_scrape: lastLog
    };
  }
}

export default Source;
