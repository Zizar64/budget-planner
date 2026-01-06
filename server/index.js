import express from 'express';
import cors from 'cors';
import db from './db.js';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// --- SETTINGS ---
app.get('/api/settings/:key', (req, res) => {
    const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
    const row = stmt.get(req.params.key);
    res.json(row ? JSON.parse(row.value) : null);
});

app.post('/api/settings', (req, res) => {
    const { key, value } = req.body;
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    stmt.run(key, JSON.stringify(value));
    res.json({ success: true });
});

// --- TRANSACTIONS ---
app.get('/api/transactions', (req, res) => {
    const stmt = db.prepare('SELECT * FROM transactions');
    const rows = stmt.all();
    const mapped = rows.map(r => ({
        ...r,
        recurringId: r.recurring_id
    }));
    res.json(mapped);
});

app.post('/api/transactions', (req, res) => {
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

    const stmt = db.prepare(`
        INSERT INTO transactions (id, label, amount, date, type, category, status, recurring_id)
        VALUES (@id, @label, @amount, @date, @type, @category, @status, @recurring_id)
    `);

    try {
        stmt.run(txn);
        res.json({ ...txn, recurringId: txn.recurring_id });
    } catch (err) {
        console.error("Insert Transaction Error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/transactions/:id', (req, res) => {
    const { id } = req.params;
    const { label, amount, date, type, category, status, recurringId } = req.body;

    const updates = {};
    if (label !== undefined) updates.label = label;
    if (amount !== undefined) updates.amount = amount;
    if (date !== undefined) updates.date = date;
    if (type !== undefined) updates.type = type;
    if (category !== undefined) updates.category = category;
    if (status !== undefined) updates.status = status;
    if (recurringId !== undefined) updates.recurring_id = recurringId;

    if (Object.keys(updates).length === 0) return res.json({ success: true });

    const fields = Object.keys(updates).map(k => `${k} = @${k}`).join(', ');
    const stmt = db.prepare(`UPDATE transactions SET ${fields} WHERE id = @id`);

    try {
        stmt.run({ ...updates, id });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/transactions/:id', (req, res) => {
    const stmt = db.prepare('DELETE FROM transactions WHERE id = ?');
    stmt.run(req.params.id);
    res.json({ success: true });
});

// --- RECURRING ---
app.get('/api/recurring', (req, res) => {
    const stmt = db.prepare('SELECT * FROM recurring_items');
    const rows = stmt.all();
    const mapped = rows.map(r => ({
        ...r,
        dayOfMonth: r.day_of_month,
        startDate: r.start_date,
        endDate: r.end_date,
        durationMonths: r.duration_months
    }));
    res.json(mapped);
});

app.post('/api/recurring', (req, res) => {
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

    const stmt = db.prepare(`
        INSERT INTO recurring_items (id, label, amount, type, category, day_of_month, start_date, end_date, duration_months)
        VALUES (@id, @label, @amount, @type, @category, @day_of_month, @start_date, @end_date, @duration_months)
    `);

    try {
        stmt.run(item);
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

app.put('/api/recurring/:id', (req, res) => {
    const { id } = req.params;
    const body = req.body;

    const updates = {};
    if (body.label !== undefined) updates.label = body.label;
    if (body.amount !== undefined) updates.amount = body.amount;
    if (body.type !== undefined) updates.type = body.type;
    if (body.category !== undefined) updates.category = body.category;
    if (body.dayOfMonth !== undefined) updates.day_of_month = body.dayOfMonth;
    if (body.startDate !== undefined) updates.start_date = body.startDate;
    if (body.endDate !== undefined) updates.end_date = body.endDate;
    if (body.durationMonths !== undefined) updates.duration_months = body.durationMonths;

    if (Object.keys(updates).length === 0) return res.json({ success: true });

    const fields = Object.keys(updates).map(k => `${k} = @${k}`).join(', ');
    const stmt = db.prepare(`UPDATE recurring_items SET ${fields} WHERE id = @id`);

    try {
        stmt.run({ ...updates, id });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/recurring/:id', (req, res) => {
    const stmt = db.prepare('DELETE FROM recurring_items WHERE id = ?');
    stmt.run(req.params.id);
    res.json({ success: true });
});

// --- PLANNED ITEMS ---
app.get('/api/planned', (req, res) => {
    const stmt = db.prepare('SELECT * FROM planned_items');
    const rows = stmt.all();
    res.json(rows);
});

app.post('/api/planned', (req, res) => {
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
    const stmt = db.prepare(`
        INSERT INTO planned_items (id, label, amount, date, type, category, status)
        VALUES (@id, @label, @amount, @date, @type, @category, @status)
    `);

    try {
        stmt.run(item);
        res.json(item);
    } catch (err) {
        console.error("Insert Planned Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- SAVINGS ---
app.get('/api/savings', (req, res) => {
    const stmt = db.prepare('SELECT * FROM savings_goals');
    const rows = stmt.all();
    res.json(rows);
});

// --- EXPORT/BACKUP ---
app.get('/api/export', (req, res) => {
    try {
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
