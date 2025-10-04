import { NextResponse } from 'next/server';

// Chain ID to Stargate chain key mapping
const CHAIN_KEY_MAP: Record<number, string> = {
  1: 'ethereum',
  137: 'polygon',
  42161: 'arbitrum',
  10: 'optimism',
  8453: 'base',
  56: 'bsc',
  43114: 'avalanche',
};

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Map LiFi format to Stargate format
    const srcChainKey = CHAIN_KEY_MAP[body.fromChainId];
    const dstChainKey = CHAIN_KEY_MAP[body.toChainId];

    if (!srcChainKey || !dstChainKey) {
      return NextResponse.json(
        { error: `Unsupported chain. From: ${body.fromChainId}, To: ${body.toChainId}` },
        { status: 400 }
      );
    }

    // Calculate minimum destination amount (0.5% slippage)
    const dstAmountMin = Math.floor(parseInt(body.fromAmount) * 0.995).toString();

    const params = new URLSearchParams({
      srcToken: body.fromTokenAddress,
      dstToken: body.toTokenAddress,
      srcAddress: body.fromAddress,
      dstAddress: body.toAddress,
      srcChainKey,
      dstChainKey,
      srcAmount: body.fromAmount,
      dstAmountMin,
    });

    const url = `https://stargate.finance/api/v1/quotes?${params}`;
    console.log('Requesting Stargate quote:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
      },
    });

    const data = await response.json();
    console.log('Stargate response:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Stargate API error', details: data },
        { status: response.status }
      );
    }

    // Stargate returns an array of quotes, pick the first one
    const quote = Array.isArray(data.quotes) ? data.quotes[0] : data;

    console.log('Quote steps:', JSON.stringify(quote?.steps, null, 2));

    // Stargate returns all steps needed for the transfer
    const allSteps = quote?.steps || [];

    // Transform Stargate response to match LiFi format expected by frontend
    const transformedData = {
      routes: [{
        toAmount: quote?.dstAmount || quote?.amountLD || '0',
        fromAmount: body.fromAmount,
        fromChainId: body.fromChainId,
        toChainId: body.toChainId,
        // Include all steps from Stargate (approval, transfer, etc.)
        stargateSteps: allSteps,
        // Also include the full quote for debugging
        fullQuote: quote,
      }]
    };

    return NextResponse.json(transformedData, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch routes from Stargate API', details: error },
      { status: 500 }
    );
  }
}
