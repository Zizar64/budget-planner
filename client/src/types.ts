export interface Category {
    id: string;
    label: string;
    type: 'income' | 'expense';
    color: string;
    icon: string;
}

export interface Transaction {
    id: string; // UUID
    label: string;
    amount: number;
    date: string;
    type: 'income' | 'expense';
    category: string;
    categoryId?: string | null;
    status: string;
    recurringId?: string | null;
}

export interface RecurringItem {
    id: string;
    label: string;
    amount: number;
    type: 'income' | 'expense';
    category: string;
    categoryId?: string | null;
    dayOfMonth?: number;
    startDate?: string;
    endDate?: string;
    durationMonths?: number;
}

export interface PlannedItem {
    id: string;
    label: string;
    amount: number;
    date: string;
    type: 'income' | 'expense';
    category: string;
    status: string;
}

export interface SavingsGoal {
    id: string;
    label: string;
    target_amount: number;
    current_amount: number;
    deadline?: string;
}

export interface User {
    id: string;
    username: string;
}
