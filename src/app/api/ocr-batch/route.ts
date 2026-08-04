import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const runtime = "nodejs";
export const maxDuration = 60; 

export async function POST(request: Request) {
  try {
    const { images } = await request.json();

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ success: false, error: 'Missing images array' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Chave GEMINI_API_KEY não configurada.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });

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

    const promptParts: any[] = [promptText];

    images.forEach((img: { base64: string, index: number }) => {
      promptParts.push({
        inlineData: {
          data: img.base64,
          mimeType: "image/jpeg"
        }
      });
    });

    const result = await model.generateContent(promptParts);
    const response = await result.response;
    const text = response.text();
    
    let jsonParsed = [];
    try {
      jsonParsed = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
    } catch(e) {
      const matches = text.match(/\[[\s\S]*\]/);
      if (matches) {
        jsonParsed = JSON.parse(matches[0]);
      } else {
        throw new Error("O Gemini retornou um formato JSON inválido.");
      }
    }

    return NextResponse.json({ success: true, data: jsonParsed });

  } catch (error: any) {
    console.error('Erro no OCR Batch (Gemini):', error);
    if (error.status === 429 || error.message.includes('429')) {
      return NextResponse.json({ success: false, error: 'RATE_LIMIT' }, { status: 429 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
