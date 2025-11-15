import db from '../../config/database.js';

class ScrapingLog {
  static async create(sourceId) {
    const stmt = db.prepare(`
      INSERT INTO scraping_log (source_id, status) 
      VALUES (?, 'running')
    `);
    const result = await stmt.run(sourceId);
    return result.lastInsertRowid;
  }

  static async complete(logId, data) {
    const { status, jobs_found, jobs_added, jobs_updated, error_message } = data;
    
    return await db.prepare(`
      UPDATE scraping_log 
      SET status = ?,
          jobs_found = ?,
          jobs_added = ?,
          jobs_updated = ?,
          error_message = ?,
          completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, jobs_found || 0, jobs_added || 0, jobs_updated || 0, error_message || null, logId);
  }

  static async getRecent(limit = 50) {
    return await db.prepare(`
      SELECT l.*, s.name as source_name
      FROM scraping_log l
      LEFT JOIN sources s ON l.source_id = s.id
      ORDER BY l.started_at DESC
      LIMIT ?
    `).all(limit);
  }

  static async getBySource(sourceId, limit = 10) {
    return await db.prepare(`
      SELECT * FROM scraping_log
      WHERE source_id = ?
      ORDER BY started_at DESC
      LIMIT ?
    `).all(sourceId, limit);
  }
}

export default ScrapingLog;
