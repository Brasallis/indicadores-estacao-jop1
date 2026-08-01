import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";
export const maxDuration = 60; // Permite até 60 segundos de execução na Vercel

export async function POST(request: Request) {
  try {
    const { imageBase64, mimeType, turnstiles, expectedTurnstile } = await request.json();

    if (!imageBase64) {
      return NextResponse.json({ success: false, error: 'Missing imageBase64' }, { status: 400 });
    }

    const promptText = `Você é um extrator de dados altamente preciso. 
Abaixo está uma imagem do display de UMA única catraca de metrô.
Na imagem, você deve encontrar o número digital iluminado em LED vermelho.

${expectedTurnstile ? `NOTA: O sistema já sabe que esta foto pertence ao bloqueio "${expectedTurnstile}". Você não precisa identificar a etiqueta. Foco total em ler o número LED.` : `A lista de bloqueios válidos para esta estação é: ${turnstiles?.join(', ')}. Tente ler a etiqueta.`}

Regra crucial para o número:
- Se o número exibido contiver pontos entre os dígitos (exemplo: "6.6.7" ou "4.4.4"), isso significa que é uma leitura de SAÍDA.
- Se o número exibido NÃO contiver pontos (exemplo: "766" ou "444"), isso significa que é uma leitura de ENTRADA.

Responda ÚNICA E EXCLUSIVAMENTE em formato JSON. Sem explicações. O JSON deve ser exatamente neste formato:
{
  "turnstileId": "${expectedTurnstile || "IDENTIFICADOR ENCONTRADO"}",
  "value": "667",
  "type": "exit"
}
Remova os pontos do valor final. Se você não conseguir encontrar um número legível, deixe "value" vazio. Se você notar algum aviso de "X" ou que o bloqueio está bloqueado/desligado, retorne { "isOutOfOrder": true }.
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
          throw new Error(`Modelo não encontrado. Modelos disponíveis: ${availableModels}`);
        }
        throw err;
      }
      
      const response = result.response;
      const rawResponseText = response.text();
      
      let jsonParsed = null;
      try {
        jsonParsed = JSON.parse(rawResponseText);
      } catch(e) {
        const matches = rawResponseText.match(/\{[\s\S]*\}/);
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
