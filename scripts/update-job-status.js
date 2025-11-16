import Job from '../src/models/Job.js';
import db from '../config/database.js';

console.log('🔄 Updating job statuses based on closing dates...\n');

async function updateJobStatuses() {
  try {
    // Update expired jobs
    const expiredCount = await Job.updateExpiredJobs();
    console.log(`✅ Marked ${expiredCount} expired job(s) as inactive\n`);

    // Get statistics
    const stats = await Job.getStats();
    console.log('📊 Current Statistics:');
    console.log(`   Total jobs: ${stats.total}`);
    console.log(`   Active jobs: ${stats.active}`);
    console.log(`   Inactive jobs: ${stats.total - stats.active}\n`);

    // Show some examples of jobs with closing dates
    const jobsWithDates = await db.prepare(`
      SELECT id, title, closing_date, is_active 
      FROM jobs 
      WHERE closing_date IS NOT NULL 
      ORDER BY closing_date DESC 
      LIMIT 10
    `).all();

    console.log('📅 Sample jobs with closing dates:');
    jobsWithDates.forEach(job => {
      const status = job.is_active ? '✓ Active' : '✗ Closed';
      console.log(`   ${status} - ${job.title.substring(0, 50)}... (closes: ${job.closing_date})`);
    });

    console.log('\n✨ Update completed!');
    
  } catch (error) {
    console.error('❌ Error updating job statuses:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

updateJobStatuses();
