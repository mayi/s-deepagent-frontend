import { NextRequest } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

// 禁用默认的 body 解析器和超时限制
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5分钟超时

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const stock_code = searchParams.get('stock_code');

    const holding_quantity = searchParams.get('holding_quantity');
    const cost_price = searchParams.get('cost_price');

    if (!stock_code) {
      return new Response(
        JSON.stringify({ error: 'stock_code is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 获取 Authorization header
    const authorization = request.headers.get('authorization');

    let backendUrl = `${BACKEND_URL}/api/analyze?stock_code=${encodeURIComponent(stock_code)}`;
    if (holding_quantity) backendUrl += `&holding_quantity=${encodeURIComponent(holding_quantity)}`;
    if (cost_price) backendUrl += `&cost_price=${encodeURIComponent(cost_price)}`;

    // 转发到 FastAPI 后端
    const backendResponse = await fetch(backendUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
          ...(authorization && { 'Authorization': authorization }),
        },
        // @ts-ignore - Node.js fetch options
        signal: null, // 禁用超时
      }
    );

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      return new Response(errorText, {
        status: backendResponse.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 创建 SSE 流
    const stream = new ReadableStream({
      async start(controller) {
        const reader = backendResponse.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          controller.close();
          return;
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // 直接转发 SSE 数据
            controller.enqueue(value);
          }
        } catch (error) {
          console.error('SSE stream error:', error);
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });

    // 返回 SSE 响应
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // 禁用 Nginx 缓冲
      },
    });
  } catch (error) {
    console.error('Analyze API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
