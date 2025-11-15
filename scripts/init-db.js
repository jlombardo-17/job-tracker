import db from '../config/database.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🗄️  Initializing database...');

async function initDatabase() {
  try {
    // Create jobs table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id TEXT NOT NULL,
        external_id TEXT NOT NULL,
        title TEXT NOT NULL,
        company TEXT,
        location TEXT,
        description TEXT,
        url TEXT NOT NULL,
        posted_date TEXT,
        closing_date TEXT,
        salary TEXT,
        job_type TEXT,
        category TEXT,
        tags TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(source_id, external_id)
      )
    `);

    // Create sources table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS sources (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        enabled INTEGER DEFAULT 1,
        last_scraped TEXT,
        total_jobs INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create scraping_log table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS scraping_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id TEXT NOT NULL,
        status TEXT NOT NULL,
        jobs_found INTEGER DEFAULT 0,
        jobs_added INTEGER DEFAULT 0,
        jobs_updated INTEGER DEFAULT 0,
        error_message TEXT,
        started_at TEXT DEFAULT CURRENT_TIMESTAMP,
        completed_at TEXT,
        FOREIGN KEY(source_id) REFERENCES sources(id)
      )
    `);

    // Create indexes
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source_id)');
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_jobs_active ON jobs(is_active)');
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_jobs_posted ON jobs(posted_date)');
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_scraping_log_source ON scraping_log(source_id)');

    console.log('✅ Database tables created successfully');
    console.log('✅ Indexes created successfully');
    
    // Insert default sources from config
    const sources = [
      { id: 'uruguay-xxi', name: 'Uruguay XXI', url: 'https://www.uruguayxxi.gub.uy/es/quienes-somos/llamados-licitaciones/' },
      { id: 'buscojobs', name: 'BuscoJobs Uruguay', url: 'https://www.buscojobs.com.uy/empleos' },
      { id: 'computrabajo', name: 'CompuTrabajo Uruguay', url: 'https://uy.computrabajo.com/' },
      { id: 'linkedin', name: 'LinkedIn Jobs Uruguay', url: 'https://www.linkedin.com/jobs/search/?location=Uruguay' }
    ];

    const insertSource = db.prepare(`
      INSERT OR IGNORE INTO sources (id, name, url, enabled) 
      VALUES (?, ?, ?, 1)
    `);

    for (const source of sources) {
      await insertSource.run(source.id, source.name, source.url);
    }

    console.log('✅ Default sources inserted');
    console.log('🎉 Database initialization completed!');

  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

initDatabase();
