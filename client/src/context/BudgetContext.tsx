import React, { createContext, useState, useEffect, useContext, useCallback, useMemo, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { addMonths, startOfMonth, endOfMonth, isSameMonth, parseISO, isBefore, isAfter, addDays, format, startOfDay, endOfDay } from 'date-fns';
import { Transaction, RecurringItem, PlannedItem, SavingsGoal, Category } from '../types';

interface BudgetContextType {
    balance: number;
    transactions: Transaction[];
    recurring: RecurringItem[];
    planned: PlannedItem[];
    savingsGoals: SavingsGoal[];
    categories: Category[];
    getProjection: (months?: number) => any[];
    addTransaction: (txn: Partial<Transaction>) => Promise<void>;
    updateTransaction: (id: string, fields: Partial<Transaction>) => Promise<void>;
    deleteTransaction: (id: string) => Promise<void>;
    addRecurringItem: (item: Partial<RecurringItem>) => Promise<void>;
    updateRecurringItem: (id: string, item: Partial<RecurringItem>) => Promise<void>;
    deleteRecurringItem: (id: string) => Promise<void>;
    addSavingsGoal: (goal: Partial<SavingsGoal>) => Promise<void>;
    addCategory: (cat: Partial<Category>) => Promise<void>;
    updateCategory: (id: number | string, cat: Partial<Category>) => Promise<void>;
    deleteCategory: (id: number | string) => Promise<void>;
    isPaidThisMonth: (itemId: string) => boolean;
    isSkippedThisMonth: (itemId: string) => boolean;
    initialBalance: number;
    setInitialBalance: (amount: number) => Promise<void>;
    getMonthlyReport: (date?: Date) => any[];
    getEventsForPeriod: (startDate: Date, endDate: Date) => any[];
}

const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

export const useBudget = () => {
    const context = useContext(BudgetContext);
    if (!context) {
        throw new Error("useBudget must be used within a BudgetProvider");
    }
    return context;
};

interface BudgetProviderProps {
    children: ReactNode;
}

export const BudgetProvider: React.FC<BudgetProviderProps> = ({ children }) => {
    const API_URL = '/api';

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [recurring, setRecurring] = useState<RecurringItem[]>([]);
    const [planned, setPlanned] = useState<PlannedItem[]>([]);
    const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [initialBalance, setInitialBalanceState] = useState<number>(0);

    // Initial Load
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [txnsRes, recRes, planRes, saveRes, balRes, catsRes] = await Promise.all([
                    fetch(`${API_URL}/transactions`),
                    fetch(`${API_URL}/recurring`),
                    fetch(`${API_URL}/planned`),
                    fetch(`${API_URL}/savings`),
                    fetch(`${API_URL}/settings/initialBalance`),
                    fetch(`${API_URL}/categories`)
                ]);

                const txns = await txnsRes.json();
                const recs = await recRes.json();
                const plans = await planRes.json();
                const saves = await saveRes.json();
                const bal = await balRes.json();
                const cats = await catsRes.json();

                // Normalize data
                setTransactions(txns ? txns.map((t: any) => ({ ...t, amount: Number(t.amount), recurringId: t.recurring_id || t.recurringId })) : []);
                setRecurring(recs ? recs.map((r: any) => ({ ...r, amount: Number(r.amount) })) : []);
                setPlanned(plans ? plans.map((p: any) => ({ ...p, amount: Number(p.amount) })) : []);
                setSavingsGoals(saves ? saves.map((s: any) => ({ ...s, target_amount: Number(s.target_amount), current_amount: Number(s.current_amount) })) : []);
                setCategories(cats || []);
                setInitialBalanceState(Number(bal) || 0);
            } catch (error) {
                console.error("Failed to load data:", error);
            }
        };
        fetchData();
    }, []);

    // Derived Balance
    const balance = useMemo(() => {
        const txnTotal = transactions
            .filter(t => !t.status || t.status === 'confirmed')
            .reduce((acc, t) => acc + Number(t.amount), 0);
        return initialBalance + txnTotal;
    }, [transactions, initialBalance]);

    // Initial Balance Setter
    const setInitialBalance = async (amount: number) => {
        setInitialBalanceState(amount);
        await fetch(`${API_URL}/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: 'initialBalance', value: amount })
        });
    };

    // --- Actions ---

    const addTransaction = async (txn: Partial<Transaction>) => {
        const amount = txn.type === 'expense' ? -Math.abs(txn.amount || 0) : Math.abs(txn.amount || 0);
        const newTxn = { ...txn, amount };

        const res = await fetch(`${API_URL}/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newTxn)
        });
        const savedTxn = await res.json();
        setTransactions(prev => [...prev, { ...savedTxn, amount: Number(savedTxn.amount), recurringId: savedTxn.recurring_id || savedTxn.recurringId }]);
    };

    const updateTransaction = async (id: string, updatedFields: Partial<Transaction>) => {
        let newAmount: number | undefined = undefined;
        if (updatedFields.amount !== undefined || updatedFields.type !== undefined) {
            const currentTxn = transactions.find(t => t.id === id);
            const type = updatedFields.type || currentTxn?.type || 'expense';
            const amountVal = updatedFields.amount !== undefined ? updatedFields.amount : Math.abs(currentTxn?.amount || 0);
            newAmount = type === 'expense' ? -Math.abs(amountVal) : Math.abs(amountVal);
        }

        const payload: any = { ...updatedFields };
        if (newAmount !== undefined) payload.amount = newAmount;

        await fetch(`${API_URL}/transactions/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...payload } : t));
    };

    const deleteTransaction = async (id: string) => {
        await fetch(`${API_URL}/transactions/${id}`, { method: 'DELETE' });
        setTransactions(prev => prev.filter(t => t.id !== id));
    };

    const addRecurringItem = async (item: Partial<RecurringItem>) => {
        const res = await fetch(`${API_URL}/recurring`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
        });
        const saved = await res.json();
        setRecurring(prev => [...prev, { ...saved, amount: Number(saved.amount) }]);
    };

    const updateRecurringItem = async (id: string, updatedItem: Partial<RecurringItem>) => {
        await fetch(`${API_URL}/recurring/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedItem)
        });
        setRecurring(prev => prev.map(item => item.id === id ? { ...item, ...updatedItem } : item));
    };

    const deleteRecurringItem = async (id: string) => {
        await fetch(`${API_URL}/recurring/${id}`, { method: 'DELETE' });
        setRecurring(prev => prev.filter(item => item.id !== id));
    };

    const addSavingsGoal = async (goal: Partial<SavingsGoal>) => {
        setSavingsGoals(prev => [...prev, { ...goal, id: uuidv4() } as SavingsGoal]);
        // TODO: Persist savings goal
    };

    const addCategory = async (cat: Partial<Category>) => {
        const res = await fetch(`${API_URL}/categories`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cat)
        });
        const saved = await res.json();
        setCategories(prev => [...prev, saved].sort((a, b) => a.label.localeCompare(b.label)));
    };

    const updateCategory = async (id: number | string, cat: Partial<Category>) => {
        await fetch(`${API_URL}/categories/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cat)
        });
        setCategories(prev => prev.map(c => c.id === id ? { ...c, ...cat } : c).sort((a, b) => a.label.localeCompare(b.label)));
    };

    const deleteCategory = async (id: number | string) => {
        await fetch(`${API_URL}/categories/${id}`, { method: 'DELETE' });
        setCategories(prev => prev.filter(c => c.id !== id));
    };

    // Generic Event Generation
    const getEventsForPeriod = useCallback((startDate: Date, endDate: Date) => {
        const events: any[] = [];
        const start = startOfDay(startDate);
        const end = endOfDay(endDate);

        // 1. One-off Planned Items
        planned.forEach(item => {
            const d = parseISO(item.date);
            if (!isBefore(d, start) && !isAfter(d, end)) {
                events.push({ ...item, dateObj: d, status: 'planned' });
            }
        });

        // 2. Planned Transactions
        transactions.filter(t => t.status === 'planned').forEach(t => {
            const d = parseISO(t.date);
            if (!isBefore(d, start) && !isAfter(d, end)) {
                events.push({ ...t, dateObj: d, status: 'planned' });
            }
        });

        // 3. Recurring Items
        let iterDate = startOfMonth(start);
        while (isBefore(iterDate, end)) {
            recurring.forEach(rec => {
                if (rec.durationMonths && rec.startDate) {
                    const recStart = parseISO(rec.startDate);
                    const recEnd = addMonths(recStart, Number(rec.durationMonths));
                    const currentMonth = startOfMonth(iterDate);
                    if (isBefore(currentMonth, startOfMonth(recStart)) || isAfter(currentMonth, endOfMonth(recEnd))) {
                        return;
                    }
                }

                const monthStart = startOfMonth(iterDate);
                const monthEnd = endOfMonth(monthStart);
                const safeDay = Math.min(Number(rec.dayOfMonth), parseInt(format(monthEnd, 'd')));
                const itemDate = new Date(iterDate.getFullYear(), iterDate.getMonth(), safeDay);

                const hasMatch = transactions.some(t =>
                    t.recurringId === rec.id &&
                    t.date &&
                    isSameMonth(parseISO(t.date), itemDate)
                );
                if (hasMatch) return;

                if (!isBefore(itemDate, start) && !isAfter(itemDate, end)) {
                    events.push({
                        ...rec,
                        date: format(itemDate, 'yyyy-MM-dd'),
                        dateObj: itemDate,
                        amount: rec.type === 'expense' ? -Math.abs(rec.amount) : Math.abs(rec.amount),
                        status: 'recurring'
                    });
                }
            });
            iterDate = addMonths(iterDate, 1);
        }

        return events.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
    }, [planned, transactions, recurring]);

    const getProjection = useCallback((months = 6) => {
        const today = new Date();
        const endDate = addMonths(today, months);
        const events = getEventsForPeriod(today, endDate);

        let runningBalance = balance;
        const dataPoints: any[] = [];
        dataPoints.push({ date: format(today, 'yyyy-MM-dd'), balance: runningBalance });

        events.forEach(e => {
            runningBalance += e.amount;
            dataPoints.push({
                date: e.date,
                balance: Math.round(runningBalance),
                label: e.label,
                amount: e.amount
            });
        });

        return dataPoints;
    }, [balance, getEventsForPeriod]);

    const getMonthlyReport = useCallback((monthDate = new Date()) => {
        const start = startOfMonth(monthDate);
        const end = endOfMonth(monthDate);

        const actuals = transactions.filter(t => {
            if (!t.date) return false;
            const d = parseISO(t.date);
            return !isBefore(d, start) && !isAfter(d, end);
        }).map(t => ({
            ...t,
            status: t.status || 'confirmed',
            dateObj: parseISO(t.date),
            isTransaction: true
        }));

        const allProjections = getEventsForPeriod(addDays(start, -1), end);
        const virtuals = allProjections.filter(p => p.status === 'recurring');

        let merged = [...actuals];
        virtuals.forEach(p => {
            const match = actuals.find(a => a.recurringId === p.id);
            if (!match) {
                merged.push(p);
            }
        });

        return merged.filter(i => i.status !== 'skipped').sort((a: any, b: any) => a.dateObj.getTime() - b.dateObj.getTime());
    }, [transactions, getEventsForPeriod]);

    const isPaidThisMonth = useCallback((itemId: string) => {
        const currentMonthStart = format(new Date(), 'yyyy-MM');
        return transactions.some(t =>
            t.recurringId === itemId &&
            t.date &&
            t.date.startsWith(currentMonthStart) &&
            t.status === 'confirmed'
        );
    }, [transactions]);

    const isSkippedThisMonth = useCallback((itemId: string) => {
        const currentMonthStart = format(new Date(), 'yyyy-MM');
        return transactions.some(t =>
            t.recurringId === itemId &&
            t.date &&
            t.date.startsWith(currentMonthStart) &&
            t.status === 'skipped'
        );
    }, [transactions]);

    const value = useMemo(() => ({
        balance,
        transactions,
        recurring,
        planned,
        savingsGoals,
        categories,
        getProjection,
        addTransaction,
        addSavingsGoal,
        addRecurringItem,
        updateRecurringItem,
        deleteRecurringItem,
        updateTransaction,
        deleteTransaction,
        addCategory,
        updateCategory,
        deleteCategory,
        isPaidThisMonth,
        isSkippedThisMonth,
        initialBalance,
        setInitialBalance,
        getMonthlyReport,
        getEventsForPeriod
    }), [
        balance, transactions, recurring, planned, savingsGoals, initialBalance,
        getProjection, getEventsForPeriod, getMonthlyReport, isPaidThisMonth, isSkippedThisMonth
    ]);

    return (
        <BudgetContext.Provider value={value}>
            {children}
        </BudgetContext.Provider>
    );
};
