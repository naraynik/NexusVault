import { Timestamp } from 'firebase/firestore';

export type ExpenseStatus = 'PAID' | 'ALERT' | 'PEND';
export type TransactionType = 'INCOME' | 'EXPENSE';

export interface Expense {
  id: string;
  userId: string;
  amount: number;
  category: string;
  type: TransactionType;
  timestamp: Timestamp;
  description: string;
  status: ExpenseStatus;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  totalBalance: number;
  vaultSavings: number;
  healthScore: number;
  country?: string;
  currency?: string;
}
