import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { query } from './db.js'; // Note: in node next with standard import, .js extension is required or use --experimental-specifier-resolution=node. TypeScript resolves .js to .ts source.
import { v4 as uuidv4 } from 'uuid';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import zlib from 'zlib';
import { promisify } from 'util';
import pg from 'pg'; // For Pool wrapper types if needed, but db.ts handles query

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

const app = express();
const port = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-it-in-prod';

// Extend Request type
interface AuthRequest extends Request {
    user?: {
        id: number;
        username: string;
    };
}

app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// --- AUTH MIDDLEWARE ---
const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies.token;
    if (!token) {
        res.sendStatus(401);
        return;
    }

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) {
            res.sendStatus(403);
            return;
        }
        (req as AuthRequest).user = user;
        next();
    });
};

// --- AUTH ---
app.post('/api/auth/login', async (req: Request, res: Response) => {
    const { username, password } = req.body;
    try {
        const result = await query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];

        if (!user || !bcrypt.compareSync(password, user.password)) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
        res.cookie('token', token, { httpOnly: true, secure: false });
        res.json({ id: user.id, username: user.username });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
    res.clearCookie('token');
    res.json({ success: true });
});

app.put('/api/auth/password', authenticateToken, async (req: Request, res: Response) => {
    const { oldPassword, newPassword } = req.body;
    const userId = (req as AuthRequest).user?.id;

    try {
        const result = await query('SELECT * FROM users WHERE id = $1', [userId]);
        const user = result.rows[0];

        if (!user) {
            res.sendStatus(404);
            return;
        }

        if (!bcrypt.compareSync(oldPassword, user.password)) {
            res.status(401).json({ error: 'Ancien mot de passe incorrect' });
            return;
        }

        const hashed = bcrypt.hashSync(newPassword, 10);
        await query('UPDATE users SET password = $1 WHERE id = $2', [hashed, userId]);

        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/auth/me', authenticateToken, (req: Request, res: Response) => {
    res.json((req as AuthRequest).user);
});

// --- SETTINGS ---
app.get('/api/settings/:key', authenticateToken, async (req: Request, res: Response) => {
    try {
        const result = await query('SELECT value FROM settings WHERE key = $1', [req.params.key]);
        const row = result.rows[0];
        res.json(row ? JSON.parse(row.value) : null);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/settings', authenticateToken, async (req: Request, res: Response) => {
    const { key, value } = req.body;
    try {
        await query(
            'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
            [key, JSON.stringify(value)]
        );
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// --- TRANSACTIONS ---
app.get('/api/transactions', authenticateToken, async (req: Request, res: Response) => {
    try {
        const result = await query('SELECT * FROM transactions');
        const mapped = result.rows.map((r: any) => ({
            ...r,
            recurringId: r.recurring_id
        }));
        res.json(mapped);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/transactions', authenticateToken, async (req: Request, res: Response) => {
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
        await query(
            `INSERT INTO transactions (id, label, amount, date, type, category, category_id, status, recurring_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [txn.id, txn.label, txn.amount, txn.date, txn.type, txn.category, txn.category_id, txn.status, txn.recurring_id]
        );
        res.json({ ...txn, recurringId: txn.recurring_id, categoryId: txn.category_id });
    } catch (err: any) {
        console.error("Insert Transaction Error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/transactions/:id', authenticateToken, async (req: Request, res: Response) => {
    const { id } = req.params;
    const { label, amount, date, type, category, status, recurringId } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (label !== undefined) { updates.push(`label = $${idx++}`); values.push(label); }
    if (amount !== undefined) { updates.push(`amount = $${idx++}`); values.push(amount); }
    if (date !== undefined) { updates.push(`date = $${idx++}`); values.push(date); }
    if (type !== undefined) { updates.push(`type = $${idx++}`); values.push(type); }
    if (category !== undefined) { updates.push(`category = $${idx++}`); values.push(category); }
    if (req.body.categoryId !== undefined) { updates.push(`category_id = $${idx++}`); values.push(req.body.categoryId); }
    if (status !== undefined) { updates.push(`status = $${idx++}`); values.push(status); }
    if (recurringId !== undefined) { updates.push(`recurring_id = $${idx++}`); values.push(recurringId); }

    if (updates.length === 0) {
        res.json({ success: true });
        return;
    }

    values.push(id);
    const sqlQuery = `UPDATE transactions SET ${updates.join(', ')} WHERE id = $${idx}`;

    try {
        await query(sqlQuery, values);
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/transactions/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
        await query('DELETE FROM transactions WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// --- RECURRING ---
app.get('/api/recurring', authenticateToken, async (req: Request, res: Response) => {
    try {
        const result = await query('SELECT * FROM recurring_items');
        const mapped = result.rows.map((r: any) => ({
            ...r,
            dayOfMonth: r.day_of_month,
            startDate: r.start_date,
            endDate: r.end_date,
            durationMonths: r.duration_months
        }));
        res.json(mapped);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/recurring', authenticateToken, async (req: Request, res: Response) => {
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
        await query(
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
    } catch (err: any) {
        console.error("Insert Recurring Error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/recurring/:id', authenticateToken, async (req: Request, res: Response) => {
    const { id } = req.params;
    const body = req.body;

    const updates: string[] = [];
    const values: any[] = [];
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

    if (updates.length === 0) {
        res.json({ success: true });
        return;
    }

    values.push(id);
    const sqlQuery = `UPDATE recurring_items SET ${updates.join(', ')} WHERE id = $${idx}`;

    try {
        await query(sqlQuery, values);
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/recurring/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
        await query('DELETE FROM recurring_items WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// --- PLANNED ITEMS ---
app.get('/api/planned', authenticateToken, async (req: Request, res: Response) => {
    try {
        const result = await query('SELECT * FROM planned_items');
        res.json(result.rows);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/planned', authenticateToken, async (req: Request, res: Response) => {
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
        await query(
            `INSERT INTO planned_items (id, label, amount, date, type, category, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [item.id, item.label, item.amount, item.date, item.type, item.category, item.status]
        );
        res.json(item);
    } catch (err: any) {
        console.error("Insert Planned Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- SAVINGS ---
app.get('/api/savings', authenticateToken, async (req: Request, res: Response) => {
    try {
        const result = await query('SELECT * FROM savings_goals');
        res.json(result.rows);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// --- CATEGORIES ---
app.get('/api/categories', authenticateToken, async (req: Request, res: Response) => {
    try {
        const result = await query('SELECT * FROM categories ORDER BY label ASC');
        res.json(result.rows);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/categories', authenticateToken, async (req: Request, res: Response) => {
    const { label, type, color, icon } = req.body;
    const id = uuidv4();
    try {
        await query(
            'INSERT INTO categories (id, label, type, color, icon) VALUES ($1, $2, $3, $4, $5)',
            [id, label, type, color, icon]
        );
        res.json({ id, label, type, color, icon });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/categories/:id', authenticateToken, async (req: Request, res: Response) => {
    const { id } = req.params;
    const { label, type, color, icon } = req.body;
    try {
        await query(
            'UPDATE categories SET label = $1, type = $2, color = $3, icon = $4 WHERE id = $5',
            [label, type, color, icon, id]
        );
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/categories/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
        await query('DELETE FROM categories WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// --- BACKUP & RESTORE ---
const getEncryptionKey = () => {
    return crypto.createHash('sha256').update(JWT_SECRET).digest();
};

app.get('/api/backup', authenticateToken, async (req: Request, res: Response) => {
    try {
        const [users, transactions, recurring, planned, savings, settings, categories] = await Promise.all([
            query('SELECT * FROM users'),
            query('SELECT * FROM transactions'),
            query('SELECT * FROM recurring_items'),
            query('SELECT * FROM planned_items'),
            query('SELECT * FROM savings_goals'),
            query('SELECT * FROM settings'),
            query('SELECT * FROM categories')
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

        const jsonStr = JSON.stringify(fullDump);
        const compressed = await gzip(jsonStr);

        const iv = crypto.randomBytes(16);
        const key = getEncryptionKey();
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

        const encrypted = Buffer.concat([cipher.update(compressed), cipher.final()]);
        const authTag = cipher.getAuthTag();

        await query(
            "INSERT INTO settings (key, value) VALUES ('last_backup', $1) ON CONFLICT (key) DO UPDATE SET value = $1",
            [JSON.stringify(new Date().toISOString())]
        );

        const finalBuffer = Buffer.concat([iv, authTag, encrypted]);

        const filename = `budget_backup_${new Date().toISOString().split('T')[0]}.budget`;
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(finalBuffer);

    } catch (err: any) {
        console.error("Backup error:", err);
        res.status(500).json({ error: "Backup failed: " + err.message });
    }
});

app.post('/api/restore', authenticateToken, async (req: Request, res: Response) => {
    const { data } = req.body;

    if (!data) {
        res.status(400).json({ error: "No data provided" });
        return;
    }

    // We need a dedicated client for transaction
    // Assuming query() uses pool.query, standard pg pool.query handles transactions if we just execute statements? 
    // No, standard pool.query auto-commits. We need a client.
    // In db.ts, we only exported 'query'. We need to export 'pool' or a function to get a client.
    // For now, let's just use simple queries with risk, OR update db.ts to export pool.
    // I will update db.ts to export pool so I can get a client.

    // TEMPORARY FIX: I will import pool from db.ts in next step or use direct pg import here.
    // Actually I can just use pool directly if I import logic differently.
    // Getting client is better.
    // For this step I'll assume 'query' works but without transaction safety for now, or assume I fix db.ts.
    // Wait, the previous JS code used db.connect().

    // I will stick to what the JS code did but I need access to db.connect().
    // my db.ts exports { query, initDB }. It does NOT export pool.
    // I should update db.ts to export pool.

    res.status(501).json({ error: "Restore refactoring pending db.ts update" });
});

app.listen(port, () => {
    console.log(`Backend server running at http://localhost:${port}`);
});
