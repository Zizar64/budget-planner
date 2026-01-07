
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: 5432,
});

async function checkTypes() {
    const client = await pool.connect();
    try {
        const res = await client.query('SELECT amount FROM transactions LIMIT 1');
        if (res.rows.length > 0) {
            const amount = res.rows[0].amount;
            console.log('Value:', amount);
            console.log('Type:', typeof amount);
        } else {
            console.log('No transactions found to test.');
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        client.release();
        pool.end();
    }
}

checkTypes();
