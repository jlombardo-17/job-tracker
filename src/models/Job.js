import db from '../../config/database.js';

class Job {
  static async getAll(filters = {}) {
    let query = 'SELECT * FROM jobs WHERE 1=1';
    const params = [];

    if (filters.is_active !== undefined) {
      query += ' AND is_active = ?';
      params.push(filters.is_active ? 1 : 0);
    }

    if (filters.source_id) {
      query += ' AND source_id = ?';
      params.push(filters.source_id);
    }

    if (filters.search) {
      query += ' AND (title LIKE ? OR company LIKE ? OR description LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (filters.location) {
      query += ' AND location LIKE ?';
      params.push(`%${filters.location}%`);
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    return await db.prepare(query).all(...params);
  }

  static async getById(id) {
    return await db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
  }

  static async create(jobData) {
    const {
      source_id,
      external_id,
      title,
      company,
      location,
      description,
      url,
      posted_date,
      closing_date,
      salary,
      job_type,
      category,
      tags
    } = jobData;

    const stmt = db.prepare(`
      INSERT INTO jobs (
        source_id, external_id, title, company, location, description,
        url, posted_date, closing_date, salary, job_type, category, tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = await stmt.run(
      source_id,
      external_id,
      title,
      company || null,
      location || null,
      description || null,
      url,
      posted_date || null,
      closing_date || null,
      salary || null,
      job_type || null,
      category || null,
      tags || null
    );

    return result.lastInsertRowid;
  }

  static async update(id, jobData) {
    const fields = [];
    const params = [];

    Object.keys(jobData).forEach(key => {
      if (key !== 'id') {
        fields.push(`${key} = ?`);
        params.push(jobData[key]);
      }
    });

    fields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const query = `UPDATE jobs SET ${fields.join(', ')} WHERE id = ?`;
    const stmt = db.prepare(query);
    return await stmt.run(...params);
  }

  static async upsert(jobData) {
    const existing = await db.prepare(
      'SELECT id FROM jobs WHERE source_id = ? AND external_id = ?'
    ).get(jobData.source_id, jobData.external_id);

    if (existing) {
      await this.update(existing.id, jobData);
      return { id: existing.id, created: false };
    } else {
      const id = await this.create(jobData);
      return { id, created: true };
    }
  }

  static async markInactive(id) {
    return await db.prepare('UPDATE jobs SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
  }

  static async getStats() {
    const total = await db.prepare('SELECT COUNT(*) as count FROM jobs').get();
    const active = await db.prepare('SELECT COUNT(*) as count FROM jobs WHERE is_active = 1').get();
    const bySource = await db.prepare(`
      SELECT source_id, COUNT(*) as count 
      FROM jobs 
      WHERE is_active = 1 
      GROUP BY source_id
    `).all();

    return {
      total: total.count,
      active: active.count,
      bySource
    };
  }
}

export default Job;
