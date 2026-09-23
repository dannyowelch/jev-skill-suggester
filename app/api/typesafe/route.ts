import { NextRequest, NextResponse } from 'next/server';
import type { TypeSafeRequest, TypeSafeResponse } from '@/app/types';

const TYPESAFE_API_URL = 'https://api.typesafe.ai/v1/systemone';

export async function POST(request: NextRequest) {
  try {
    const body: TypeSafeRequest = await request.json();
    
    const apiKey = request.headers.get('x-typesafe-key') || process.env.TYPESAFE_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'TypeSafe API key not provided' },
        { status: 401 }
      );
    }

    const startTime = Date.now();
    const response = await fetch(TYPESAFE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const timing_ms = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `TypeSafe API error: ${response.status} ${errorText}` },
        { status: response.status }
      );
    }

    const data: TypeSafeResponse = await response.json();
    
    return NextResponse.json({
      ...data,
      timing_ms,
    });
  } catch (error) {
    console.error('TypeSafe API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
