import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./data/jobs.db');

db.run(
  `INSERT OR REPLACE INTO sources (id, name, url, enabled) 
   VALUES (?, ?, ?, ?)`,
  [
    'uruguay-concursa',
    'Uruguay Concursa',
    'https://www.uruguayconcursa.gub.uy/Portal/servlet/com.si.recsel.dspllamados62',
    1
  ],
  function(err) {
    if (err) {
      console.error('❌ Error:', err.message);
    } else {
      console.log('✅ Uruguay Concursa added to database');
    }
    db.close();
  }
);
