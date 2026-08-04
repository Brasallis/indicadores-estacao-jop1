import Tesseract from 'tesseract.js';

/**
 * Função para aplicar um filtro na imagem que destaca LEDs vermelhos/luminosos e escurece o resto.
 * Isso aumenta drasticamente a precisão do Tesseract.js em displays de catracas.
 */
const applyHighContrastFilter = (imageElement: HTMLImageElement): string => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  canvas.width = imageElement.width;
  canvas.height = imageElement.height;

  // Desenha a imagem original
  ctx.drawImage(imageElement, 0, 0);

  // Pega os pixels
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Aplica filtro de Binarização adaptado para telas luminosas
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Para displays de LED (geralmente vermelhos, laranjas ou verdes muito brilhantes)
    // Se o brilho geral for muito alto ou se o vermelho for predominante
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    
    // Threshold simples: Se for brilhante, pinta de preto (texto para Tesseract). Se escuro, pinta de branco (fundo)
    // Tesseract lê melhor texto preto no fundo branco.
    if (brightness > 120 || r > 150) {
      // É LED / Número brilhante -> Pintar de preto
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
    } else {
      // Fundo escuro -> Pintar de branco
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.8);
};

export const extractTurnstileValue = async (file: File): Promise<{ value: string, isOutOfOrder: boolean }> => {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = async () => {
      try {
        // Aplica nosso "Photoshop" em código para isolar os números
        const processedImageBase64 = applyHighContrastFilter(img);
        
        if (!processedImageBase64) {
          resolve({ value: '', isOutOfOrder: false });
          return;
        }

        // Roda o Tesseract no navegador!
        const result = await Tesseract.recognize(
          processedImageBase64,
          'eng', // inglês padrão costuma ser o melhor para números
          {
            logger: m => console.log(m),
            // Força o tesseract a só procurar números, X e ponto
            tessedit_char_whitelist: '0123456789xX. '
          }
        );

        let text = result.data.text.trim();
        
        // Verifica se leu um 'X' de inoperante
        if (text.toLowerCase().includes('x')) {
          resolve({ value: '', isOutOfOrder: true });
          return;
        }

        // Remove tudo que não for número (tira pontos soltos, espaços, etc)
        const cleanNumber = text.replace(/[^0-9]/g, '');
        
        resolve({ value: cleanNumber, isOutOfOrder: false });
      } catch (e) {
        console.error("Erro no OCR Local:", e);
        resolve({ value: '', isOutOfOrder: false });
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ value: '', isOutOfOrder: false });
    };

    img.src = url;
  });
};
