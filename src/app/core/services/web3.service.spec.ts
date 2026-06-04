import { describe, it, expect, vi } from 'vitest';
import { of, lastValueFrom } from 'rxjs';

import { Web3Service, RiskSignal, RiskSignalKey } from '@core/services/web3.service';
import { environment } from '../../../environments/environment';

/** Minimal HttpClient stand-in (mirrors api-client.service.spec style). */
function httpReturning(value: unknown) {
  return { post: vi.fn((_url: string, _body: unknown) => of(value)) };
}

/** Builds a full signal set with only the requested keys flagged. */
function makeSignals(flagged: Partial<Record<RiskSignalKey, boolean>>): RiskSignal[] {
  return [
    { key: 'mixerExposure', hit: !!flagged.mixerExposure, severity: 'medium' },
    { key: 'highVelocity', hit: !!flagged.highVelocity, severity: 'medium' },
    { key: 'suspiciousCounterparty', hit: !!flagged.suspiciousCounterparty, severity: 'low' },
    { key: 'sanctionsHit', hit: !!flagged.sanctionsHit, severity: 'high' },
  ];
}

const SEED = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

describe('Web3Service', () => {
  const make = () => new Web3Service(httpReturning({ result: '0x' }) as never);

  describe('formatUnits (wei -> ETH, by hand with BigInt)', () => {
    it('treats empty / 0x / 0x0 as zero', () => {
      const s = make();
      expect(s.formatUnits('')).toBe('0');
      expect(s.formatUnits('0x')).toBe('0');
      expect(s.formatUnits('0x0')).toBe('0');
    });

    it('converts whole and fractional ETH values', () => {
      const s = make();
      expect(s.formatUnits('0xde0b6b3a7640000')).toBe('1'); // 1e18
      expect(s.formatUnits('0x1bc16d674ec80000')).toBe('2'); // 2e18
      expect(s.formatUnits('0x6f05b59d3b20000')).toBe('0.5'); // 5e17
      expect(s.formatUnits('0x16345785d8a0000')).toBe('0.1'); // 1e17
      expect(s.formatUnits('0x152d02c7e14af6800000')).toBe('100000'); // 1e23
    });

    it('formats gwei with 9 decimals', () => {
      expect(make().formatUnits('0x4a817c800', 9, 2)).toBe('20');
    });

    it('returns 0 for un-parseable input', () => {
      expect(make().formatUnits('not-a-hex')).toBe('0');
    });
  });

  describe('hexToNumber', () => {
    it('parses hex and defaults blanks to 0', () => {
      const s = make();
      expect(s.hexToNumber('0x10')).toBe(16);
      expect(s.hexToNumber('0x2a')).toBe(42);
      expect(s.hexToNumber('0x')).toBe(0);
      expect(s.hexToNumber('')).toBe(0);
    });
  });

  describe('isValidAddress', () => {
    it('accepts 20-byte hex and rejects malformed input', () => {
      const s = make();
      expect(s.isValidAddress(SEED)).toBe(true);
      expect(s.isValidAddress('0x123')).toBe(false);
      expect(s.isValidAddress('d8dA6BF26964aF9D7eEd9e03E53415D37aA96045')).toBe(false);
      expect(s.isValidAddress('0xZZ35Cc6634C0532925a3b844Bc454e4438f44eAA')).toBe(false);
    });
  });

  describe('assessRisk (deterministic policy)', () => {
    it('sanctions hit -> BLOCK', () => {
      const r = make().assessRisk({}, makeSignals({ sanctionsHit: true }));
      expect(r.decision).toBe('BLOCK');
      expect(r.level).toBe('high');
    });

    it('mixer or high velocity or suspicious counterparty -> REVIEW', () => {
      const s = make();
      expect(s.assessRisk({}, makeSignals({ mixerExposure: true })).decision).toBe('REVIEW');
      expect(s.assessRisk({}, makeSignals({ highVelocity: true })).decision).toBe('REVIEW');
      expect(s.assessRisk({}, makeSignals({ suspiciousCounterparty: true })).decision).toBe('REVIEW');
    });

    it('no flagged signals -> ALLOW', () => {
      const r = make().assessRisk({ isContract: false, txCount: 5 }, makeSignals({}));
      expect(r.decision).toBe('ALLOW');
      expect(r.level).toBe('low');
    });
  });

  describe('generateSimulatedSignals', () => {
    it('is deterministic for the same address (no Math.random)', () => {
      const s = make();
      const a = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
      expect(s.generateSimulatedSignals(a)).toEqual(s.generateSimulatedSignals(a));
    });

    it('keeps the seeded sample address clean (never fabricated BLOCK)', () => {
      const s = make();
      const signals = s.generateSimulatedSignals(SEED);
      expect(s.assessRisk({}, signals).decision).toBe('ALLOW');
    });
  });

  describe('simulatedLastTxHash', () => {
    it('produces a deterministic 32-byte hex hash', () => {
      const s = make();
      const hash = s.simulatedLastTxHash(SEED);
      expect(hash).toMatch(/^0x[0-9a-f]{64}$/);
      expect(s.simulatedLastTxHash(SEED)).toBe(hash);
    });
  });

  describe('chain metadata + explorer links', () => {
    it('reads chain meta from environment', () => {
      const meta = make().chainMeta();
      expect(meta.chainId).toBe(environment.web3.chainId);
      expect(meta.chainName).toBe(environment.web3.chainName);
    });

    it('builds explorer deep-links', () => {
      const s = make();
      expect(s.explorerAddressUrl('0xabc')).toBe(`${environment.web3.explorerBaseUrl}/address/0xabc`);
      expect(s.explorerTxUrl('0xdef')).toBe(`${environment.web3.explorerBaseUrl}/tx/0xdef`);
    });
  });

  describe('EIP-1193 wallet (no provider in test env)', () => {
    it('reports no wallet and a no-op cleanup', () => {
      const s = make();
      expect(s.hasWallet()).toBe(false);
      const off = s.onWalletEvents({ onAccountsChanged: () => undefined, onChainChanged: () => undefined });
      expect(typeof off).toBe('function');
      off();
    });

    it('connectWallet rejects with a typed no-wallet error', async () => {
      await expect(make().connectWallet()).rejects.toMatchObject({ message: 'no-wallet' });
    });

    it('personalSign rejects with a typed no-wallet error', async () => {
      await expect(make().personalSign('0xabc', 'audit')).rejects.toMatchObject({ message: 'no-wallet' });
    });
  });

  describe('JSON-RPC reads (HttpClient)', () => {
    it('eth_getBalance posts a JSON-RPC envelope and returns the hex result', async () => {
      const http = httpReturning({ jsonrpc: '2.0', id: 1, result: '0xde0b6b3a7640000' });
      const s = new Web3Service(http as never);
      const result = await lastValueFrom(s.getBalance('0xabc'));
      expect(result).toBe('0xde0b6b3a7640000');
      const [url, body] = http.post.mock.calls[0];
      expect(url).toBe(environment.web3.rpcUrl);
      expect(body).toMatchObject({ jsonrpc: '2.0', method: 'eth_getBalance' });
    });

    it('throws on a JSON-RPC error body (HTTP 200 with error)', async () => {
      const http = httpReturning({ jsonrpc: '2.0', id: 1, error: { code: -32000, message: 'bad request' } });
      const s = new Web3Service(http as never);
      await expect(lastValueFrom(s.getBalance('0xabc'))).rejects.toThrow(/bad request/);
    });

    it('throws when the RPC returns neither result nor error', async () => {
      const http = httpReturning({ jsonrpc: '2.0', id: 1 });
      const s = new Web3Service(http as never);
      await expect(lastValueFrom(s.getBalance('0xabc'))).rejects.toThrow(/no result/);
    });

    it('getOnChainFacts maps balance, nonce and EOA vs contract', async () => {
      const http = {
        post: vi.fn((_url: string, body: { method: string }) => {
          if (body.method === 'eth_getBalance') return of({ result: '0xde0b6b3a7640000' });
          if (body.method === 'eth_getTransactionCount') return of({ result: '0x2a' });
          if (body.method === 'eth_getCode') return of({ result: '0x' });
          return of({ result: '0x0' });
        }),
      };
      const facts = await lastValueFrom(new Web3Service(http as never).getOnChainFacts('0xabc'));
      expect(facts.balanceEth).toBe('1');
      expect(facts.txCount).toBe(42);
      expect(facts.isContract).toBe(false);
    });

    it('getNetworkInfo maps chainId, block and gas price', async () => {
      const http = {
        post: vi.fn((_url: string, body: { method: string }) => {
          if (body.method === 'eth_chainId') return of({ result: '0x1' });
          if (body.method === 'eth_blockNumber') return of({ result: '0x10' });
          if (body.method === 'eth_gasPrice') return of({ result: '0x4a817c800' });
          return of({ result: '0x0' });
        }),
      };
      const info = await lastValueFrom(new Web3Service(http as never).getNetworkInfo());
      expect(info.chainId).toBe(1);
      expect(info.blockNumber).toBe(16);
      expect(info.gasPriceGwei).toBe('20');
    });
  });

  describe('EIP-1193 wallet (with an injected provider)', () => {
    it('connects, signs, and wires up + tears down events', async () => {
      const provider = {
        request: vi.fn(async (args: { method: string }) => {
          if (args.method === 'eth_requestAccounts') return ['0xAbC0000000000000000000000000000000000001'];
          if (args.method === 'eth_chainId') return '0x1';
          if (args.method === 'personal_sign') return '0xsignature';
          return null;
        }),
        on: vi.fn(),
        removeListener: vi.fn(),
      };
      const g = globalThis as unknown as { window?: { ethereum?: unknown } };
      const hadWindow = !!g.window;
      g.window = g.window ?? {};
      g.window.ethereum = provider;
      try {
        const s = make();
        expect(s.hasWallet()).toBe(true);

        const op = await s.connectWallet();
        expect(op.address).toBe('0xAbC0000000000000000000000000000000000001');
        expect(op.chainIdHex).toBe('0x1');

        expect(await s.personalSign(op.address, 'audit')).toBe('0xsignature');

        const off = s.onWalletEvents({ onAccountsChanged: () => undefined, onChainChanged: () => undefined });
        expect(provider.on).toHaveBeenCalledWith('accountsChanged', expect.any(Function));
        off();
        expect(provider.removeListener).toHaveBeenCalled();
      } finally {
        if (hadWindow) {
          delete g.window!.ethereum;
        } else {
          delete g.window;
        }
      }
    });
  });
});
