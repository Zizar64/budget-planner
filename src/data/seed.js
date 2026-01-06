import { v4 as uuidv4 } from 'uuid';

export const INITIAL_BALANCE = 0;
export const CURRENT_DATE = new Date();

export const RECURRING_ITEMS = [];

// Special One-time or Limited duration items logic will be handled in the Context or Transaction generator
// But we can define known future one-offs here
export const PLANNED_EXCEPTIONS = [];

// New Loan Repayment (9 months * 120)
// We can generate these programmatically or add them as planned
export const generateLoanRepayments = () => {
  return [];
};

export const INITIAL_TRANSACTIONS = [];
