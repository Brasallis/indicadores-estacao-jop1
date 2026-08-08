import { pipeline, env } from '@huggingface/transformers';

// Desabilita cache local pesado no modo dev se necessário
env.allowLocalModels = false;

let visionPipeline: any = null;

async function initModel() {
  if (visionPipeline) return visionPipeline;
  
  // Utilizaremos o Florence-2 da Microsoft, o modelo Vision-Language mais avançado do mundo
  // para leitura de textos em imagens complexas. Oficialmente suportado no navegador!
  postMessage({ status: 'log', message: 'Iniciando alocação do motor Transformers.js (Preparando Florence-2 Microsoft)...' });
  
  visionPipeline = await pipeline('image-to-text', 'Xenova/Florence-2-base', {
    dtype: 'q8', // Quantização segura para rodar em qualquer PC/Tablet
    // Removemos o device: 'webgpu' para permitir que o transformers.js decida o melhor backend
    progress_callback: (progress: any) => {
      if (progress.status === 'downloading') {
        postMessage({ status: 'downloading', message: `Baixando VLM Pesado (${progress.name}) - Pode demorar alguns minutos...` });
      }
    }
  });

  postMessage({ status: 'init' });
  postMessage({ status: 'log', message: 'Modelo Florence-2 da Microsoft alocado com sucesso!' });
  return visionPipeline;
}

// Inicializa no background ao carregar e captura erros fatais
initModel().catch(err => {
  console.error("Erro fatal ao carregar o modelo:", err);
  postMessage({ status: 'error', message: 'Falha ao iniciar motor de IA: ' + err.message });
});


self.onmessage = async (e: MessageEvent) => {
  const { type, image } = e.data;

  if (type === 'process') {
    try {
      postMessage({ status: 'log', message: 'Analisando tensores da imagem offline via Placa de Vídeo...' });
      const pipe = await initModel();
      
      const prompt = "<OCR>"; // Comando especial do Florence-2 para extrair todo o texto visível e distorcido
      postMessage({ status: 'log', message: `Executando varredura ótica com Microsoft Florence-2...` });

      const out = await pipe(image, { prompt });
      const text = out[0].generated_text;

      postMessage({ status: 'log', message: `Extração concluída: ${text}` });
      postMessage({ status: 'complete', data: text });
    } catch (error: any) {
      console.error(error);
      postMessage({ status: 'error', message: error.message });
    }
  }
};
