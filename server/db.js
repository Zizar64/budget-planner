import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

const pool = new Pool({
    user: process.env.POSTGRES_USER || 'postgres',
    host: process.env.POSTGRES_HOST || 'db',
    database: process.env.POSTGRES_DB || 'budget_planner',
    password: process.env.POSTGRES_PASSWORD || 'password',
    port: 5432,
});

// Initialize Tables
const init = async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Settings Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        `);

        // Transactions Table
        await client.query(`
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
        `);

        // Recurring Items Table
        await client.query(`
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
        `);

        // Savings Goals Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS savings_goals (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                target_amount REAL NOT NULL,
                current_amount REAL DEFAULT 0,
                deadline TEXT,
                icon TEXT,
                color TEXT
            )
        `);

        // Categories Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS categories (
                id TEXT PRIMARY KEY,
                label TEXT NOT NULL,
                type TEXT NOT NULL,
                color TEXT,
                icon TEXT
            )
        `);

        // Add category_id to Transactions
        await client.query(`
            ALTER TABLE transactions 
            ADD COLUMN IF NOT EXISTS category_id TEXT REFERENCES categories(id) ON DELETE SET NULL
        `);

        // Add category_id to Recurring Items
        await client.query(`
            ALTER TABLE recurring_items 
            ADD COLUMN IF NOT EXISTS category_id TEXT REFERENCES categories(id) ON DELETE SET NULL
        `);

        // Users Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL
            )
        `);

        // Seed default user if not exists
        const userCountRes = await client.query('SELECT count(*) FROM users');
        if (parseInt(userCountRes.rows[0].count) === 0) {
            const hashedPassword = bcrypt.hashSync('admin', 10);
            await client.query('INSERT INTO users (id, username, password) VALUES ($1, $2, $3)', [uuidv4(), 'admin', hashedPassword]);
            console.log('Default admin user created: admin/admin');
        }

        // Seed default categories if not exists
        const categoryCountRes = await client.query('SELECT count(*) FROM categories');
        if (parseInt(categoryCountRes.rows[0].count) === 0) {
            const defaultCategories = [
                { label: 'Logement', type: 'expense', color: '#EF4444', icon: 'Home' },
                { label: 'Alimentation', type: 'expense', color: '#F59E0B', icon: 'ShoppingCart' },
                { label: 'Transport', type: 'expense', color: '#3B82F6', icon: 'Car' },
                { label: 'Loisirs', type: 'expense', color: '#8B5CF6', icon: 'Gamepad2' },
                { label: 'Salaire', type: 'income', color: '#10B981', icon: 'Banknote' },
                { label: 'Divers', type: 'expense', color: '#6B7280', icon: 'MoreHorizontal' }
            ];

            for (const cat of defaultCategories) {
                await client.query(
                    'INSERT INTO categories (id, label, type, color, icon) VALUES ($1, $2, $3, $4, $5)',
                    [uuidv4(), cat.label, cat.type, cat.color, cat.icon]
                );
            }
            console.log('Default categories seeded');
        }

        // Planned Exceptions
        await client.query(`
            CREATE TABLE IF NOT EXISTS planned_items (
                id TEXT PRIMARY KEY,
                label TEXT NOT NULL,
                amount REAL NOT NULL,
                date TEXT NOT NULL,
                type TEXT NOT NULL,
                category TEXT,
                status TEXT DEFAULT 'planned'
            )
        `);

        await client.query('COMMIT');
        console.log('Database initialized');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Error upgrading db', e);
    } finally {
        client.release();
    }
};

// We don't await init() at top level to avoid blocking import, but main server should wait or retry.
// For simplicity in this stack, we call it.
init();

export default pool;
