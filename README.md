<div align="center">

<img src="projectScreenShoots/banner.svg" alt="Fintech Operations Dashboard" width="100%" />

<br/>

![Angular](https://img.shields.io/badge/Angular-21-DD0031?logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9_strict-3178C6?logo=typescript&logoColor=white)
![NgRx](https://img.shields.io/badge/NgRx-21-BA2BD2?logo=reactivex&logoColor=white)
![RxJS](https://img.shields.io/badge/RxJS-7-B7178C?logo=reactivex&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-4-6E9F18?logo=vitest&logoColor=white)
![Coverage](https://img.shields.io/badge/coverage-90%25-brightgreen)
![i18n](https://img.shields.io/badge/i18n-TR%20%7C%20EN-1E88E5)
![Theme](https://img.shields.io/badge/theme-light%20%7C%20dark-8B5CF6)

<em>Lazy-loaded &middot; standalone &middot; OnPush &middot; signals &middot; strict templates &middot; read-only Web3</em>

</div>

---

## 📚 Table of Contents
- [Overview](#overview)
- [Feature Highlights](#feature-highlights)
- [Web3 Risk &amp; Compliance](#web3-risk--compliance)
- [Architecture](#architecture)
- [Routing Map](#routing-map)
- [Tech Stack](#tech-stack)
- [Shared UI Library](#shared-ui-library)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Scripts](#scripts)
- [Configuration](#configuration)
- [Testing &amp; Coverage](#testing--coverage)
- [Internationalization &amp; Theming](#internationalization--theming)
- [Screenshots](#screenshots)

---

<a id="overview"></a>
## 🧭 Overview

A frontend-only **fintech operations dashboard** for back-office operators. It manages
customer profiles, wallet limits and transaction history, and adds a **read-only,
non-custodial Web3 risk screen** that pulls live on-chain facts to inform KYC decisions.

> [!NOTE]
> Data comes from a REST API (no backend in this repo). On-chain reads use a public,
> key-free Ethereum JSON-RPC node. **No private keys, no transaction sending, no custody.**

> [!IMPORTANT]
> Minimum line-coverage gate: **80%+** — current: **~90%**.

---

<a id="feature-highlights"></a>
## ✨ Feature Highlights

| | Feature |
|---|---|
| 📊 | **Dashboard** — total customers, active-rate bar, age stats, KYC distribution, animated count-up KPIs |
| 🧑‍💼 | **Latest-updated customer** card with quick-detail navigation |
| 🔎 | **Customer list** — search, KYC/active filters, pagination, delete flow (query-param synced) |
| 🧾 | **Customer detail** — wallet balance, daily/monthly limit update, transaction list + filters |
| 📝 | **Create / Edit forms** — reactive forms with rich validation (TR national-ID checksum, age, wallet, etc.) |
| 🛡️ | **Web3 Risk & Compliance** — on-chain facts + simulated AML signals + ALLOW/REVIEW/BLOCK engine |
| 💀 | **Skeleton loading** states for lists, cards, forms |
| 🌍 | **TR / EN** i18n with full parity + toast notifications |
| 🌗 | **Light / Dark** theme with `localStorage` persistence |
| ♿ | Keyboard-navigable controls, status legible without color |

---

<a id="web3-risk--compliance"></a>
## 🛡️ Web3 Risk & Compliance

A standout, **honest** Web3 screen: every value is labeled **🟢 REAL** (live on-chain) or
**🟡 SIMULATED** (deterministic demo). Reachable from any customer via **"Web3 Risk Check"**.

```mermaid
flowchart TD
  A["0x wallet address"] --> V{"Valid 0x + 40 hex?"}
  V -- no --> ERR["⛔ Format error (no EIP-55 checksum claim)"]
  V -- yes --> REAL["🟢 REAL on-chain reads<br/>balance · nonce · EOA vs contract"]
  V -- yes --> SIM["🟡 SIMULATED signals<br/>mixer · velocity · counterparty · sanctions"]
  SIM --> ENG{{"Deterministic risk engine"}}
  ENG -- "sanctions hit" --> BLOCK["🔴 BLOCK"]
  ENG -- "mixer / velocity / suspicious" --> REVIEW["🟠 REVIEW"]
  ENG -- "clean" --> ALLOW["🟢 ALLOW"]
  BLOCK --> REC["Operator records decision"]
  REVIEW --> REC
  ALLOW --> REC
```

| Capability | Kind | How |
|---|---|---|
| Balance · nonce · EOA/contract | 🟢 REAL | key-free JSON-RPC (`eth_getBalance`, `eth_getTransactionCount`, `eth_getCode`) over `HttpClient` |
| Live network (chainId, block, gas) | 🟢 REAL | `eth_chainId` · `eth_blockNumber` · `eth_gasPrice` |
| Operator wallet connect + audit signature | 🟢 REAL | EIP-1193 (`eth_requestAccounts`, `personal_sign`) — **optional, off by default** |
| AML signals (mixer / velocity / counterparty / sanctions) | 🟡 SIMULATED | deterministic FNV-1a hash of the address (no `Math.random`) |
| Last-seen tx | 🟡 SIMULATED | derived; paired with a real explorer deep-link |
| Verifiable Credential preview | 🟡 SIMULATED | illustrative W3C VC, **no PII on-chain** |

> `wei → ETH` is converted by hand with `BigInt` — **no ethers / web3.js / viem / wagmi** added.

---

<a id="architecture"></a>
## 🏗️ Architecture

```mermaid
flowchart TB
  subgraph PRES["🖥️ Presentation"]
    LAY["Layout<br/>header · sidebar · main-layout"]
    FEAT["Features<br/>dashboard · customers · web3-risk"]
    UI["Shared UI<br/>ui-table · ui-form · ui-button · …"]
  end
  subgraph STATE["🧠 State · NgRx"]
    STORES["Store facades<br/>customers · transactions · latest-customer"]
    FX["Effects"]
  end
  subgraph CORE["⚙️ Core"]
    APIC["API clients<br/>customers · wallets · transactions"]
    INT["Interceptors<br/>loading · error"]
    SVC["Services<br/>theme · toast · web3 · logger · error"]
  end
  FEAT --> STORES --> FX --> APIC
  FEAT --> UI
  APIC --> INT --> REST[("REST API")]
  SVC -. "JSON-RPC · read-only" .-> NODE[("Ethereum node")]
  SVC -. "EIP-1193" .-> WALLET(["Browser wallet"])
```

**Principles** — lazy-loaded standalone routes · `ChangeDetectionStrategy.OnPush` · signals for
local state, NgRx for shared state · strict templates · clean separation of HTML / SCSS / TS ·
centralized API client + interceptors · path aliases `@core/* @shared/* @features/*`.

<details>
<summary><b>HTTP + interceptor flow</b></summary>

```mermaid
sequenceDiagram
  participant C as Component / Store
  participant L as loadingInterceptor
  participant E as errorInterceptor
  participant API as REST API
  participant T as ToastService
  C->>L: HTTP request
  L->>L: LoadingService.start()
  L->>E: forward
  E->>API: request
  API-->>E: response / HttpError
  E-->>T: localized toast on error
  E-->>L: result
  L->>L: LoadingService.stop()
  L-->>C: response
```
</details>

---

<a id="routing-map"></a>
## 🗺️ Routing Map

```mermaid
flowchart LR
  R(["/"]) --> D["/dashboard"]
  R --> C["/customers"]
  C --> N["/customers/new"]
  C --> DET["/customers/:id"]
  DET --> E["/customers/:id/edit"]
  DET --> W["/customers/:id/web3-risk 🆕"]
```

| Route | Screen |
|---|---|
| `/dashboard` | KPIs + latest customer |
| `/customers` | List (filters synced to `search`, `kycStatus`, `isActive`, `page`) |
| `/customers/new` | Create form |
| `/customers/:id` | Detail — wallet + transactions |
| `/customers/:id/edit` | Edit form |
| `/customers/:id/web3-risk` | 🆕 Web3 risk screening |

---

<a id="tech-stack"></a>
## 🧰 Tech Stack

| Layer | Tools |
|---|---|
| Framework | **Angular 21** (standalone, signals, OnPush, `inject()`) |
| Reactivity | RxJS 7 |
| State | **NgRx** (store · effects · store-devtools) + custom store facades |
| i18n | `@ngx-translate/core` + http-loader (TR / EN) |
| Styling | **Tailwind CSS 3** (`@tailwindcss/vite`) + SCSS tokens / utilities |
| Icons | **remixicon** |
| Toasts | `ngx-toastr` |
| Testing | **Vitest 4** + `@vitest/coverage-v8` + jsdom |
| Lint | stylelint (SCSS) · Prettier |

---

<a id="shared-ui-library"></a>
## 🧩 Shared UI Library

Reusable, themable, accessible standalone components under `src/app/shared/components`:

`ui-badge` · `ui-button` · `ui-checkbox` · `ui-confirm-dialog` · `ui-form` · `ui-input`
· `ui-pagination` · `ui-select` · `ui-skeleton` · `ui-table`

Plus `customer-status-badge` (feature), the `count-up` directive (animated KPIs) and route-transition animations.

---

<a id="api-reference"></a>
## 🔌 API Reference

Base URL from environment config. **REST:**

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/customers` | List (page, pageSize, search, kycStatus, isActive) |
| `GET` | `/api/customers/:id` | Single customer |
| `POST` | `/api/customers` | Create |
| `PUT` | `/api/customers/:id` | Update |
| `DELETE` | `/api/customers/:id` | Delete |
| `GET` | `/api/wallets/:customerId` | Wallet |
| `PATCH` | `/api/wallets/:customerId` | Update limits |
| `GET` | `/api/transactions/:customerId` | Transactions (type, direction, currency, from, to) |

**Web3 JSON-RPC (read-only, key-free):** `eth_getBalance` · `eth_getTransactionCount` ·
`eth_getCode` · `eth_chainId` · `eth_blockNumber` · `eth_gasPrice`.
**EIP-1193 (optional):** `eth_requestAccounts` · `personal_sign`.

---

<a id="project-structure"></a>
## 📂 Project Structure

```
fintech-dashboard/
├── public/                     # static assets (favicon)
├── src/
│   ├── app/
│   │   ├── core/               # api clients · interceptors · services · app-error state
│   │   ├── features/
│   │   │   ├── dashboard/      # KPIs + latest-customer store
│   │   │   └── customers/      # list · detail · form · web3-risk + NgRx state
│   │   ├── layout/             # header · sidebar · main-layout
│   │   └── shared/             # ui-* · models · validators · directives · utils · animations
│   ├── assets/i18n/            # tr.json · en.json
│   ├── environments/           # environment(.stage|.prod).ts
│   └── styles/                 # tokens · typography · mixins · utilities · dashboard
├── angular.json · package.json · tailwind.config.js · tsconfig*.json · vitest.config.ts
└── projectScreenShoots/
```

---

<a id="getting-started"></a>
## 🚀 Getting Started

```bash
npm install
npm start          # → http://localhost:4200
```

---

<a id="scripts"></a>
## 📜 Scripts

| Script | Action |
|---|---|
| `npm start` | Dev server |
| `npm run start:stage` | Dev server (stage env) |
| `npm run build` | Production build |
| `npm run build:stage` | Stage build |
| `npm run watch` | Dev watch build |
| `npm test` | Vitest + coverage |
| `npm run lint:styles` | Stylelint SCSS |

---

<a id="configuration"></a>
## ⚙️ Configuration

`src/environments/environment(.stage|.prod).ts`:

```ts
export const environment = {
  production: false,
  apiBaseUrl: '…',
  defaultLanguage: 'tr',
  web3: {
    rpcUrl: 'https://cloudflare-eth.com',  // public, key-free
    chainId: 1,
    chainName: 'Ethereum Mainnet',
    explorerBaseUrl: 'https://etherscan.io',
    etherscanApiKey: ''                      // empty → "last seen tx" is simulated
  }
};
```

**Production budgets:** initial ≤ 650 kB (warn) / 1 MB (error); per-component SCSS ≤ 4 kB / 8 kB.

---

<a id="testing--coverage"></a>
## ✅ Testing & Coverage

```bash
npm test                          # run + coverage
npx vitest --run                  # run only
npx vitest --run --coverage       # coverage only
```

Current: **~90% lines** across **31 spec files**. CI gate (fail < 80% lines):

```bash
node -e "const s=require('./coverage/coverage-summary.json');const p=s.total.lines.pct;console.log('Lines:',p+'%');process.exit(p>=80?0:1);"
```

---

<a id="internationalization--theming"></a>
## 🌍 Internationalization & Theming

- **i18n:** `src/assets/i18n/{tr,en}.json` — stable semantic keys, full TR / EN parity, default `tr`.
- **Theming:** light / dark via `ThemeService` + `localStorage` (`data-theme`); SCSS design tokens; remixicon; subtle press / motion micro-interactions.

---

<a id="screenshots"></a>
## 🖼️ Screenshots

### Dashboard
<table>
<tr><td align="center"><b>Light</b></td><td align="center"><b>Dark</b></td></tr>
<tr>
<td><img src="projectScreenShoots/dashboard-light.png" width="100%"/></td>
<td><img src="projectScreenShoots/dashboard-dark.png" width="100%"/></td>
</tr>
<tr><td colspan="2" align="center"><b>Skeleton loading</b><br/><img src="projectScreenShoots/dashboard-light-skeleton.png" width="60%"/></td></tr>
</table>

### Customers
<table>
<tr><td align="center"><b>List (Light)</b></td><td align="center"><b>List + Filters (Dark)</b></td></tr>
<tr>
<td><img src="projectScreenShoots/customers-list-light.png" width="100%"/></td>
<td><img src="projectScreenShoots/customers-list-dark.png" width="100%"/></td>
</tr>
</table>

### Forms
<table>
<tr><td align="center"><b>Create</b></td><td align="center"><b>Edit</b></td></tr>
<tr>
<td><img src="projectScreenShoots/customer-create-light.png" width="100%"/></td>
<td><img src="projectScreenShoots/customer-edit-light.png" width="100%"/></td>
</tr>
<tr><td align="center"><b>Validation</b></td><td align="center"><b>Edit (Dark · TR)</b></td></tr>
<tr>
<td><img src="projectScreenShoots/customer-edit-validation-light.png" width="100%"/></td>
<td><img src="projectScreenShoots/customer-edit-dark-tr.png" width="100%"/></td>
</tr>
</table>

### Customer Detail & Delete
<table>
<tr><td align="center"><b>Detail (Light · TR)</b></td><td align="center"><b>Detail (Dark · TR)</b></td></tr>
<tr>
<td><img src="projectScreenShoots/customer-detail-light-tr.png" width="100%"/></td>
<td><img src="projectScreenShoots/customer-detail-dark-tr.png" width="100%"/></td>
</tr>
<tr><td colspan="2" align="center"><b>Delete confirmation</b><br/><img src="projectScreenShoots/customer-delete-modal-dark-tr.png" width="60%"/></td></tr>
</table>

### 🆕 Web3 Risk & Compliance
<table>
<tr><td align="center"><b>Light</b></td><td align="center"><b>Dark</b></td></tr>
<tr>
<td><img src="projectScreenShoots/web3-risk-light.png" width="100%"/></td>
<td><img src="projectScreenShoots/web3-risk-dark.png" width="100%"/></td>
</tr>
<tr><td colspan="2" align="center"><b>Flagged address → BLOCK decision (Dark)</b><br/><img src="projectScreenShoots/web3-risk-flagged-dark.png" width="60%"/></td></tr>
</table>

---

<div align="center"><sub>Fintech Operations Dashboard · Angular 21 · read-only Web3 · TR / EN · light / dark</sub></div>
