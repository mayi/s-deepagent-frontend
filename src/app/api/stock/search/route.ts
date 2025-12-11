import { NextRequest } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const keyword = searchParams.get('keyword');
    const limit = searchParams.get('limit') || '10';

    if (!keyword) {
      return new Response(
        JSON.stringify({ error: 'keyword parameter is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 转发到 FastAPI 后端
    const backendResponse = await fetch(
      `${BACKEND_URL}/api/stock/search?keyword=${encodeURIComponent(keyword)}&limit=${limit}`
    );

    const data = await backendResponse.json();

    return new Response(JSON.stringify(data), {
      status: backendResponse.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Search API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
