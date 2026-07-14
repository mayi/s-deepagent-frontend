import { NextRequest } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/macro/history/[recordId]
 * 代理删除宏观分析历史记录请求
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ recordId: string }> }
) {
  try {
    const authorization = request.headers.get('authorization');
    const { recordId } = await params;

    const backendResponse = await fetch(
      `${BACKEND_URL}/api/macro/history/${recordId}`,
      {
        method: 'DELETE',
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
    console.error('Macro history delete proxy error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
