// Chain definitions
export const CHAINS = {
  1: { id: 1, name: 'Ethereum', shortName: 'ETH' },
  137: { id: 137, name: 'Polygon', shortName: 'MATIC' },
  42161: { id: 42161, name: 'Arbitrum', shortName: 'ARB' },
  10: { id: 10, name: 'Optimism', shortName: 'OP' },
  8453: { id: 8453, name: 'Base', shortName: 'BASE' },
  56: { id: 56, name: 'BSC', shortName: 'BSC' },
  43114: { id: 43114, name: 'Avalanche', shortName: 'AVAX' },
};

export type ChainId = keyof typeof CHAINS;

export const getChainName = (chainId: number): string => {
  const chain = CHAINS[chainId as ChainId];
  return chain ? chain.name : `Chain ${chainId}`;
};

export const getChainShortName = (chainId: number): string => {
  const chain = CHAINS[chainId as ChainId];
  return chain ? chain.shortName : `${chainId}`;
};
