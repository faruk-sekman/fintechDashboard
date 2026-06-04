/*
 * Copyright (c) 2026 Fintech Dashboard contributors.
 */

export const environment = {
  production: false,
  apiBaseUrl: 'https://frontend-case-study.onrender.com',
  defaultLanguage: 'tr',
  web3: {
    // Public, key-free Ethereum mainnet RPC (swap via env). Real on-chain reads.
    rpcUrl: 'https://ethereum-rpc.publicnode.com',
    chainId: 1,
    chainName: 'Ethereum Mainnet',
    explorerBaseUrl: 'https://etherscan.io',
    // Empty -> "last seen tx" is simulated. Set a key to fetch a real txlist.
    etherscanApiKey: '',
  },
};
