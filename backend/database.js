const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./clinical.db');

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS trials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      disease TEXT,
      phase TEXT,
      region TEXT,
      endpoints TEXT,
      duration TEXT
    )
  `);
});

module.exports = db;