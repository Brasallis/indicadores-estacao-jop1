import { NextResponse } from 'next/server';

export const runtime = "nodejs";
export const maxDuration = 60; 

export async function POST(request: Request) {
  try {
    const { images } = await request.json();

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ success: false, error: 'Missing images array' }, { status: 400 });
    }

    const promptText = `Você é um leitor de catracas de alta precisão. 
Abaixo estão várias imagens. Cada imagem é a foto de um display de catraca. O nome da catraca e se é Entrada ou Saída está escrito como uma marca d'água no topo de cada foto.

Sua tarefa:
Leia o número digital vermelho de cada foto na exata ordem.
- Se houver pontos (ex: "6.6.7"), significa SAÍDA.
- Se não houver pontos (ex: "766"), significa ENTRADA.

Retorne ÚNICA E EXCLUSIVAMENTE um array JSON contendo um objeto para cada foto, nesta mesma ordem. Use exatamente as chaves abaixo (sem markdown, sem \`\`\`json):
[
  {
    "index": 0,
    "value": "1234",
    "isOutOfOrder": false
  },
  {
    "index": 1,
    "value": "",
    "isOutOfOrder": true
  }
]

Remova pontos do valor final. Se notar "X" ou Inoperante, marque isOutOfOrder: true e deixe o value vazio. Apenas retorne o JSON!`;

    const content: any[] = [{ type: "text", text: promptText }];

    images.forEach((img: { base64: string, index: number }) => {
      content.push({
        type: "image_url",
        image_url: {
          url: `data:image/jpeg;base64,${img.base64}`
        }
      });
    });

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("Chave GROQ_API_KEY não configurada. Por favor, adicione na Vercel.");
    }

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.2-11b-vision-preview',
        messages: [
          {
            role: 'user',
            content: content
          }
        ],
        temperature: 0.1,
        max_tokens: 1024
      })
    });

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      if (groqResponse.status === 429) {
        return NextResponse.json({ success: false, error: 'RATE_LIMIT', details: errText }, { status: 429 });
      }
      throw new Error(`Groq API Error: ${groqResponse.status} - ${errText}`);
    }

    const data = await groqResponse.json();
    const rawResponseText = data.choices[0].message.content;
    
    let jsonParsed = [];
    try {
      jsonParsed = JSON.parse(rawResponseText.trim());
    } catch(e) {
      const matches = rawResponseText.match(/\[[\s\S]*\]/);
      if (matches) {
        jsonParsed = JSON.parse(matches[0]);
      } else {
        throw new Error("O Llama retornou um formato JSON inválido.");
      }
    }

    return NextResponse.json({ success: true, data: jsonParsed });

  } catch (error: any) {
    console.error('Erro no OCR Batch (Groq):', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
