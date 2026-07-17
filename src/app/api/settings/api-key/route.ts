import { NextRequest } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

async function handleRequest(request: NextRequest, method: string) {
  try {
    const authorization = request.headers.get('authorization');

    if (!authorization) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 转发到 FastAPI 后端
    const backendResponse = await fetch(`${BACKEND_URL}/api/settings/api-key`, {
      method: method,
      headers: {
        'Authorization': authorization,
      },
      cache: 'no-store'
    });

    const data = await backendResponse.json();

    return new Response(JSON.stringify(data), {
      status: backendResponse.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(`API Key ${method} error:`, error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleRequest(request, 'GET');
}

export async function POST(request: NextRequest) {
  return handleRequest(request, 'POST');
}

export async function DELETE(request: NextRequest) {
  return handleRequest(request, 'DELETE');
}
