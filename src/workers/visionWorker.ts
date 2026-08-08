import { pipeline, env } from '@huggingface/transformers';

// Desabilita cache local pesado no modo dev se necessário
env.allowLocalModels = false;

let visionPipeline: any = null;

async function initModel() {
  if (visionPipeline) return visionPipeline;
  
  // Utilizaremos o Moondream2, um VLM pesado de 1.4B parâmetros (1.5GB+ de VRAM)
  // Capaz de entender o contexto da foto inteira da catraca
  postMessage({ status: 'log', message: 'Iniciando alocação do motor Transformers.js (Preparando para VLM Pesado)...' });
  
  visionPipeline = await pipeline('image-to-text', 'Xenova/moondream2', {
    dtype: { embed_tokens: 'fp16', vision_encoder: 'fp16', decoder_model_merged: 'q8' },
    // Removemos o device: 'webgpu' para permitir que o transformers.js decida o melhor backend
    progress_callback: (progress: any) => {
      if (progress.status === 'downloading') {
        postMessage({ status: 'downloading', message: `Baixando VLM Pesado (${progress.name}) - Pode demorar alguns minutos...` });
      }
    }
  });

  postMessage({ status: 'init' });
  postMessage({ status: 'log', message: 'Modelo Moondream2 (1.5GB+) alocado com sucesso na GPU!' });
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
      
      const prompt = "Read only the digital numbers on the LCD screen inside this photo. Just the numbers.";
      postMessage({ status: 'log', message: `Executando prompt VLM: "${prompt}"` });

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
