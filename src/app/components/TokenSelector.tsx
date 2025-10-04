"use client";

import { useState, useRef, useEffect } from "react";
import { TOKENS } from "../lib/tokens";
import { CHAINS } from "../lib/chains";

interface TokenSelectorProps {
  selectedChainId: number;
  selectedToken: string;
  onChainChange: (chainId: number) => void;
  onTokenChange: (token: string) => void;
}

export function TokenSelector({
  selectedChainId,
  selectedToken,
  onChainChange,
  onTokenChange,
}: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const tokens = TOKENS[selectedChainId as keyof typeof TOKENS] || {};
  const tokenList = Object.values(tokens);
  const currentToken = tokens[selectedToken as keyof typeof tokens];
  const currentChain = CHAINS[selectedChainId as keyof typeof CHAINS];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-2 rounded-lg transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
          {currentToken?.symbol?.[0] || "?"}
        </div>
        <div className="flex flex-col items-start">
          <div className="flex items-center gap-1">
            <span className="font-semibold">{currentToken?.symbol || "Select"}</span>
            <svg
              className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          <span className="text-xs text-gray-500">on {currentChain?.name || "Unknown"}</span>
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 max-h-96 overflow-auto">
          {/* Chain Selector */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="text-xs font-semibold text-gray-500 mb-2">NETWORK</div>
            <div className="grid grid-cols-3 gap-2">
              {Object.values(CHAINS).map((chain) => (
                <button
                  key={chain.id}
                  onClick={() => {
                    onChainChange(chain.id);
                    // Reset to first token on chain change
                    const newTokens = TOKENS[chain.id as keyof typeof TOKENS];
                    if (newTokens) {
                      const firstToken = Object.keys(newTokens)[0];
                      onTokenChange(firstToken);
                    }
                  }}
                  className={`p-2 rounded text-xs font-medium transition-colors ${
                    selectedChainId === chain.id
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {chain.shortName}
                </button>
              ))}
            </div>
          </div>

          {/* Token List */}
          <div className="p-3">
            <div className="text-xs font-semibold text-gray-500 mb-2">TOKEN</div>
            <div className="space-y-1">
              {tokenList.map((token) => (
                <button
                  key={token.symbol}
                  onClick={() => {
                    onTokenChange(token.symbol);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    selectedToken === token.symbol ? "bg-gray-100 dark:bg-gray-700" : ""
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
                    {token.symbol[0]}
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="font-semibold text-sm">{token.symbol}</span>
                    <span className="text-xs text-gray-500 font-mono truncate max-w-[200px]">
                      {token.address.slice(0, 6)}...{token.address.slice(-4)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
