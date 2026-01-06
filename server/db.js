import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DB_PATH || path.join(__dirname, 'budget.db');
const db = new Database(dbPath);

// Initialize Tables
const init = () => {
    // Settings Table (for initial balance, etc.)
    db.prepare(`
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    `).run();

    // Transactions Table
    db.prepare(`
        CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            label TEXT NOT NULL,
            amount REAL NOT NULL,
            date TEXT NOT NULL, 
            type TEXT NOT NULL,
            category TEXT,
            status TEXT DEFAULT 'confirmed',
            recurring_id TEXT
        )
    `).run();

    // Recurring Items Table
    db.prepare(`
        CREATE TABLE IF NOT EXISTS recurring_items (
            id TEXT PRIMARY KEY,
            label TEXT NOT NULL,
            amount REAL NOT NULL,
            type TEXT NOT NULL,
            category TEXT,
            day_of_month INTEGER NOT NULL,
            start_date TEXT,
            end_date TEXT,
            duration_months INTEGER
        )
    `).run();

    // Savings Goals Table
    db.prepare(`
        CREATE TABLE IF NOT EXISTS savings_goals (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            target_amount REAL NOT NULL,
            current_amount REAL DEFAULT 0,
            deadline TEXT,
            icon TEXT,
            color TEXT
        )
    `).run();

    // Users Table
    db.prepare(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    `).run();

    // Seed default admin if not exists
    const userCount = db.prepare('SELECT count(*) as count FROM users').get();
    if (userCount.count === 0) {
        const hash = '$2b$10$NICbGfYnAQDLg82gr4JaVOKRrUJWqiir5Tb4iliz0W0w.4D7aGAWm'; // admin123
        db.prepare('INSERT INTO users (id, username, password) VALUES (?, ?, ?)').run(uuidv4(), 'admin', hash);
        console.log('Default admin user created');
    }


    // Planned Exceptions (One-off planned items)
    db.prepare(`
        CREATE TABLE IF NOT EXISTS planned_items (
            id TEXT PRIMARY KEY,
            label TEXT NOT NULL,
            amount REAL NOT NULL,
            date TEXT NOT NULL,
            type TEXT NOT NULL,
            category TEXT,
            status TEXT DEFAULT 'planned'
        )
    `).run();

    console.log('Database initialized');
};

init();

export default db;
