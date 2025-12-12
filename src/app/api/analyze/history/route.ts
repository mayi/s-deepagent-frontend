import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization');
    
    // Require authentication
    if (!authorization) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '20';
    const status = searchParams.get('status');

    const url = new URL(`${API_URL}/api/analyze/history`);
    url.searchParams.set('limit', limit);
    if (status) url.searchParams.set('status', status);

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': authorization,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: '服务器连接失败' },
      { status: 500 }
    );
  }
}
