import db from '../config/database.js';

console.log('🧹 Cleaning duplicate jobs...\n');

async function cleanDuplicates() {
  try {
    // Find jobs with the same URL but different IDs
    const duplicates = await db.prepare(`
      SELECT url, COUNT(*) as count, GROUP_CONCAT(id) as ids
      FROM jobs
      GROUP BY url
      HAVING count > 1
    `).all();

    console.log(`Found ${duplicates.length} URLs with duplicate entries\n`);

    let totalRemoved = 0;

    for (const dup of duplicates) {
      const ids = dup.ids.split(',').map(Number);
      console.log(`\n📋 URL: ${dup.url}`);
      console.log(`   Found ${ids.length} duplicates with IDs: ${ids.join(', ')}`);

      // Get details of all duplicates
      const jobs = await db.prepare(`
        SELECT id, title, closing_date, is_active, created_at
        FROM jobs
        WHERE id IN (${ids.join(',')})
        ORDER BY 
          CASE WHEN closing_date IS NOT NULL THEN 0 ELSE 1 END,
          created_at DESC
      `).all();

      // Keep the best one (newest with closing_date if available, otherwise just newest)
      const keepJob = jobs[0];
      const removeJobs = jobs.slice(1);

      console.log(`   ✅ Keeping: ID ${keepJob.id} - "${keepJob.title.substring(0, 50)}..." (closing: ${keepJob.closing_date || 'N/A'})`);
      
      for (const removeJob of removeJobs) {
        console.log(`   ❌ Removing: ID ${removeJob.id} - "${removeJob.title.substring(0, 50)}..." (closing: ${removeJob.closing_date || 'N/A'})`);
        await db.prepare('DELETE FROM jobs WHERE id = ?').run(removeJob.id);
        totalRemoved++;
      }
    }

    console.log(`\n✨ Cleanup completed!`);
    console.log(`📊 Total duplicates removed: ${totalRemoved}`);

    // Show final statistics
    const stats = await db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN closing_date IS NOT NULL THEN 1 ELSE 0 END) as with_closing_date
      FROM jobs
    `).get();

    console.log(`\n📈 Current database stats:`);
    console.log(`   Total jobs: ${stats.total}`);
    console.log(`   Active: ${stats.active}`);
    console.log(`   Inactive: ${stats.total - stats.active}`);
    console.log(`   With closing date: ${stats.with_closing_date}`);

  } catch (error) {
    console.error('❌ Error cleaning duplicates:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

cleanDuplicates();
