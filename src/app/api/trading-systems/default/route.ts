import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export const dynamic = 'force-dynamic';

// DELETE /api/trading-systems/default - 取消默认交易系统
export async function DELETE(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization');
    if (!authorization) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const response = await fetch(`${BACKEND_URL}/api/trading-systems/default`, {
      method: 'DELETE',
      headers: {
        'Authorization': authorization,
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Clear default trading system error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
