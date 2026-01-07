import express from 'express';
import cors from 'cors';
import db from './db.js';
import { v4 as uuidv4 } from 'uuid';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

const app = express();
const port = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-it-in-prod';

app.use(cors({
    origin: 'http://localhost:5173', // Adjust for Docker networking or env var
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// --- AUTH MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// --- AUTH ---
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];

        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
        res.cookie('token', token, { httpOnly: true, secure: false }); // secure: true in prod
        res.json({ id: user.id, username: user.username });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true });
});

app.put('/api/auth/password', authenticateToken, async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;

    try {
        const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
        const user = result.rows[0];

        if (!user) return res.sendStatus(404);

        if (!bcrypt.compareSync(oldPassword, user.password)) {
            return res.status(401).json({ error: 'Ancien mot de passe incorrect' });
        }

        const hashed = bcrypt.hashSync(newPassword, 10);
        await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, userId]);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
    res.json(req.user);
});

// --- SETTINGS ---
app.get('/api/settings/:key', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT value FROM settings WHERE key = $1', [req.params.key]);
        const row = result.rows[0];
        res.json(row ? JSON.parse(row.value) : null);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/settings', authenticateToken, async (req, res) => {
    const { key, value } = req.body;
    try {
        await db.query(
            'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
            [key, JSON.stringify(value)]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- TRANSACTIONS ---
app.get('/api/transactions', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM transactions');
        const mapped = result.rows.map(r => ({
            ...r,
            recurringId: r.recurring_id
        }));
        res.json(mapped);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/transactions', authenticateToken, async (req, res) => {
    const { label, amount, date, type, category, categoryId, status, recurringId } = req.body;
    const txn = {
        id: uuidv4(),
        label,
        amount,
        date,
        type,
        category,
        category_id: categoryId || null,
        status: status || 'confirmed',
        recurring_id: recurringId || null
    };

    try {
        await db.query(
            `INSERT INTO transactions (id, label, amount, date, type, category, category_id, status, recurring_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [txn.id, txn.label, txn.amount, txn.date, txn.type, txn.category, txn.category_id, txn.status, txn.recurring_id]
        );
        res.json({ ...txn, recurringId: txn.recurring_id, categoryId: txn.category_id });
    } catch (err) {
        console.error("Insert Transaction Error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/transactions/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { label, amount, date, type, category, status, recurringId } = req.body;

    const updates = [];
    const values = [];
    let idx = 1;

    if (label !== undefined) { updates.push(`label = $${idx++}`); values.push(label); }
    if (amount !== undefined) { updates.push(`amount = $${idx++}`); values.push(amount); }
    if (date !== undefined) { updates.push(`date = $${idx++}`); values.push(date); }
    if (type !== undefined) { updates.push(`type = $${idx++}`); values.push(type); }
    if (category !== undefined) { updates.push(`category = $${idx++}`); values.push(category); }
    if (req.body.categoryId !== undefined) { updates.push(`category_id = $${idx++}`); values.push(req.body.categoryId); }
    if (status !== undefined) { updates.push(`status = $${idx++}`); values.push(status); }
    if (recurringId !== undefined) { updates.push(`recurring_id = $${idx++}`); values.push(recurringId); }

    if (updates.length === 0) return res.json({ success: true });

    values.push(id);
    const query = `UPDATE transactions SET ${updates.join(', ')} WHERE id = $${idx}`;

    try {
        await db.query(query, values);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/transactions/:id', authenticateToken, async (req, res) => {
    try {
        await db.query('DELETE FROM transactions WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- RECURRING ---
app.get('/api/recurring', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM recurring_items');
        const mapped = result.rows.map(r => ({
            ...r,
            dayOfMonth: r.day_of_month,
            startDate: r.start_date,
            endDate: r.end_date,
            durationMonths: r.duration_months
        }));
        res.json(mapped);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/recurring', authenticateToken, async (req, res) => {
    const { label, amount, type, category, categoryId, dayOfMonth, startDate, endDate, durationMonths } = req.body;
    const item = {
        id: uuidv4(),
        label,
        amount,
        type,
        category,
        category_id: categoryId || null,
        day_of_month: dayOfMonth,
        start_date: startDate || null,
        end_date: endDate || null,
        duration_months: durationMonths || null
    };

    try {
        await db.query(
            `INSERT INTO recurring_items (id, label, amount, type, category, category_id, day_of_month, start_date, end_date, duration_months)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [item.id, item.label, item.amount, item.type, item.category, item.category_id, item.day_of_month, item.start_date, item.end_date, item.duration_months]
        );
        res.json({
            ...item,
            categoryId: item.category_id,
            dayOfMonth: item.day_of_month,
            startDate: item.start_date,
            endDate: item.end_date,
            durationMonths: item.duration_months
        });
    } catch (err) {
        console.error("Insert Recurring Error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/recurring/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const body = req.body;

    const updates = [];
    const values = [];
    let idx = 1;

    if (body.label !== undefined) { updates.push(`label = $${idx++}`); values.push(body.label); }
    if (body.amount !== undefined) { updates.push(`amount = $${idx++}`); values.push(body.amount); }
    if (body.type !== undefined) { updates.push(`type = $${idx++}`); values.push(body.type); }
    if (body.category !== undefined) { updates.push(`category = $${idx++}`); values.push(body.category); }
    if (body.categoryId !== undefined) { updates.push(`category_id = $${idx++}`); values.push(body.categoryId); }
    if (body.dayOfMonth !== undefined) { updates.push(`day_of_month = $${idx++}`); values.push(body.dayOfMonth); }
    if (body.startDate !== undefined) { updates.push(`start_date = $${idx++}`); values.push(body.startDate); }
    if (body.endDate !== undefined) { updates.push(`end_date = $${idx++}`); values.push(body.endDate); }
    if (body.durationMonths !== undefined) { updates.push(`duration_months = $${idx++}`); values.push(body.durationMonths); }

    if (updates.length === 0) return res.json({ success: true });

    values.push(id);
    const query = `UPDATE recurring_items SET ${updates.join(', ')} WHERE id = $${idx}`;

    try {
        await db.query(query, values);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/recurring/:id', authenticateToken, async (req, res) => {
    try {
        await db.query('DELETE FROM recurring_items WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- PLANNED ITEMS ---
app.get('/api/planned', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM planned_items');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/planned', authenticateToken, async (req, res) => {
    const { label, amount, date, type, category, status } = req.body;
    const item = {
        id: uuidv4(),
        label,
        amount,
        date,
        type,
        category,
        status: status || 'planned'
    };

    try {
        await db.query(
            `INSERT INTO planned_items (id, label, amount, date, type, category, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [item.id, item.label, item.amount, item.date, item.type, item.category, item.status]
        );
        res.json(item);
    } catch (err) {
        console.error("Insert Planned Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- SAVINGS ---
app.get('/api/savings', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM savings_goals');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- CATEGORIES ---
app.get('/api/categories', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM categories ORDER BY label ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/categories', authenticateToken, async (req, res) => {
    const { label, type, color, icon } = req.body;
    const id = uuidv4();
    try {
        await db.query(
            'INSERT INTO categories (id, label, type, color, icon) VALUES ($1, $2, $3, $4, $5)',
            [id, label, type, color, icon]
        );
        res.json({ id, label, type, color, icon });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/categories/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { label, type, color, icon } = req.body;
    try {
        await db.query(
            'UPDATE categories SET label = $1, type = $2, color = $3, icon = $4 WHERE id = $5',
            [label, type, color, icon, id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/categories/:id', authenticateToken, async (req, res) => {
    // When deleting a category, we set category_id to NULL in transactions/recurring
    // This is handled by ON DELETE SET NULL in the schema
    try {
        await db.query('DELETE FROM categories WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- BACKUP & RESTORE ---

// Helper to derive a 32-byte key from the JWT_SECRET
const getEncryptionKey = () => {
    return crypto.createHash('sha256').update(JWT_SECRET).digest();
};

app.get('/api/backup', authenticateToken, async (req, res) => {
    try {
        // 1. Fetch all data
        const [users, transactions, recurring, planned, savings, settings, categories] = await Promise.all([
            db.query('SELECT * FROM users'),
            db.query('SELECT * FROM transactions'),
            db.query('SELECT * FROM recurring_items'),
            db.query('SELECT * FROM planned_items'),
            db.query('SELECT * FROM savings_goals'),
            db.query('SELECT * FROM settings'),
            db.query('SELECT * FROM categories')
        ]);

        const fullDump = {
            version: 1,
            timestamp: new Date().toISOString(),
            data: {
                users: users.rows,
                transactions: transactions.rows,
                recurring_items: recurring.rows,
                planned_items: planned.rows,
                savings_goals: savings.rows,
                settings: settings.rows,
                categories: categories.rows
            }
        };

        // 2. Compress
        const jsonStr = JSON.stringify(fullDump);
        const compressed = await gzip(jsonStr);

        // 3. Encrypt (AES-256-GCM)
        const iv = crypto.randomBytes(16);
        const key = getEncryptionKey();
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

        const encrypted = Buffer.concat([cipher.update(compressed), cipher.final()]);
        const authTag = cipher.getAuthTag();

        // 4. Update Settings with last backup time
        await db.query(
            "INSERT INTO settings (key, value) VALUES ('last_backup', $1) ON CONFLICT (key) DO UPDATE SET value = $1",
            [JSON.stringify(new Date().toISOString())]
        );

        // Format: IV (16 bytes) + AuthTag (16 bytes) + Encrypted Data
        const finalBuffer = Buffer.concat([iv, authTag, encrypted]);

        // 5. Send as file
        const filename = `budget_backup_${new Date().toISOString().split('T')[0]}.budget`;
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(finalBuffer);

    } catch (err) {
        console.error("Backup error:", err);
        res.status(500).json({ error: "Backup failed: " + err.message });
    }
});

app.post('/api/restore', authenticateToken, async (req, res) => {
    // Expects JSON with base64 encoded data string
    const { data } = req.body;

    if (!data) {
        return res.status(400).json({ error: "No data provided" });
    }

    const client = await db.connect();

    try {
        // 1. Parse Buffer
        // The client sends "data:application/octet-stream;base64,....", so we need to strip the prefix if present
        const base64Data = data.split(';base64,').pop();
        const inputBuffer = Buffer.from(base64Data, 'base64');

        if (inputBuffer.length < 32) {
            throw new Error("Invalid backup file (too short)");
        }

        // 2. Extract IV, Tag, Data
        const iv = inputBuffer.subarray(0, 16);
        const authTag = inputBuffer.subarray(16, 32);
        const encryptedText = inputBuffer.subarray(32);

        // 3. Decrypt
        const key = getEncryptionKey();
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);

        const compressed = Buffer.concat([decipher.update(encryptedText), decipher.final()]);

        // 4. Decompress
        const jsonStr = (await gunzip(compressed)).toString();
        const dump = JSON.parse(jsonStr);

        if (!dump.data || !dump.version) {
            throw new Error("Invalid backup format (missing version or data)");
        }

        // 5. Transactional Restore
        await client.query('BEGIN');

        // Helper to clear and insert
        const restoreTable = async (tableName, rows) => {
            if (!rows || rows.length === 0) return;
            // Truncate
            await client.query(`TRUNCATE TABLE ${tableName} CASCADE`);

            // Insert each row
            for (const row of rows) {
                const keys = Object.keys(row);
                const values = Object.values(row);
                const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
                const query = `INSERT INTO ${tableName} (${keys.join(', ')}) VALUES (${placeholders})`;
                await client.query(query, values);
            }
        };

        // Order matters due to FK constraints
        await client.query('TRUNCATE TABLE transactions RESTART IDENTITY CASCADE');
        await client.query('TRUNCATE TABLE recurring_items RESTART IDENTITY CASCADE');
        await client.query('TRUNCATE TABLE planned_items RESTART IDENTITY CASCADE');
        await client.query('TRUNCATE TABLE savings_goals RESTART IDENTITY CASCADE');
        await client.query('TRUNCATE TABLE settings RESTART IDENTITY CASCADE');

        await restoreTable('categories', dump.data.categories);
        await restoreTable('users', dump.data.users);
        await restoreTable('transactions', dump.data.transactions);
        await restoreTable('recurring_items', dump.data.recurring_items);
        await restoreTable('planned_items', dump.data.planned_items);
        await restoreTable('savings_goals', dump.data.savings_goals);
        await restoreTable('settings', dump.data.settings);

        await client.query('COMMIT');
        res.json({ success: true, message: "Restoration complete" });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Restore error:", err);
        res.status(500).json({ error: "Restore failed: " + err.message });
    } finally {
        client.release();
    }
});

// Keep the legacy export endpoint for now if needed, or remove it. I'll remove it to avoid confusion/clutter and since I'm overwriting it.

app.listen(port, () => {
    console.log(`Backend server running at http://localhost:${port}`);
});
