import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const apiKey = process.env.LIFI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'LIFI_API_KEY not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();

    const response = await fetch('https://li.quest/v1/advanced/stepTransaction', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'x-lifi-api-key': apiKey,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch step transaction from li.quest API', details: error },
      { status: 500 }
    );
  }
}
