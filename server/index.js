import express from 'express';
import cors from 'cors';
import db from './db.js';
import { v4 as uuidv4 } from 'uuid';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

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
    const { label, amount, date, type, category, status, recurringId } = req.body;
    const txn = {
        id: uuidv4(),
        label,
        amount,
        date,
        type,
        category,
        status: status || 'confirmed',
        recurring_id: recurringId || null
    };

    try {
        await db.query(
            `INSERT INTO transactions (id, label, amount, date, type, category, status, recurring_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [txn.id, txn.label, txn.amount, txn.date, txn.type, txn.category, txn.status, txn.recurring_id]
        );
        res.json({ ...txn, recurringId: txn.recurring_id });
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
    const { label, amount, type, category, dayOfMonth, startDate, endDate, durationMonths } = req.body;
    const item = {
        id: uuidv4(),
        label,
        amount,
        type,
        category,
        day_of_month: dayOfMonth,
        start_date: startDate || null,
        end_date: endDate || null,
        duration_months: durationMonths || null
    };

    try {
        await db.query(
            `INSERT INTO recurring_items (id, label, amount, type, category, day_of_month, start_date, end_date, duration_months)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [item.id, item.label, item.amount, item.type, item.category, item.day_of_month, item.start_date, item.end_date, item.duration_months]
        );
        res.json({
            ...item,
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

// --- EXPORT/BACKUP ---
app.get('/api/export', authenticateToken, async (req, res) => {
    try {
        const transactions = (await db.query('SELECT * FROM transactions')).rows;
        const recurring = (await db.query('SELECT * FROM recurring_items')).rows;
        const planned = (await db.query('SELECT * FROM planned_items')).rows;
        const savings = (await db.query('SELECT * FROM savings_goals')).rows;
        const settings = (await db.query('SELECT * FROM settings')).rows;

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

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=budget_backup_${new Date().toISOString().split('T')[0]}.json`);
        res.json(backup);
    } catch (err) {
        console.error("Export Error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(port, () => {
    console.log(`Backend server running at http://localhost:${port}`);
});
