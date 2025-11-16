import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./data/jobs.db');

db.all(`SELECT id, title, closing_date, is_active FROM jobs WHERE url LIKE '%marca-pais%' OR title LIKE '%MARCA PAÍS%'`, (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Jobs matching "marca-pais":');
    console.log(JSON.stringify(rows, null, 2));
    
    // Also check the date comparison logic
    if (rows.length > 0) {
      const job = rows[0];
      const closingDate = new Date(job.closing_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      console.log('\nDate comparison:');
      console.log('Closing date:', job.closing_date);
      console.log('Closing date object:', closingDate);
      console.log('Today:', today.toISOString().split('T')[0]);
      console.log('Should be active:', closingDate >= today);
      console.log('Current is_active:', job.is_active);
    }
  }
  db.close();
});
