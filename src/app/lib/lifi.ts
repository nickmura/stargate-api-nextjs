import { createConfig } from '@lifi/sdk';

export const lifiConfig = createConfig({
  integrator: 'Li.Fi API',
  apiKey: process.env.LIFI_API_KEY ?? '',
});