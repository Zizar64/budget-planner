
import fs from 'fs';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: 5432,
});

async function importData() {
    const backupPath = path.join(__dirname, 'backup_import.json');
    if (!fs.existsSync(backupPath)) {
        console.error('Backup file not found at:', backupPath);
        process.exit(1);
    }

    const content = fs.readFileSync(backupPath, 'utf8');
    const backup = JSON.parse(content);
    const { data } = backup;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('Importing Settings...');
        for (const item of data.settings) {
            await client.query(
                'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
                [item.key, item.value]
            );
        }

        console.log('Importing Transactions...');
        for (const item of data.transactions) {
            await client.query(
                `INSERT INTO transactions (id, label, amount, date, type, category, status, recurring_id) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 ON CONFLICT (id) DO NOTHING`,
                [item.id, item.label, item.amount, item.date, item.type, item.category, item.status, item.recurring_id]
            );
        }

        console.log('Importing Recurring Items...');
        for (const item of data.recurring) {
            await client.query(
                `INSERT INTO recurring_items (id, label, amount, type, category, day_of_month, start_date, end_date, duration_months) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 ON CONFLICT (id) DO NOTHING`,
                [item.id, item.label, item.amount, item.type, item.category, item.day_of_month, item.start_date, item.end_date, item.duration_months]
            );
        }

        console.log('Importing Planned Items...');
        for (const item of data.planned) {
            await client.query(
                `INSERT INTO planned_items (id, label, amount, date, type, category, status) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 ON CONFLICT (id) DO NOTHING`,
                [item.id, item.label, item.amount, item.date, item.type, item.category, item.status]
            );
        }

        console.log('Importing Savings Goals...');
        for (const item of data.savings) {
            await client.query(
                `INSERT INTO savings_goals (id, name, target_amount, current_amount, deadline, icon, color) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 ON CONFLICT (id) DO NOTHING`,
                [item.id, item.name, item.target_amount, item.current_amount, item.deadline, item.icon, item.color]
            );
        }

        await client.query('COMMIT');
        console.log('Import completed successfully!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Import Error:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

importData();
