import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'server', 'budget.db');
const db = new Database(dbPath);

console.log(`Exporting database from ${dbPath}...`);

const transactions = db.prepare('SELECT * FROM transactions').all();
const recurring = db.prepare('SELECT * FROM recurring_items').all();
const planned = db.prepare('SELECT * FROM planned_items').all();
const savings = db.prepare('SELECT * FROM savings_goals').all();
const settings = db.prepare('SELECT * FROM settings').all();

const backup = {
    metadata: {
        version: '1.0',
        exportDate: new Date().toISOString()
    },
    data: {
        transactions,
        recurring,
        planned,
        savings,
        settings
    }
};

const outputPath = path.join(__dirname, `budget_backup_${new Date().toISOString().split('T')[0]}.json`);
fs.writeFileSync(outputPath, JSON.stringify(backup, null, 2));

console.log(`Backup saved to ${outputPath}`);
