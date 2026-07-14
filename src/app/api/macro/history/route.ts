import { NextRequest } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export const dynamic = 'force-dynamic';

/**
 * GET /api/macro/history?limit=20
 * 代理宏观分析历史记录请求
 */
export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization');
    const { searchParams } = request.nextUrl;
    const limit = searchParams.get('limit') || '20';

    const backendResponse = await fetch(
      `${BACKEND_URL}/api/macro/history?limit=${limit}`,
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
    console.error('Macro history proxy error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
