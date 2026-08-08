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

    console.log(`[OCR Batch] Iniciando processamento de ${images.length} imagens no Ollama (${ollamaModel})`);

    const jsonParsed = [];

    // Processamento sequencial em Lote para o Ollama
    for (const img of images) {
      const base64Raw = img.base64.replace(/^data:image\/\w+;base64,/, "");

      const payload = {
        model: ollamaModel,
        prompt: "OUTPUT ONLY THE EXACT NUMBER SHOWN ON THE RED LED DISPLAY. NO TEXT. NO EXPLANATION. JUST THE NUMBER. IF THE SCREEN IS BLACK OR UNREADABLE RETURN X",
        images: [base64Raw],
        stream: false,
        options: {
          temperature: 0.0,
          num_predict: 10
        }
      };

      try {
        const res = await fetch(ollamaUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          throw new Error(`Erro Ollama: ${res.status}`);
        }

        const data = await res.json();
        const extractedText = data.response.trim();

        const isOutOfOrder = extractedText === 'X' || extractedText === '';
        // Remove tudo que não for dígito
        const cleanedValue = extractedText.replace(/\D/g, '');

        jsonParsed.push({
          index: img.index,
          value: isOutOfOrder ? "" : cleanedValue,
          isOutOfOrder: isOutOfOrder
        });

      } catch (err: any) {
        console.error(`Erro ao processar imagem ${img.index}:`, err.message);
        // Em caso de falha individual, marca como inoperante ou vazio para não travar o lote
        jsonParsed.push({
          index: img.index,
          value: "",
          isOutOfOrder: true
        });
      }
    }

    return NextResponse.json({ success: true, data: jsonParsed });

  } catch (error: any) {
    console.error('Erro no OCR Batch (Ollama):', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
