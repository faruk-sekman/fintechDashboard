/*
 * Copyright (c) 2026 Fintech Dashboard contributors.
 */

import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';

import { CustomersApi } from '@core/api/customers.api';
import {
  ChainMeta,
  NetworkInfo,
  OnChainFacts,
  OperatorWallet,
  RiskAssessment,
  RiskDecision,
  RiskSignal,
  Web3Service,
} from '@core/services/web3.service';
import { ToastService } from '@core/services/toast.service';
import { Customer } from '@shared/models/customer.model';
import { Web3RiskComponent } from './web3-risk.component';

const SAMPLE_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
const NEXT_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';

const customer: Customer = {
  id: 'cust-1',
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '+905551112233',
  walletNumber: '1234567890123456',
  dateOfBirth: '1990-01-01',
  nationalId: 10000000146,
  address: {
    country: 'TR',
    city: 'Istanbul',
    postalCode: '34000',
    line1: 'Compliance Street',
  },
  kycStatus: 'VERIFIED',
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-02T00:00:00Z',
};

const chain: ChainMeta = {
  chainId: 1,
  chainName: 'Ethereum',
  explorerBaseUrl: 'https://etherscan.example',
};

const facts: OnChainFacts = {
  address: SAMPLE_ADDRESS,
  balanceWei: '0xde0b6b3a7640000',
  balanceEth: '1',
  txCount: 42,
  isContract: false,
};

const network: NetworkInfo = {
  chainId: 1,
  chainIdHex: '0x1',
  blockNumber: 123,
  gasPriceWei: '0x4a817c800',
  gasPriceGwei: '20',
};

const signals: RiskSignal[] = [
  { key: 'mixerExposure', hit: true, severity: 'medium' },
  { key: 'highVelocity', hit: false, severity: 'medium' },
  { key: 'suspiciousCounterparty', hit: false, severity: 'low' },
  { key: 'sanctionsHit', hit: false, severity: 'high' },
];

const clearSignals: RiskSignal[] = signals.map(signal => ({ ...signal, hit: false }));

function assessmentFor(decision: RiskDecision, level: RiskAssessment['level']): RiskAssessment {
  return { decision, level, signals };
}

function setup(options: {
  customerResult?: Observable<Customer>;
  factsResult?: Observable<OnChainFacts>;
  networkResult?: Observable<NetworkInfo>;
  hasWallet?: boolean;
  validAddress?: boolean;
  connectWallet?: () => Promise<OperatorWallet>;
  personalSign?: () => Promise<string>;
  onWalletEvents?: Web3Service['onWalletEvents'];
  assessRisk?: Web3Service['assessRisk'];
} = {}) {
  TestBed.resetTestingModule();

  const routeParamMap = new BehaviorSubject(convertToParamMap({ id: customer.id }));
  const route = { paramMap: routeParamMap.asObservable() };
  const router = { navigate: vi.fn() };
  const customersApi = {
    getById: vi.fn(() => options.customerResult ?? of(customer)),
  };
  const toast = {
    error: vi.fn(),
    success: vi.fn(),
  };
  const i18n = {
    instant: vi.fn((key: string, params?: Record<string, unknown>) => {
      if (key === 'web3.explanation.template') {
        return `count:${params?.['count']} list:${params?.['list']} decision:${params?.['decision']}`;
      }
      return `t:${key}`;
    }),
  };
  const web3 = {
    chainMeta: vi.fn(() => chain),
    hasWallet: vi.fn(() => options.hasWallet ?? true),
    isValidAddress: vi.fn(() => options.validAddress ?? true),
    generateSimulatedSignals: vi.fn(() => signals),
    simulatedLastTxHash: vi.fn(() => '0xabc123'),
    getOnChainFacts: vi.fn(() => options.factsResult ?? of(facts)),
    assessRisk: vi.fn(options.assessRisk ?? (() => assessmentFor('REVIEW', 'medium'))),
    getNetworkInfo: vi.fn(() => options.networkResult ?? of(network)),
    connectWallet: vi.fn(
      options.connectWallet ??
        (async () => ({ address: SAMPLE_ADDRESS, chainIdHex: '0x1' as const })),
    ),
    onWalletEvents: vi.fn(options.onWalletEvents ?? (() => () => undefined)),
    personalSign: vi.fn(options.personalSign ?? (async () => '0xsigned')),
    explorerAddressUrl: vi.fn((address: string) => `${chain.explorerBaseUrl}/address/${address}`),
    explorerTxUrl: vi.fn((hash: string) => `${chain.explorerBaseUrl}/tx/${hash}`),
  };

  TestBed.configureTestingModule({
    providers: [
      { provide: ActivatedRoute, useValue: route },
      { provide: Router, useValue: router },
      { provide: CustomersApi, useValue: customersApi },
      { provide: Web3Service, useValue: web3 },
      { provide: TranslateService, useValue: i18n },
      { provide: ToastService, useValue: toast },
    ],
  });

  const component = TestBed.runInInjectionContext(() => new Web3RiskComponent());
  return { component, customersApi, i18n, routeParamMap, router, toast, web3 };
}

describe('Web3RiskComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads customer, network, and seeded screening on init', () => {
    const { component, customersApi, web3 } = setup();

    component.ngOnInit();

    expect(customersApi.getById).toHaveBeenCalledWith(customer.id);
    expect(component.customer()).toEqual(customer);
    expect(component.loadingCustomer()).toBe(false);
    expect(component.network()).toEqual(network);
    expect(component.facts()).toEqual(facts);
    expect(component.assessment()?.decision).toBe('REVIEW');
    expect(component.screening()).toBe(false);
    expect(web3.getOnChainFacts).toHaveBeenCalledWith(SAMPLE_ADDRESS);
  });

  it('handles customer and network load failures with safe UI state', () => {
    const { component, toast } = setup({
      customerResult: throwError(() => new Error('not found')),
      networkResult: throwError(() => new Error('network')),
    });

    component.ngOnInit();

    expect(component.customer()).toBeNull();
    expect(component.loadingCustomer()).toBe(false);
    expect(component.network()).toBeNull();
    expect(toast.error).toHaveBeenCalledWith('t:errors.notFound');
  });

  it('rejects malformed addresses before any on-chain read', () => {
    const { component, web3 } = setup({ validAddress: false });
    component.facts.set(facts);
    component.assessment.set(assessmentFor('ALLOW', 'low'));
    component.simSignals.set(signals);
    component.lastTxHash.set('0xabc');
    component.addressControl.setValue('not-an-address');

    component.screen();

    expect(component.addressInvalid()).toBe(true);
    expect(component.facts()).toBeNull();
    expect(component.assessment()).toBeNull();
    expect(component.simSignals()).toEqual([]);
    expect(component.lastTxHash()).toBeNull();
    expect(web3.getOnChainFacts).not.toHaveBeenCalled();
  });

  it('keeps simulated assessment when on-chain reads fail', () => {
    const assessRisk = vi.fn(() => assessmentFor('ALLOW', 'low'));
    const { component } = setup({
      factsResult: throwError(() => new Error('rpc')),
      assessRisk,
    });

    component.screen();

    expect(component.factsError()).toBe(true);
    expect(component.screening()).toBe(false);
    expect(component.assessment()?.decision).toBe('ALLOW');
    expect(assessRisk).toHaveBeenCalledWith({}, signals);
  });

  it('passes undefined context when nullable on-chain facts are unavailable', () => {
    const assessRisk = vi.fn(() => assessmentFor('ALLOW', 'low'));
    const { component } = setup({
      factsResult: of({ ...facts, isContract: null, txCount: null }),
      assessRisk,
    });

    component.screen();

    expect(assessRisk).toHaveBeenCalledWith(
      { isContract: undefined, txCount: undefined },
      signals,
    );
  });

  it('connects wallet, responds to wallet events, and cleans up on destroy', async () => {
    let handlers: Parameters<Web3Service['onWalletEvents']>[0] | null = null;
    const cleanup = vi.fn();
    const { component, web3 } = setup({
      onWalletEvents: incoming => {
        handlers = incoming;
        return cleanup;
      },
    });

    await component.connect();

    expect(component.operator()).toEqual({ address: SAMPLE_ADDRESS, chainIdHex: '0x1' });
    expect(web3.onWalletEvents).toHaveBeenCalled();

    handlers?.onAccountsChanged([NEXT_ADDRESS]);
    expect(component.operator()?.address).toBe(NEXT_ADDRESS);

    handlers?.onChainChanged('0xaa');
    expect(component.operator()?.chainIdHex).toBe('0xaa');

    component.signature.set('0xsigned');
    handlers?.onAccountsChanged([]);
    expect(component.operator()).toBeNull();
    expect(component.signature()).toBeNull();

    handlers?.onAccountsChanged([NEXT_ADDRESS]);
    expect(component.operator()).toBeNull();

    handlers?.onChainChanged('0xbb');
    expect(component.operator()).toBeNull();

    await component.connect();
    component.signature.set('0xsigned');
    component.disconnect();
    expect(component.operator()).toBeNull();
    expect(component.signature()).toBeNull();
    expect(cleanup).toHaveBeenCalled();

    component.ngOnDestroy();
  });

  it('maps wallet connection errors to translated messages', async () => {
    const rejected = setup({ connectWallet: async () => Promise.reject({ code: 4001 }) });
    await rejected.component.connect();
    expect(rejected.component.walletError()).toBe('t:web3.wallet.rejected');

    const missing = setup({
      connectWallet: async () => Promise.reject({ message: 'no-wallet' }),
    });
    await missing.component.connect();
    expect(missing.component.walletError()).toBe('t:web3.wallet.notFound');

    const generic = setup({ connectWallet: async () => Promise.reject(new Error('boom')) });
    await generic.component.connect();
    expect(generic.component.walletError()).toBe('t:web3.wallet.error');
  });

  it('signs optional audit messages and handles sign failures', async () => {
    const ok = setup();
    await ok.component.signAudit();
    expect(ok.web3.personalSign).not.toHaveBeenCalled();

    ok.component.operator.set({ address: SAMPLE_ADDRESS, chainIdHex: '0x1' });
    await ok.component.signAudit();
    expect(ok.component.signature()).toBe('0xsigned');
    expect(ok.web3.personalSign).toHaveBeenCalledWith(SAMPLE_ADDRESS, 't:web3.signMessage');

    const failed = setup({ personalSign: async () => Promise.reject({ code: 4001 }) });
    failed.component.operator.set({ address: SAMPLE_ADDRESS, chainIdHex: '0x1' });
    await failed.component.signAudit();
    expect(failed.component.walletError()).toBe('t:web3.wallet.rejected');
  });

  it('records decisions, navigates back, and builds explorer links', () => {
    const { component, router, toast } = setup();

    component.record('BLOCK');
    expect(component.recommendation()).toBe('BLOCK');
    expect(toast.success).toHaveBeenCalledWith('t:web3.record.toast');

    component.back();
    expect(router.navigate).toHaveBeenCalledWith(['/customers']);

    component.customer.set(customer);
    component.back();
    expect(router.navigate).toHaveBeenCalledWith(['/customers', customer.id]);

    expect(component.addressExplorerUrl()).toContain(SAMPLE_ADDRESS);
    expect(component.txExplorerUrl('0xdef')).toContain('/tx/0xdef');
  });

  it('derives badge colors, explanations, risk level, and VC preview', () => {
    const { component } = setup();

    expect(component.decisionColor('BLOCK')).toBe('red');
    expect(component.decisionColor('REVIEW')).toBe('yellow');
    expect(component.decisionColor('ALLOW')).toBe('green');
    expect(component.decisionColor(null)).toBe('gray');
    expect(component.signalColor(true)).toBe('red');
    expect(component.signalColor(false)).toBe('green');

    component.assessment.set(assessmentFor('BLOCK', 'high'));
    expect(component.levelPercent()).toBe(100);
    expect(component.explanation()).toContain('count:1');

    component.assessment.set(assessmentFor('REVIEW', 'medium'));
    expect(component.levelPercent()).toBe(66);

    component.assessment.set(assessmentFor('ALLOW', 'low'));
    expect(component.levelPercent()).toBe(34);

    component.assessment.set({ decision: 'ALLOW', level: 'low', signals: clearSignals });
    expect(component.explanation()).toContain('t:web3.explanation.none');

    component.assessment.set(null);
    expect(component.levelPercent()).toBe(0);
    expect(component.explanation()).toBe('');

    component.customer.set(customer);
    expect(component.vc()?.credentialSubject.kycVerified).toBe(true);
    expect(component.vcJson()).toContain('KycCredential');

    component.customer.set({ ...customer, kycStatus: 'UNKNOWN' });
    expect(component.vc()?.credentialSubject.kycVerified).toBe(false);

    component.customer.set(null);
    expect(component.vc()).toBeNull();
    expect(component.vcJson()).toBe('');
  });
});
