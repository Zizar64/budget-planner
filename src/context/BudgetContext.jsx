import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { addMonths, startOfMonth, endOfMonth, isSameMonth, parseISO, isBefore, isAfter, addDays, format } from 'date-fns';


const BudgetContext = createContext();

export const useBudget = () => useContext(BudgetContext);

export const BudgetProvider = ({ children }) => {
    const API_URL = 'http://localhost:3000/api';

    const [transactions, setTransactions] = useState([]);
    const [recurring, setRecurring] = useState([]);
    const [planned, setPlanned] = useState([]); // Legacy planned items if any
    const [savingsGoals, setSavingsGoals] = useState([]);
    const [initialBalance, setInitialBalanceState] = useState(0);

    // Initial Load
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [txnsRes, recRes, planRes, saveRes, balRes] = await Promise.all([
                    fetch(`${API_URL}/transactions`),
                    fetch(`${API_URL}/recurring`),
                    fetch(`${API_URL}/planned`),
                    fetch(`${API_URL}/savings`),
                    fetch(`${API_URL}/settings/initialBalance`)
                ]);

                const txns = await txnsRes.json();
                const recs = await recRes.json();
                const plans = await planRes.json();
                const saves = await saveRes.json();
                const bal = await balRes.json();

                setTransactions(txns || []);
                setRecurring(recs || []);
                setPlanned(plans || []);
                setSavingsGoals(saves || []);
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
            .reduce((acc, t) => acc + t.amount, 0);
        return initialBalance + txnTotal;
    }, [transactions, initialBalance]);

    // Initial Balance Setter
    const setInitialBalance = async (amount) => {
        setInitialBalanceState(amount);
        await fetch(`${API_URL}/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: 'initialBalance', value: amount })
        });
    };

    // --- Actions ---

    const addTransaction = async (txn) => {
        // Optimistic UI update could be done here, but simple fetch for now
        const amount = txn.type === 'expense' ? -Math.abs(txn.amount) : Math.abs(txn.amount);
        const newTxn = { ...txn, amount };

        const res = await fetch(`${API_URL}/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newTxn)
        });
        const savedTxn = await res.json();
        setTransactions(prev => [...prev, savedTxn]);
    };

    const updateTransaction = async (id, updatedFields) => {
        let newAmount = undefined;
        if (updatedFields.amount !== undefined || updatedFields.type !== undefined) {
            const type = updatedFields.type || transactions.find(t => t.id === id)?.type || 'expense';
            const amountVal = updatedFields.amount !== undefined ? updatedFields.amount : Math.abs(transactions.find(t => t.id === id)?.amount || 0);
            newAmount = type === 'expense' ? -Math.abs(amountVal) : Math.abs(amountVal);
        }

        const payload = { ...updatedFields };
        if (newAmount !== undefined) payload.amount = newAmount;

        await fetch(`${API_URL}/transactions/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...payload } : t));
    };

    const deleteTransaction = async (id) => {
        await fetch(`${API_URL}/transactions/${id}`, { method: 'DELETE' });
        setTransactions(prev => prev.filter(t => t.id !== id));
    };

    const addRecurringItem = async (item) => {
        const res = await fetch(`${API_URL}/recurring`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
        });
        const saved = await res.json();
        setRecurring(prev => [...prev, saved]);
    };

    const updateRecurringItem = async (id, updatedItem) => {
        await fetch(`${API_URL}/recurring/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedItem)
        });
        setRecurring(prev => prev.map(item => item.id === id ? { ...item, ...updatedItem } : item));
    };

    const deleteRecurringItem = async (id) => {
        await fetch(`${API_URL}/recurring/${id}`, { method: 'DELETE' });
        setRecurring(prev => prev.filter(item => item.id !== id));
    };

    const addSavingsGoal = async (goal) => {
        setSavingsGoals(prev => [...prev, { ...goal, id: uuidv4() }]);
    };

    // Generic Event Generation (Same logic, mostly pure function using state)
    const getEventsForPeriod = useCallback((startDate, endDate) => {
        const events = [];

        // 1. One-off Planned Items
        planned.forEach(item => {
            const d = parseISO(item.date);
            if (isAfter(d, startDate) && isBefore(d, endDate)) {
                events.push({ ...item, dateObj: d, status: 'planned' });
            }
        });

        // 2. Planned Transactions
        transactions.filter(t => t.status === 'planned').forEach(t => {
            const d = parseISO(t.date);
            if (isAfter(d, startDate) && isBefore(d, endDate)) {
                events.push({ ...t, dateObj: d, status: 'planned' });
            }
        });

        // 3. Recurring Items
        let iterDate = startOfMonth(startDate);
        while (isBefore(iterDate, endDate)) {
            recurring.forEach(rec => {
                if (rec.durationMonths && rec.startDate) {
                    const start = parseISO(rec.startDate);
                    const end = addMonths(start, parseInt(rec.durationMonths));
                    const currentMonth = startOfMonth(iterDate);
                    if (isBefore(currentMonth, startOfMonth(start)) || isAfter(currentMonth, endOfMonth(end))) {
                        return;
                    }
                }

                const itemDate = new Date(iterDate.getFullYear(), iterDate.getMonth(), rec.dayOfMonth);
                if (isAfter(itemDate, startDate) && isBefore(itemDate, endDate)) {
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

        return events.sort((a, b) => a.dateObj - b.dateObj);
    }, [planned, transactions, recurring]);

    const getProjection = useCallback((months = 6) => {
        const today = new Date();
        const endDate = addMonths(today, months);
        const events = getEventsForPeriod(today, endDate);

        let runningBalance = balance;
        const dataPoints = [];
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

        // 1. Get ALL Real Transactions for the month (Confirmed OR Planned)
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

        // 2. Get Projections (Recurring Items ONLY)
        // We act as if we want events for the whole month context
        // Use 'end' directly to avoid overlapping into the 1st of next month (which would happen with addDays(end, 1))
        const allProjections = getEventsForPeriod(addDays(start, -1), end);

        // Filter out "Transactions" from projections (prevent duplicates)
        // We only want 'recurring' items (virtuals) that haven't been forcefully realized or paid
        const virtuals = allProjections.filter(p => p.status === 'recurring');

        let merged = [...actuals];
        virtuals.forEach(p => {
            // Check if this recurring item has a matching Real Transaction in this month
            // The match is based on recurringId
            const match = actuals.find(a => a.recurringId === p.id);
            if (!match) {
                merged.push(p);
            }
        });

        return merged.filter(i => i.status !== 'skipped').sort((a, b) => a.dateObj - b.dateObj);
    }, [transactions, getEventsForPeriod]);

    const isPaidThisMonth = useCallback((itemId) => {
        const currentMonthStart = format(new Date(), 'yyyy-MM');
        return transactions.some(t =>
            t.recurringId === itemId &&
            t.date &&
            t.date.startsWith(currentMonthStart)
        );
    }, [transactions]);

    const value = useMemo(() => ({
        balance,
        transactions,
        recurring,
        planned,
        savingsGoals,
        getProjection,
        addTransaction,
        addSavingsGoal,
        addRecurringItem,
        updateRecurringItem,
        deleteRecurringItem,
        updateTransaction,
        deleteTransaction,
        isPaidThisMonth,
        initialBalance,
        setInitialBalance,
        getMonthlyReport,
        getEventsForPeriod
    }), [
        balance, transactions, recurring, planned, savingsGoals, initialBalance,
        getProjection, getEventsForPeriod, getMonthlyReport, isPaidThisMonth
    ]);

    return (
        <BudgetContext.Provider value={value}>
            {children}
        </BudgetContext.Provider>
    );
};

