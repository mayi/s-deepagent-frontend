import { NextRequest } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export const dynamic = 'force-dynamic';

/**
 * GET /api/macro/backtest/[recordId]?days=7
 * 代理宏观分析回测请求
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ recordId: string }> }
) {
  try {
    const authorization = request.headers.get('authorization');
    const { recordId } = await params;
    const { searchParams } = request.nextUrl;
    const days = searchParams.get('days') || '7';

    const backendResponse = await fetch(
      `${BACKEND_URL}/api/macro/backtest/${recordId}?days=${days}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(authorization && { Authorization: authorization }),
        },
      }
    );

    const data = await backendResponse.json();
    return new Response(JSON.stringify(data), {
      status: backendResponse.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Macro backtest proxy error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
