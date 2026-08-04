import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";
export const maxDuration = 60; // Max execution time for Vercel Free tier

export async function POST(request: Request) {
  try {
    const { images } = await request.json();

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ success: false, error: 'Missing images array' }, { status: 400 });
    }

    const promptText = `Você é um leitor de catracas de alta precisão. 
Abaixo estão várias imagens. Cada imagem é a foto de um display de catraca. O nome da catraca e se é Entrada ou Saída está escrito como uma marca d'água no canto superior de cada foto.

Sua tarefa:
Leia o número digital vermelho de cada foto na ordem em que foram fornecidas.
Regra crucial para o número:
- Se houver pontos (ex: "6.6.7"), significa SAÍDA.
- Se não houver pontos (ex: "766"), significa ENTRADA.

Retorne ÚNICA E EXCLUSIVAMENTE um array JSON contendo um objeto para cada foto, nesta mesma ordem. Use exatamente as chaves abaixo:
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

Remova pontos do valor final. Se notar "X" ou Inoperante, marque isOutOfOrder: true e deixe o value vazio. Responda apenas com JSON.`;

    const promptParts: any[] = [{ text: promptText }];

    images.forEach((img: { base64: string, index: number }) => {
      promptParts.push({
        inlineData: {
          data: img.base64,
          mimeType: "image/jpeg"
        }
      });
    });

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("Chave GEMINI_API_KEY não configurada");

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-flash-latest",
        generationConfig: {
          responseMimeType: "application/json",
        }
      });

      const result = await model.generateContent(promptParts);
      const response = result.response;
      const rawResponseText = response.text();
      
      let jsonParsed = [];
      try {
        jsonParsed = JSON.parse(rawResponseText);
      } catch(e) {
        const matches = rawResponseText.match(/\[[\s\S]*\]/);
        if (matches) jsonParsed = JSON.parse(matches[0]);
        else throw new Error("O Gemini retornou formato JSON inválido.");
      }

      return NextResponse.json({ success: true, data: jsonParsed });

    } catch (aiError: any) {
      if (aiError.message && aiError.message.includes('429')) {
        return NextResponse.json({ success: false, error: 'RATE_LIMIT', details: aiError.message }, { status: 429 });
      }
      throw new Error(`Falha crítica na IA: ${aiError.message}`);
    }

  } catch (error: any) {
    console.error('Erro no OCR Batch:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
