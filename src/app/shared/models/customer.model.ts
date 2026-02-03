export type KycStatus = 'UNKNOWN' | 'UNVERIFIED' | 'VERIFIED' | 'CONTRACTED';

export interface Address {
  country: string;
  city: string;
  postalCode: string;
  line1: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  walletNumber: string;
  dateOfBirth: string;
  nationalId: number;
  address: Address;
  kycStatus: KycStatus;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerRequest {
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  nationalId: number;
  address: Address;
}

export interface UpdateCustomerRequest extends CreateCustomerRequest {
  kycStatus: KycStatus;
  isActive: boolean;
}
