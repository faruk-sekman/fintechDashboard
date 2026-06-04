/*
 * Copyright (c) 2026 Fintech Dashboard contributors.
 */

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EMPTY } from 'rxjs';
import { catchError, distinctUntilChanged, filter, map, switchMap, tap } from 'rxjs/operators';

import { CustomersApi } from '@core/api/customers.api';
import { ToastService } from '@core/services/toast.service';
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
import { Customer } from '@shared/models/customer.model';
import { UiButtonComponent } from '@shared/components/ui-button/ui-button.component';
import { UiBadgeComponent } from '@shared/components/ui-badge/ui-badge.component';
import { UiInputComponent } from '@shared/components/ui-input/ui-input.component';
import { UiSkeletonComponent } from '@shared/components/ui-skeleton/ui-skeleton.component';
import { CountUpDirective } from '@shared/directives/count-up.directive';
import { CustomerStatusBadgeComponent } from '@features/customers/components/customer-status-badge/customer-status-badge.component';
import { VcPreview } from './web3-risk.model';

/**
 * Real, public sample address (vitalik.eth): rich REAL on-chain data for the
 * live reads, and a clean ALLOW under the simulated engine. We deliberately
 * never fabricate risk on a real identity — paste any address to screen it.
 */
const SAMPLE_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

/** Subset of UiBadgeColor we use here (assignable to the badge input). */
type BadgeColor = 'green' | 'yellow' | 'red' | 'gray' | 'blue';

@Component({
  selector: 'app-web3-risk',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslateModule,
    UiButtonComponent,
    UiBadgeComponent,
    UiInputComponent,
    UiSkeletonComponent,
    CountUpDirective,
    CustomerStatusBadgeComponent,
  ],
  templateUrl: './web3-risk.component.html',
  styleUrl: './web3-risk.component.scss',
})
export class Web3RiskComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly customersApi = inject(CustomersApi);
  private readonly web3 = inject(Web3Service);
  private readonly i18n = inject(TranslateService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  private walletCleanup: (() => void) | null = null;

  readonly chain: ChainMeta = this.web3.chainMeta();
  readonly addressControl = new FormControl<string>(SAMPLE_ADDRESS, { nonNullable: true });

  // (1) Customer context
  readonly customer = signal<Customer | null>(null);
  readonly loadingCustomer = signal(true);

  // (2) Operator wallet
  readonly hasWallet = signal(this.web3.hasWallet());
  readonly operator = signal<OperatorWallet | null>(null);
  readonly walletError = signal<string | null>(null);
  readonly signature = signal<string | null>(null);

  // (3) REAL on-chain facts
  readonly screening = signal(false);
  readonly facts = signal<OnChainFacts | null>(null);
  readonly factsError = signal(false);
  readonly addressInvalid = signal(false);
  readonly network = signal<NetworkInfo | null>(null);
  readonly screenedAddress = signal<string>(SAMPLE_ADDRESS);

  // (4) SIMULATED risk intelligence
  readonly simSignals = signal<RiskSignal[]>([]);
  readonly assessment = signal<RiskAssessment | null>(null);
  readonly lastTxHash = signal<string | null>(null);

  // (6) Decision
  readonly recommendation = signal<RiskDecision | null>(null);

  /** Visual-only gauge fill for the SIMULATED risk level (no real score exists). */
  readonly levelPercent = computed(() => {
    const level = this.assessment()?.level;
    if (level === 'high') return 100;
    if (level === 'medium') return 66;
    if (level === 'low') return 34;
    return 0;
  });

  /** Deterministic, templated, i18n explanation — labeled "(heuristic)". */
  readonly explanation = computed(() => {
    const assessment = this.assessment();
    if (!assessment) return '';
    const flagged = assessment.signals.filter(s => s.hit);
    const list = this.signalExplanationList(flagged);
    return this.i18n.instant('web3.explanation.template', {
      count: flagged.length,
      list,
      decision: this.i18n.instant(`web3.decision.${assessment.decision}`),
    });
  });

  /** (5) DID/VC concept preview — data-minimised, NO PII in the credential. */
  readonly vc = computed<VcPreview | null>(() => {
    const c = this.customer();
    if (!c) return null;
    return {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: ['VerifiableCredential', 'KycCredential'],
      issuer: 'did:example:fintech-ops-compliance',
      issuanceDate: '2026-01-01T00:00:00Z',
      credentialSubject: {
        id: `did:example:${c.id}`,
        kycVerified: c.kycStatus === 'VERIFIED' || c.kycStatus === 'CONTRACTED',
      },
    };
  });

  readonly vcJson = computed(() => {
    const vc = this.vc();
    if (!vc) return '';
    return JSON.stringify(vc, null, 2);
  });

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        map(params => params.get('id')),
        filter((id): id is string => !!id),
        distinctUntilChanged(),
        tap(() => this.loadingCustomer.set(true)),
        switchMap(id =>
          this.customersApi.getById(id).pipe(
            catchError(() => {
              this.loadingCustomer.set(false);
              this.toast.error(this.i18n.instant('errors.notFound'));
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(c => {
        this.customer.set(c);
        this.loadingCustomer.set(false);
      });

    this.loadNetwork();
    this.screen(); // seeded sample address -> instant rich REAL data
  }

  ngOnDestroy(): void {
    this.walletCleanup?.();
  }

  /** Runs REAL on-chain reads + SIMULATED intelligence for the input address. */
  screen(): void {
    const address = this.addressControl.value.trim();
    if (!this.web3.isValidAddress(address)) {
      this.addressInvalid.set(true);
      this.facts.set(null);
      this.assessment.set(null);
      this.simSignals.set([]);
      this.lastTxHash.set(null);
      return;
    }
    this.addressInvalid.set(false);
    this.screenedAddress.set(address);
    this.screening.set(true);
    this.factsError.set(false);

    // SIMULATED intelligence is synchronous + deterministic.
    const signals = this.web3.generateSimulatedSignals(address);
    this.simSignals.set(signals);
    this.lastTxHash.set(this.web3.simulatedLastTxHash(address));

    // REAL on-chain reads.
    this.web3
      .getOnChainFacts(address)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: facts => {
          this.facts.set(facts);
          this.assessment.set(
            this.web3.assessRisk(
              { isContract: facts.isContract ?? undefined, txCount: facts.txCount ?? undefined },
              signals,
            ),
          );
          this.screening.set(false);
        },
        error: () => {
          this.factsError.set(true);
          this.screening.set(false);
          // Still surface the simulated assessment if the chain read fails.
          this.assessment.set(this.web3.assessRisk({}, signals));
        },
      });
  }

  loadNetwork(): void {
    this.web3
      .getNetworkInfo()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: info => this.network.set(info),
        error: () => this.network.set(null),
      });
  }

  async connect(): Promise<void> {
    this.walletError.set(null);
    try {
      const operator = await this.web3.connectWallet();
      this.operator.set(operator);
      this.walletCleanup?.();
      this.walletCleanup = this.web3.onWalletEvents({
        onAccountsChanged: accounts => {
          if (!accounts.length) {
            this.operator.set(null);
            this.signature.set(null);
            return;
          }
          this.operator.update(o => this.operatorWithAddress(o, accounts[0]));
        },
        onChainChanged: chainIdHex =>
          this.operator.update(o => this.operatorWithChain(o, chainIdHex)),
      });
    } catch (err) {
      this.walletError.set(this.walletErrorMessage(err));
    }
  }

  disconnect(): void {
    this.walletCleanup?.();
    this.walletCleanup = null;
    this.operator.set(null);
    this.signature.set(null);
  }

  /** OPTIONAL proof-of-control attestation (off by default). */
  async signAudit(): Promise<void> {
    const op = this.operator();
    if (!op) return;
    this.walletError.set(null);
    try {
      const message = this.i18n.instant('web3.signMessage', { address: this.screenedAddress() });
      this.signature.set(await this.web3.personalSign(op.address, message));
    } catch (err) {
      this.walletError.set(this.walletErrorMessage(err));
    }
  }

  record(decision: RiskDecision): void {
    this.recommendation.set(decision);
    this.toast.success(
      this.i18n.instant('web3.record.toast', {
        decision: this.i18n.instant(`web3.decision.${decision}`),
      }),
    );
  }

  back(): void {
    const c = this.customer();
    this.router.navigate(this.backRoute(c));
  }

  addressExplorerUrl(): string {
    return this.web3.explorerAddressUrl(this.screenedAddress());
  }

  txExplorerUrl(hash: string): string {
    return this.web3.explorerTxUrl(hash);
  }

  decisionColor(decision: RiskDecision | null | undefined): BadgeColor {
    switch (decision) {
      case 'BLOCK':
        return 'red';
      case 'REVIEW':
        return 'yellow';
      case 'ALLOW':
        return 'green';
      default:
        return 'gray';
    }
  }

  signalColor(hit: boolean): BadgeColor {
    if (hit) return 'red';
    return 'green';
  }

  private signalExplanationList(flagged: RiskSignal[]): string {
    if (!flagged.length) return this.i18n.instant('web3.explanation.none');
    return flagged.map(s => this.i18n.instant(`web3.signals.${s.key}`)).join(', ');
  }

  private operatorWithAddress(
    operator: OperatorWallet | null,
    address: string,
  ): OperatorWallet | null {
    if (!operator) return operator;
    return { ...operator, address };
  }

  private operatorWithChain(
    operator: OperatorWallet | null,
    chainIdHex: string,
  ): OperatorWallet | null {
    if (!operator) return operator;
    return { ...operator, chainIdHex };
  }

  private backRoute(customer: Customer | null): string[] {
    if (!customer) return ['/customers'];
    return ['/customers', customer.id];
  }

  private walletErrorMessage(err: unknown): string {
    const code = (err as { code?: number }).code;
    if (code === 4001) return this.i18n.instant('web3.wallet.rejected');
    if ((err as { message?: string }).message === 'no-wallet') {
      return this.i18n.instant('web3.wallet.notFound');
    }
    return this.i18n.instant('web3.wallet.error');
  }
}
