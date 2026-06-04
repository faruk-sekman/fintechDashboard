/*
 * Copyright (c) 2026 Fintech Dashboard contributors.
 */

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, retry } from 'rxjs/operators';

import { environment } from '../../../environments/environment';

/* ──────────────────────────────────────────────────────────────────────────
 * Types live here (in @core) so the service carries NO @features dependency.
 * The feature page re-uses them by importing from this service.
 * ────────────────────────────────────────────────────────────────────────── */

/** Minimal EIP-1193 provider surface we rely on (no wallet SDKs). */
export interface Eip1193RequestArgs {
  method: string;
  params?: unknown[] | Record<string, unknown>;
}

export interface Eip1193Provider {
  request(args: Eip1193RequestArgs): Promise<unknown>;
  on?(event: string, handler: (...args: unknown[]) => void): void;
  removeListener?(event: string, handler: (...args: unknown[]) => void): void;
  isMetaMask?: boolean;
}

/**
 * JSON-RPC envelope. IMPORTANT: nodes return HTTP 200 even for logical errors,
 * so `error` MUST be checked in code — the global errorInterceptor only reacts
 * to non-2xx responses and will not fire for these.
 */
export interface JsonRpcResponse<T = string> {
  jsonrpc?: string;
  id?: number | string;
  result?: T;
  error?: { code: number; message: string };
}

export type RiskDecision = 'ALLOW' | 'REVIEW' | 'BLOCK';
export type RiskLevel = 'low' | 'medium' | 'high';
export type RiskSignalKey =
  | 'mixerExposure'
  | 'highVelocity'
  | 'suspiciousCounterparty'
  | 'sanctionsHit';

export interface RiskSignal {
  key: RiskSignalKey;
  hit: boolean;
  severity: RiskLevel;
}

/**
 * On-chain context the production engine could factor in (EOA vs contract,
 * activity). The demo policy keys off the screening signals only.
 */
export interface RiskAccountContext {
  isContract?: boolean;
  txCount?: number;
}

export interface RiskAssessment {
  decision: RiskDecision;
  level: RiskLevel;
  signals: RiskSignal[];
}

export interface ChainMeta {
  chainId: number;
  chainName: string;
  explorerBaseUrl: string;
}

export interface OnChainFacts {
  address: string;
  balanceWei: string | null;
  balanceEth: string | null;
  txCount: number | null;
  isContract: boolean | null;
}

export interface NetworkInfo {
  chainId: number;
  chainIdHex: string;
  blockNumber: number;
  gasPriceWei: string;
  gasPriceGwei: string;
}

export interface OperatorWallet {
  address: string;
  chainIdHex: string;
}

/**
 * Read-only, non-custodial Web3 helper.
 *
 * - REAL data: key-free JSON-RPC reads via HttpClient + EIP-1193 wallet connect.
 * - SIMULATED data: deterministic demo AML signals (clearly labeled in the UI).
 *
 * No private keys, no transaction sending, no custody. wei->ETH is converted by
 * hand with BigInt (no ethers/web3/viem/wagmi).
 */
@Injectable({ providedIn: 'root' })
export class Web3Service {
  private readonly rpcUrl = environment.web3.rpcUrl;

  /** HttpClient-only ctor so the service is trivially testable via `new`. */
  constructor(private readonly http: HttpClient) {}

  /* ── Pure helpers ──────────────────────────────────────────────────────── */

  /**
   * Validates the 20-byte hex shape only.
   * NOTE: full EIP-55 checksum validation needs keccak256 (a crypto lib) and is
   * intentionally OUT OF SCOPE — we never claim checksum correctness here.
   */
  isValidAddress(address: string): boolean {
    return /^0x[0-9a-fA-F]{40}$/.test((address ?? '').trim());
  }

  /**
   * wei (hex) -> decimal string, by hand with BigInt (no wallet libs).
   * Handles '', '0x' and '0x0'. Use decimals=18 for ETH, 9 for gwei.
   */
  formatUnits(weiHex: string, decimals = 18, precision = 6): string {
    const clean = (weiHex ?? '').trim();
    if (!clean || clean === '0x') return '0';
    let value: bigint;
    try {
      value = BigInt(clean);
    } catch {
      return '0';
    }
    const negative = value < 0n;
    const abs = negative ? -value : value;
    const sign = negative ? '-' : '';
    const base = 10n ** BigInt(decimals);
    const whole = abs / base;
    const frac = abs % base;
    if (frac === 0n) return `${sign}${whole.toString()}`;
    const fracStr = frac.toString().padStart(decimals, '0').slice(0, precision).replace(/0+$/, '');
    if (!fracStr) return `${sign}${whole.toString()}`;
    return `${sign}${whole.toString()}.${fracStr}`;
  }

  /** hex quantity -> number. Safe for counts/blocks/chainIds. '' / '0x' -> 0. */
  hexToNumber(hex: string): number {
    const clean = (hex ?? '').trim();
    if (!clean || clean === '0x') return 0;
    try {
      return Number(BigInt(clean));
    } catch {
      return 0;
    }
  }

  chainMeta(): ChainMeta {
    return {
      chainId: environment.web3.chainId,
      chainName: environment.web3.chainName,
      explorerBaseUrl: environment.web3.explorerBaseUrl,
    };
  }

  explorerAddressUrl(address: string): string {
    return `${environment.web3.explorerBaseUrl}/address/${address}`;
  }

  explorerTxUrl(txHash: string): string {
    return `${environment.web3.explorerBaseUrl}/tx/${txHash}`;
  }

  /* ── EIP-1193 (operator wallet) ────────────────────────────────────────── */

  hasWallet(): boolean {
    return !!this.getProvider();
  }

  /** Local cast keeps the service independent of the ambient Window typing. */
  private getProvider(): Eip1193Provider | undefined {
    if (typeof window === 'undefined') return undefined;
    return (window as Window & { ethereum?: Eip1193Provider }).ethereum;
  }

  /**
   * Requests accounts + chainId from the injected wallet.
   * Throws the provider error untouched on rejection (code 4001) and a typed
   * 'no-wallet' error when no injected provider exists.
   */
  async connectWallet(): Promise<OperatorWallet> {
    const provider = this.getProvider();
    if (!provider) {
      throw { code: -32000, message: 'no-wallet' };
    }
    const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[];
    const chainIdHex = (await provider.request({ method: 'eth_chainId' })) as string;
    return { address: accounts?.[0] ?? '', chainIdHex };
  }

  /**
   * OPTIONAL, off by default: proof-of-control audit signature.
   * No private keys touch the app — the wallet signs; we only receive the
   * signature string. This is what turns "I screened an address" into
   * "I screened THIS customer's address".
   */
  async personalSign(address: string, message: string): Promise<string> {
    const provider = this.getProvider();
    if (!provider) {
      throw { code: -32000, message: 'no-wallet' };
    }
    return (await provider.request({
      method: 'personal_sign',
      params: [message, address],
    })) as string;
  }

  /**
   * Subscribes to provider account/chain changes; returns an unsubscribe fn the
   * component MUST call on destroy.
   */
  onWalletEvents(handlers: {
    onAccountsChanged: (accounts: string[]) => void;
    onChainChanged: (chainIdHex: string) => void;
  }): () => void {
    const provider = this.getProvider();
    if (!provider?.on || !provider.removeListener) {
      return () => undefined;
    }
    const accountsHandler = (...args: unknown[]): void =>
      handlers.onAccountsChanged((args[0] as string[]) ?? []);
    const chainHandler = (...args: unknown[]): void =>
      handlers.onChainChanged((args[0] as string) ?? '0x');
    provider.on('accountsChanged', accountsHandler);
    provider.on('chainChanged', chainHandler);
    return () => {
      provider.removeListener?.('accountsChanged', accountsHandler);
      provider.removeListener?.('chainChanged', chainHandler);
    };
  }

  /* ── REAL on-chain reads (key-free JSON-RPC over HttpClient) ───────────── */

  private rpc<T>(method: string, params: unknown[]): Observable<T> {
    return this.http
      .post<JsonRpcResponse<T>>(this.rpcUrl, { jsonrpc: '2.0', id: 1, method, params })
      .pipe(
        // Retry transient network failures (rate-limit, dropped/cancelled requests).
        // Logical JSON-RPC errors are thrown in map() below — AFTER retry — so they are not retried.
        retry({ count: 2, delay: 600 }),
        map(res => {
          // JSON-RPC errors arrive as HTTP 200 -> must be checked here.
          if (res.error) {
            throw new Error(`RPC ${method} failed: ${res.error.message}`);
          }
          if (res.result === undefined || res.result === null) {
            throw new Error(`RPC ${method} returned no result`);
          }
          return res.result;
        }),
      );
  }

  getBalance(address: string): Observable<string> {
    return this.rpc<string>('eth_getBalance', [address, 'latest']);
  }

  getTransactionCount(address: string): Observable<string> {
    return this.rpc<string>('eth_getTransactionCount', [address, 'latest']);
  }

  getCode(address: string): Observable<string> {
    return this.rpc<string>('eth_getCode', [address, 'latest']);
  }

  getChainId(): Observable<string> {
    return this.rpc<string>('eth_chainId', []);
  }

  getBlockNumber(): Observable<string> {
    return this.rpc<string>('eth_blockNumber', []);
  }

  getGasPrice(): Observable<string> {
    return this.rpc<string>('eth_gasPrice', []);
  }

  /** REAL: balance + activity + EOA-vs-contract for a screened address. */
  getOnChainFacts(address: string): Observable<OnChainFacts> {
    // Per-call resilience: one failing read (rate-limit, blocked/cancelled request)
    // must not sink the others. forkJoin only errors when EVERY read fails.
    const orNull = <R>(read: Observable<R>): Observable<R | null> =>
      read.pipe(catchError(() => of(null)));
    return forkJoin({
      balance: orNull(this.getBalance(address)),
      txCount: orNull(this.getTransactionCount(address)),
      code: orNull(this.getCode(address)),
    }).pipe(
      map(({ balance, txCount, code }) => {
        if (balance === null && txCount === null && code === null) {
          throw new Error('All on-chain reads failed');
        }
        return {
          address,
          balanceWei: balance,
          balanceEth: this.formatNullableUnits(balance, 18),
          txCount: this.hexToNullableNumber(txCount),
          // EOA returns '0x'; a contract returns its bytecode.
          isContract: this.isNullableContractCode(code),
        };
      }),
    );
  }

  private formatNullableUnits(value: string | null, decimals: number): string | null {
    if (value === null) return null;
    return this.formatUnits(value, decimals);
  }

  private hexToNullableNumber(value: string | null): number | null {
    if (value === null) return null;
    return this.hexToNumber(value);
  }

  private isNullableContractCode(code: string | null): boolean | null {
    if (code === null) return null;
    return !!code && code !== '0x';
  }

  /** REAL: live network snapshot. */
  getNetworkInfo(): Observable<NetworkInfo> {
    return forkJoin({
      chainId: this.getChainId(),
      blockNumber: this.getBlockNumber(),
      gasPrice: this.getGasPrice(),
    }).pipe(
      map(({ chainId, blockNumber, gasPrice }) => ({
        chainId: this.hexToNumber(chainId),
        chainIdHex: chainId,
        blockNumber: this.hexToNumber(blockNumber),
        gasPriceWei: gasPrice,
        gasPriceGwei: this.formatUnits(gasPrice, 9, 2),
      })),
    );
  }

  /* ── SIMULATED risk intelligence (clearly demo) ───────────────────────── */

  /**
   * Deterministic FNV-1a hash of the lowercased address -> stable signals.
   * NO Math.random: the same address always yields the same demo signals.
   */
  private hashAddress(address: string): number {
    let h = 2166136261;
    const a = (address ?? '').toLowerCase();
    for (let i = 0; i < a.length; i++) {
      h ^= a.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  /**
   * SIMULATED / demo signals derived deterministically from the address.
   * Production: call Chainalysis/TRM/OFAC screening API here.
   */
  generateSimulatedSignals(address: string): RiskSignal[] {
    const h = this.hashAddress(address);
    return [
      { key: 'mixerExposure', hit: h % 5 === 0, severity: 'medium' },
      { key: 'highVelocity', hit: (h >>> 3) % 4 === 0, severity: 'medium' },
      { key: 'suspiciousCounterparty', hit: (h >>> 6) % 6 === 0, severity: 'low' },
      { key: 'sanctionsHit', hit: (h >>> 9) % 23 === 0, severity: 'high' },
    ];
  }

  /**
   * SIMULATED last-seen tx hash (derived, deterministic). Used only when no
   * etherscanApiKey is configured; always pair it with the explorer deep-link.
   * Production: when environment.web3.etherscanApiKey is set, fetch the real
   * txlist from Etherscan instead of deriving this.
   */
  simulatedLastTxHash(address: string): string {
    const h = this.hashAddress(address).toString(16).padStart(8, '0');
    return `0x${h.repeat(8).slice(0, 64)}`;
  }

  /* ── Pure risk engine ──────────────────────────────────────────────────── */

  /**
   * Deterministic policy: sanctions -> BLOCK; mixer/high-velocity/suspicious ->
   * REVIEW; otherwise ALLOW. `account` is accepted for production enrichment
   * (EOA vs contract, activity) but does NOT relax the policy.
   */
  assessRisk(account: RiskAccountContext, signals: RiskSignal[]): RiskAssessment {
    const has = (key: RiskSignalKey): boolean => signals.some(s => s.key === key && s.hit);
    let decision: RiskDecision;
    let level: RiskLevel;
    if (has('sanctionsHit')) {
      decision = 'BLOCK';
      level = 'high';
    } else if (has('mixerExposure') || has('highVelocity') || has('suspiciousCounterparty')) {
      decision = 'REVIEW';
      level = 'medium';
    } else {
      decision = 'ALLOW';
      level = 'low';
    }
    // account reserved for production enrichment (e.g. smart-contract wallets).
    void account;
    return { decision, level, signals };
  }
}
