import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// __dirname is scripts/, so we go up one level to root, then server/budget.db
const dbPath = path.join(__dirname, '..', 'server', 'budget.db');

console.log(`Initializing database at: ${dbPath}`);
const db = new Database(dbPath);

const password = '2448ElkaRec1998***';
const hash = bcrypt.hashSync(password, 10);

console.log('Hash generated');

try {
    // Remove admin
    const del = db.prepare("DELETE FROM users WHERE username = 'admin'").run();
    console.log(`Removed admin: ${del.changes}`);

    // Add/Update Lucas
    const lucas = db.prepare("SELECT * FROM users WHERE username = 'Lucas'").get();
    if (!lucas) {
        db.prepare("INSERT INTO users (id, username, password) VALUES (?, ?, ?)").run(uuidv4(), 'Lucas', hash);
        console.log('Created user Lucas');
    } else {
        db.prepare("UPDATE users SET password = ? WHERE username = 'Lucas'").run(hash);
        console.log('Updated user Lucas password');
    }
} catch (e) {
    console.error(e);
}
