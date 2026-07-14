import { NextRequest } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export const dynamic = 'force-dynamic';

/**
 * GET /api/macro/rss?source=bloomberg_markets
 * 代理获取 RSS 新闻请求
 */
export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization');
    const { searchParams } = request.nextUrl;
    const source = searchParams.get('source');

    if (!source) {
      return new Response(JSON.stringify({ error: 'Missing source parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const backendResponse = await fetch(
      `${BACKEND_URL}/api/macro/rss?source=${source}`,
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
    console.error('RSS fetch proxy error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
