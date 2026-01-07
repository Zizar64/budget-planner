import Database from 'better-sqlite3';

const db = new Database('/opt/budget-planner/server/budget.db'); // Direct path check
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

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
