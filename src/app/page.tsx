"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useState } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { TokenSelector } from "./components/TokenSelector";
import { TOKENS } from "./lib/tokens";

export default function Home() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [routeData, setRouteData] = useState<{
    routes?: Array<{
      toAmount?: string;
      stargateSteps?: Array<{
        type: string;
        transaction?: { to?: `0x${string}`; data?: `0x${string}`; value?: string };
      }>;
    }>;
    error?: string
  } | null>(null);
  const [txHashLink, setTxHashLink] = useState<string | null>(null);

  // Form state
  const [fromChainId, setFromChainId] = useState(8453); // Base
  const [toChainId, setToChainId] = useState(42161); // Arbitrum
  const [fromToken, setFromToken] = useState("USDC");
  const [toToken, setToToken] = useState("USDC");
  const [fromAmount, setFromAmount] = useState("1");

  const getQuote = async () => {
    setLoading(true);
    setRouteData(null);
    setTxHashLink(null);

    try {
      const fromChainTokens = TOKENS[fromChainId as keyof typeof TOKENS];
      const toChainTokens = TOKENS[toChainId as keyof typeof TOKENS];
      const fromTokenData = fromChainTokens?.[fromToken as keyof typeof fromChainTokens];
      const toTokenData = toChainTokens?.[toToken as keyof typeof toChainTokens];

      if (!fromTokenData || !toTokenData) {
        setRouteData({ error: 'Invalid token selection' });
        setLoading(false);
        return;
      }

      // Convert amount to smallest unit
      const amountInSmallestUnit = (parseFloat(fromAmount) * Math.pow(10, fromTokenData.decimals)).toString();

      const requestBody = {
        fromChainId,
        toChainId,
        fromTokenAddress: fromTokenData.address,
        toTokenAddress: toTokenData.address,
        fromAmount: amountInSmallestUnit,
        fromAddress: address || "0x552008c0f6870c2f77e5cC1d2eb9bdff03e30Ea0",
        toAddress: address || "0x552008c0f6870c2f77e5cC1d2eb9bdff03e30Ea0",
      };

      const response = await fetch('/api/routes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      setRouteData(data);
    } catch {
      setRouteData({ error: 'Failed to fetch route' });
    } finally {
      setLoading(false);
    }
  };

  const executeSwap = async () => {
    if (!isConnected || !routeData?.routes?.[0]) {
      console.error("Please connect wallet and get a quote first");
      return;
    }

    setExecuting(true);

    try {
      const route = routeData.routes[0];
      console.log("Executing route:", route);

      // Get all Stargate steps from the quote
      const stargateSteps = (route as { stargateSteps?: Array<{ type: string; transaction?: { to?: `0x${string}`; data?: `0x${string}`; value?: string } }> }).stargateSteps || [];

      console.log("Full route object:", JSON.stringify(route, null, 2));
      console.log("Stargate steps:", stargateSteps);
      console.log("Wallet client exists:", !!walletClient);

      if (!stargateSteps.length || !walletClient) {
        console.error("Missing steps or wallet:", { stepsCount: stargateSteps.length, walletClient: !!walletClient });
        console.error(`Missing transaction steps or wallet client`);
        setExecuting(false);
        return;
      }

      // Execute each step sequentially
      const txHashes: string[] = [];

      for (let i = 0; i < stargateSteps.length; i++) {
        const step = stargateSteps[i];
        console.log(`\n--- Executing Step ${i + 1}/${stargateSteps.length}: ${step.type} ---`);
        console.log("Step data:", JSON.stringify(step, null, 2));

        const transaction = step.transaction;
        if (!transaction) {
          console.warn(`Step ${i + 1} has no transaction data, skipping`);
          continue;
        }

        const txData = {
          to: transaction.to,
          data: transaction.data,
          value: BigInt(transaction.value || '0'),
          chain: walletClient.chain,
          account: address as `0x${string}`,
        };

        console.log(`Transaction data for step ${i + 1}:`, txData);

        // Send the transaction
        const txHash = await walletClient.sendTransaction(txData);
        console.log(`Step ${i + 1} transaction sent! Hash:`, txHash);
        txHashes.push(txHash);
      }

      console.log("\n=== All transactions completed ===");
      console.log("Transaction hashes:", txHashes);

      // Create block explorer link based on chain (use last tx hash)
      const getExplorerUrl = (chainId: number, hash: string) => {
        const explorers: Record<number, string> = {
          1: 'https://etherscan.io',
          137: 'https://polygonscan.com',
          42161: 'https://arbiscan.io',
          10: 'https://optimistic.etherscan.io',
          8453: 'https://basescan.org',
          56: 'https://bscscan.com',
          43114: 'https://snowtrace.io',
        };
        return `${explorers[chainId] || 'https://etherscan.io'}/tx/${hash}`;
      };

      const lastTxHash = txHashes[txHashes.length - 1];
      const txLink = getExplorerUrl(fromChainId, lastTxHash);

      // Create LayerZero Scan link for cross-chain tracking
      const layerZeroScanLink = `https://layerzeroscan.com/tx/${lastTxHash}`;

      setTxHashLink(layerZeroScanLink);

      console.log(`All transactions sent! Final hash: ${lastTxHash}`);
      console.log(`Track cross-chain status: ${layerZeroScanLink}`);
    } catch (error) {
      console.error("Execution error:", error);
      console.error(`Failed to execute: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setExecuting(false);
    }
  };

  const fromChainTokens = TOKENS[fromChainId as keyof typeof TOKENS];
  const toChainTokens = TOKENS[toChainId as keyof typeof TOKENS];
  const fromTokenData = fromChainTokens?.[fromToken as keyof typeof fromChainTokens];
  const toTokenData = toChainTokens?.[toToken as keyof typeof toChainTokens];

  // Calculate estimated receive amount from route data
  const estimatedReceive = routeData?.routes?.[0]?.toAmount
    ? (parseInt(routeData.routes[0].toAmount) / Math.pow(10, toTokenData?.decimals || 6)).toFixed(6)
    : "0";

  return (
    <div className="font-sans min-h-screen p-4 sm:p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-2">Stargate Bridge</h1>
        </div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Swap</h2>
          <ConnectButton />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button className="px-6 py-3 font-semibold border-b-2 border-blue-500 text-blue-500">
              Swap
            </button>
            <button disabled className="px-6 py-3 font-semibold text-gray-500 opacity-40 cursor-not-allowed">
              Limit
            </button>
            <div className="ml-auto flex items-center gap-2 px-4">
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-4">
            {/* You pay section */}
            <div className="mb-2">
              <div className="text-sm text-gray-500 mb-2">You pay</div>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <TokenSelector
                    selectedChainId={fromChainId}
                    selectedToken={fromToken}
                    onChainChange={setFromChainId}
                    onTokenChange={setFromToken}
                  />
                  <input
                    type="text"
                    value={fromAmount}
                    onChange={(e) => setFromAmount(e.target.value)}
                    className="text-right text-2xl font-semibold bg-transparent outline-none w-32"
                    placeholder="0"
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{fromTokenData?.symbol || "Token"}</span>
                  <span className="text-gray-400">~$0.00</span>
                </div>
              </div>
            </div>

            {/* Swap arrow */}
            <div className="flex justify-center -my-2 relative z-10">
              <button
                onClick={() => {
                  // Swap from and to
                  const tempChain = fromChainId;
                  const tempToken = fromToken;
                  setFromChainId(toChainId);
                  setFromToken(toToken);
                  setToChainId(tempChain);
                  setToToken(tempToken);
                }}
                className="bg-white dark:bg-gray-800 border-4 border-gray-50 dark:border-gray-900 rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </button>
            </div>

            {/* You receive section */}
            <div className="mb-4">
              <div className="text-sm text-gray-500 mb-2">You receive</div>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <TokenSelector
                    selectedChainId={toChainId}
                    selectedToken={toToken}
                    onChainChange={setToChainId}
                    onTokenChange={setToToken}
                  />
                  <div className="text-right text-2xl font-semibold">
                    {loading ? "..." : estimatedReceive}
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{toTokenData?.symbol || "Token"}</span>
                  <span className="text-gray-400">~$0.00</span>
                </div>
              </div>
            </div>

            {/* Quote info */}
            {routeData?.routes?.[0] && (
              <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    1 {fromTokenData?.symbol} ≈ {estimatedReceive} {toTokenData?.symbol}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-green-500 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Free
                    </span>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            )}

            {/* Transaction Hash Display */}
            {/* <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">Debug: txHashLink = {txHashLink || "null"}</p>
            </div> */}

            {txHashLink && (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-green-700 dark:text-green-400 mb-1">
                      Trade Executed Successfully
                    </p>
                    <div className="flex items-center gap-2">
                      <a
                        href={txHashLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-green-600 dark:text-green-400 hover:underline truncate"
                      >
                        View Transaction →
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-3">
              <button
                onClick={getQuote}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white font-semibold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Getting Quote...' : 'Get Quote'}
              </button>

              {routeData?.routes?.[0] && (
                <button
                  onClick={executeSwap}
                  disabled={executing || !isConnected}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-400 hover:from-green-600 hover:to-emerald-500 text-white font-semibold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {!isConnected
                    ? 'Connect Wallet to Execute'
                    : executing
                    ? 'Executing Trade...'
                    : 'Execute Trade'}
                </button>
              )}
            </div>

            {/* Results */}
            {routeData && (
              <div className="mt-4">
                <details className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                  <summary className="text-sm font-semibold cursor-pointer">Route Details</summary>
                  <pre className="mt-2 text-xs overflow-auto max-h-60">
                    {JSON.stringify(routeData, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
