import { NextRequest } from 'next/server';

const API_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
    const auth = request.headers.get('authorization');
    if (!auth) return new Response('Unauthorized', { status: 401 });

    const { searchParams } = new URL(request.url);
    const pattern = searchParams.get('pattern');
    const params = searchParams.get('params');

    if (!pattern) return new Response('Missing pattern', { status: 400 });

    let backendUrl = `${API_URL}/api/screener/run?pattern=${pattern}`;
    if (params) {
        backendUrl += `&params=${encodeURIComponent(params)}`;
    }

    const response = await fetch(backendUrl, {
        headers: {
            'Authorization': auth,
        },
    });

    if (!response.ok) {
        return new Response('Backend error', { status: response.status });
    }

    // 返回流给前端
    return new Response(response.body, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
