import { NextRequest } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    // 转发到 FastAPI 后端
    const backendResponse = await fetch(`${BACKEND_URL}/api/health`, {
      method: 'GET',
    });

    const data = await backendResponse.json();

    return new Response(JSON.stringify(data), {
      status: backendResponse.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Health check error:', error);
    return new Response(
      JSON.stringify({ 
        status: 'error',
        message: 'Backend connection failed',
        error: String(error)
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
