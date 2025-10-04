import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.LIFI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'LIFI_API_KEY not configured' },
      { status: 500 }
    );
  }

  try {
    const response = await fetch('https://li.quest/v1/keys/test', {
      method: 'GET',
      headers: {
        'x-lifi-api-key': apiKey,
      },
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch from li.quest API', details: error },
      { status: 500 }
    );
  }
}
