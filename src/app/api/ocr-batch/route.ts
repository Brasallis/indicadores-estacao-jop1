import { NextResponse } from 'next/server';

export const runtime = "nodejs";
export const maxDuration = 60; 

export async function POST(request: Request) {
  try {
    const { images } = await request.json();

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ success: false, error: 'Missing images array' }, { status: 400 });
    }

    const ollamaUrl = process.env.OLLAMA_URL || "http://127.0.0.1:11434/api/generate";
    const ollamaModel = process.env.OLLAMA_MODEL || "llava-phi3";

    console.log(`[OCR Batch Harness] Iniciando processamento de ${images.length} imagens no Ollama (${ollamaModel})`);

    const jsonParsed = [];

    // Processamento sequencial em Lote para o Ollama
    for (const img of images) {
      const base64Raw = img.base64.replace(/^data:image\/\w+;base64,/, "");
      
      const turnstileId = img.turnstileId || "Desconhecido";
      const readingType = img.type === 'entry' ? 'Entrada' : 'Saída';
      
      let contextInstruction = "";
      if (img.previousValue && !isNaN(Number(img.previousValue))) {
         contextInstruction = `CRITICAL CONTEXT: The previous reading for this turnstile was ${img.previousValue}. The new number MUST be greater than or equal to ${img.previousValue} (turnstiles only increment). If the number you read is smaller, you might be reading it wrong.`;
      }

      const prompt = `You are an AI Harness for a Turnstile OCR system. You are reading the ${readingType} display of turnstile ${turnstileId}.
The display is a RED LED. Digits may be separated by dots (e.g. 7.6.7).
${contextInstruction}
Read ALL digits from left to right. Ignore the dots. 
You MUST respond in pure JSON format with the following schema:
{
  "value": "string (the extracted digits only, no dots. Or empty string if unreadable)",
  "confidence": number (0 to 100, your confidence in the reading)
}`;

      const payload = {
        model: ollamaModel,
        prompt: prompt,
        images: [base64Raw],
        stream: false,
        format: "json",
        options: {
          temperature: 0.0,
          num_predict: 100
        }
      };

      try {
        const res = await fetch(ollamaUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Bypass-Tunnel-Reminder': 'true', // Ignora a tela de aviso de segurança do LocalTunnel
            'User-Agent': 'curl/7.68.0' // Engana firewalls fingindo ser um terminal
          },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          throw new Error(`Erro Ollama: ${res.status}`);
        }

        const data = await res.json();
        
        let aiResult = { value: "", confidence: 0 };
        try {
           aiResult = JSON.parse(data.response.trim());
        } catch (e) {
           console.error(`Erro ao fazer parse do JSON do Ollama:`, data.response);
        }

        const rawValue = aiResult.value ? String(aiResult.value).replace(/\D/g, '') : '';
        const confidence = aiResult.confidence || 0;
        let finalValue = rawValue;

        // Harness Guardrails
        let rejectedReason = null;

        if (confidence < 80) {
           rejectedReason = `Confiança baixa (${confidence}%)`;
           finalValue = "";
        } else if (img.previousValue && finalValue) {
           const currentNum = parseInt(finalValue, 10);
           const prevNum = parseInt(img.previousValue, 10);
           if (currentNum < prevNum) {
              rejectedReason = `Inconsistência Matemática: Lida ${currentNum} < Anterior ${prevNum}`;
              finalValue = ""; // Reject!
           }
        }

        if (rejectedReason) {
            console.log(`[Harness] Leitura REJEITADA para ${turnstileId} (${readingType}): ${rejectedReason}`);
        } else if (finalValue) {
            console.log(`[Harness] Leitura APROVADA para ${turnstileId} (${readingType}): ${finalValue} (Confiança: ${confidence}%)`);
        } else {
            console.log(`[Harness] Leitura VAZIA/NÃO IDENTIFICADA para ${turnstileId} (${readingType})`);
        }

        jsonParsed.push({
          index: img.index,
          value: finalValue,
          isOutOfOrder: false
        });

      } catch (err: any) {
        console.error(`Erro ao processar imagem ${img.index}:`, err.message);
        jsonParsed.push({
          index: img.index,
          value: "",
          isOutOfOrder: false
        });
      }
    }

    return NextResponse.json({ success: true, data: jsonParsed });

  } catch (error: any) {
    console.error('Erro no OCR Batch Harness:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
