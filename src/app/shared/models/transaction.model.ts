/*
 * Copyright (c) 2026 Fintech Dashboard contributors.
 */

export type TransactionType = 'DEBIT' | 'CREDIT';
export type TransferDirection = 'INCOMING' | 'OUTGOING';

export interface Transaction {
  id: string;
  customerId: string;
  type: TransactionType;
  amount: number;
  currency: string;
  createdAt: string;
  description: string;
  transferDirection: TransferDirection;
  merchantName?: string | null;
  receiverName?: string | null;
  receiverWalletNumber?: string | null;
}
