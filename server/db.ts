import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import pg from 'pg';
const { Pool } = pg;

export const pool = new Pool({
    user: process.env.POSTGRES_USER || 'myuser',
    host: process.env.POSTGRES_HOST || 'db',
    database: process.env.POSTGRES_DB || 'budget_db',
    password: process.env.POSTGRES_PASSWORD || 'mypassword',
    port: 5432,
});

export const query = (text: string, params?: any[]) => pool.query(text, params);

export const initDB = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS categories (
                id TEXT PRIMARY KEY,
                label VARCHAR(50) NOT NULL UNIQUE,
                type VARCHAR(20) CHECK (type IN ('income', 'expense')) NOT NULL,
                color VARCHAR(20) DEFAULT '#6366f1',
                icon VARCHAR(50) DEFAULT 'Circle'
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS transactions (
                id TEXT PRIMARY KEY,
                label VARCHAR(100) NOT NULL,
                amount DECIMAL(10, 2) NOT NULL,
                date DATE NOT NULL,
                type VARCHAR(10) CHECK (type IN ('income', 'expense')) NOT NULL,
                category VARCHAR(50),
                category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
                recurring_id VARCHAR(50),
                status VARCHAR(20) DEFAULT 'confirmed'
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS recurring_items (
                id VARCHAR(50) PRIMARY KEY,
                label VARCHAR(100) NOT NULL,
                amount DECIMAL(10, 2) NOT NULL,
                type VARCHAR(10) CHECK (type IN ('income', 'expense')) NOT NULL,
                category VARCHAR(50),
                category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
                day_of_month INTEGER,
                start_date DATE,
                end_date DATE,
                duration_months INTEGER
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS planned_items (
                id VARCHAR(50) PRIMARY KEY,
                label VARCHAR(100) NOT NULL,
                amount DECIMAL(10, 2) NOT NULL,
                date DATE NOT NULL,
                type VARCHAR(10) CHECK (type IN ('income', 'expense')) NOT NULL,
                category VARCHAR(50),
                status VARCHAR(20) DEFAULT 'planned'
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS savings_goals (
                id VARCHAR(50) PRIMARY KEY,
                label VARCHAR(100) NOT NULL,
                target_amount DECIMAL(10, 2) NOT NULL,
                current_amount DECIMAL(10, 2) DEFAULT 0,
                deadline DATE
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS settings (
                key VARCHAR(50) PRIMARY KEY,
                value JSONB NOT NULL
            );
        `);

        // Seed Default Categories
        const catCount = await pool.query('SELECT COUNT(*) FROM categories');
        if (parseInt(catCount.rows[0].count) === 0) {
            console.log("Seeding default categories...");
            const defaults = [
                ['Logement', 'expense', '#f43f5e', 'Home'],
                ['Alimentation', 'expense', '#f59e0b', 'ShoppingCart'],
                ['Transport', 'expense', '#3b82f6', 'Car'],
                ['Loisirs', 'expense', '#8b5cf6', 'Gamepad2'],
                ['Salaire', 'income', '#10b981', 'Banknote'],
                ['Divers', 'expense', '#64748b', 'MoreHorizontal']
            ];

            for (const cat of defaults) {
                await pool.query(
                    'INSERT INTO categories (id, label, type, color, icon) VALUES ($1, $2, $3, $4, $5)',
                    [uuidv4(), ...cat]
                );
            }
        }

        // Seed Default User
        const userCount = await pool.query('SELECT COUNT(*) FROM users');
        if (parseInt(userCount.rows[0].count) === 0) {
            console.log("Seeding default user...");
            const hashedPassword = bcrypt.hashSync('admin', 10);
            await pool.query(
                'INSERT INTO users (id, username, password) VALUES ($1, $2, $3)',
                [uuidv4(), 'admin', hashedPassword]
            );
        }

        console.log("Database initialized");
    } catch (err) {
        console.error("Error initializing database:", err);
    }
};

export default {
    query,
    initDB,
    pool
};
