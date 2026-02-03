export interface Wallet {
  customerId: string;
  currency: string;
  balance: number;
  dailyLimit: number;
  monthlyLimit: number;
}

export interface UpdateWalletLimitsRequest {
  dailyLimit: number;
  monthlyLimit: number;
}
