import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
    try {
        const auth = request.headers.get('authorization');
        if (!auth) return NextResponse.json({ error: '请先登录' }, { status: 401 });

        const body = await request.json();
        const response = await fetch(`${API_URL}/api/screener/kline/batch`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': auth,
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: '服务器连接失败' }, { status: 500 });
    }
}
