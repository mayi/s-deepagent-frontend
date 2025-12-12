import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const authorization = request.headers.get('authorization');

    const response = await fetch(`${API_URL}/api/analyze/task/${taskId}`, {
      method: 'DELETE',
      headers: {
        ...(authorization && { 'Authorization': authorization }),
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
