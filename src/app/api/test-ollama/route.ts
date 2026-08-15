import { NextResponse } from 'next/server';

export const runtime = "nodejs";

export async function GET() {
  const ollamaUrl = process.env.OLLAMA_URL || "http://127.0.0.1:11434/api/generate";
  
  try {
    // Tenta apenas bater na raiz do servidor Ollama para ver se está vivo
    // Se a URL for https://xxx.trycloudflare.com/api/generate, a raiz é https://xxx.trycloudflare.com/
    const baseUrl = new URL(ollamaUrl).origin;
    
    const start = Date.now();
    const res = await fetch(baseUrl, {
      method: 'GET',
      headers: {
        'Bypass-Tunnel-Reminder': 'true',
        'User-Agent': 'curl/7.68.0'
      }
    });
    
    const time = Date.now() - start;
    const text = await res.text();

    return NextResponse.json({
      success: res.ok,
      status: res.status,
      ping_ms: time,
      url: baseUrl,
      response: text.substring(0, 200) // Pega os primeiros 200 caracteres da resposta
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      url: ollamaUrl
    }, { status: 500 });
  }
}
