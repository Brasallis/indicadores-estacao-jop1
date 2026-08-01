import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { imageBase64, mimeType, turnstiles } = await request.json();

    if (!imageBase64 || !turnstiles) {
      return NextResponse.json({ success: false, error: 'Missing imageBase64 or turnstiles list' }, { status: 400 });
    }

    const promptText = `Você é um extrator de dados altamente preciso. 
Abaixo está uma imagem de um formulário impresso de catracas de metrô preenchido à mão.
As catracas esperadas para esta estação são: ${turnstiles.join(', ')}.

Seu objetivo é analisar a imagem e extrair exatamente 4 números para cada catraca (nesta ordem): 
1) Entrada Inicial
2) Saída Inicial
3) Entrada Final
4) Saída Final

Se a linha da catraca contiver um "X", "x", "Inoperante" ou "quebrada", ela está quebrada, então defina "isOutOfOrder: true" e deixe os valores de entrada e saída vazios ("").

Responda ÚNICA E EXCLUSIVAMENTE em formato JSON. Sem explicações. Sem texto antes ou depois. O JSON deve ser um array de objetos exatamente neste formato:
[
  {
    "turnstileId": "JOP_01 PNE",
    "entryStart": "100",
    "exitStart": "200",
    "entryEnd": "300",
    "exitEnd": "400",
    "isOutOfOrder": false
  }
]
`;

    const prompt = [
      { text: promptText },
      {
        inlineData: {
          data: imageBase64,
          mimeType: mimeType || "image/jpeg"
        }
      }
    ];

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Chave GEMINI_API_KEY não configurada no arquivo .env");
      }

      // Usando o SDK Oficial da Google para máxima estabilidade e precisão
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-flash-latest",
        generationConfig: {
          responseMimeType: "application/json",
        }
      });

      let result;
      try {
        result = await model.generateContent(prompt);
      } catch (err: any) {
        if (err.message.includes('404')) {
          const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
          const modelsData = await modelsRes.json();
          const availableModels = modelsData.models?.map((m: any) => m.name).join(', ') || 'Nenhum';
          throw new Error(`Modelo não encontrado. Modelos disponíveis na sua chave: ${availableModels}`);
        }
        throw err;
      }
      
      const response = result.response;
      const rawResponseText = response.text();
      
      let jsonParsed = [];
      try {
        jsonParsed = JSON.parse(rawResponseText);
      } catch(e) {
        const matches = rawResponseText.match(/\[[\s\S]*\]/);
        if (matches) jsonParsed = JSON.parse(matches[0]);
        else throw new Error("O Gemini retornou um formato JSON inválido.");
      }

      return NextResponse.json({ success: true, data: jsonParsed });

    } catch (aiError: any) {
      console.error("⚠️ Erro fatal no Gemini:", aiError);
      throw new Error(`Falha crítica na IA: ${aiError.message}`);
    }

  } catch (error: any) {
    console.error('Erro na integração com IA:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
