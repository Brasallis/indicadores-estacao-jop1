import { pipeline, env } from '@huggingface/transformers';

// Desabilita cache local pesado no modo dev se necessário
env.allowLocalModels = false;

// Evitar problemas de versão com onnxruntime
env.backends.onnx.wasm.numThreads = 1;

let visionPipeline: any = null;

async function initModel() {
  if (visionPipeline) return visionPipeline;
  
  // Utilizaremos o TrOCR (Transformer-based Optical Character Recognition) da Microsoft
  // É um modelo super leve (menos de 300MB) otimizado para ler textos impressos e painéis de LCD.
  postMessage({ status: 'log', message: 'Iniciando alocação do motor Transformers.js...' });
  
  visionPipeline = await pipeline('image-to-text', 'Xenova/trocr-small-printed', {
    progress_callback: (progress: any) => {
      if (progress.status === 'downloading') {
        postMessage({ status: 'downloading', message: `Baixando modelo (${progress.name})...` });
      }
    }
  });

  postMessage({ status: 'init' });
  postMessage({ status: 'log', message: 'Modelo TrOCR carregado com sucesso.' });
  return visionPipeline;
}

// Inicializa no background ao carregar
initModel();

self.onmessage = async (e: MessageEvent) => {
  const { type, image } = e.data;

  if (type === 'process') {
    try {
      postMessage({ status: 'log', message: 'Analisando tensores da imagem offline...' });
      const pipe = await initModel();
      
      const out = await pipe(image);
      const text = out[0].generated_text;

      postMessage({ status: 'log', message: `Extração concluída: ${text}` });
      postMessage({ status: 'complete', data: text });
    } catch (error: any) {
      console.error(error);
      postMessage({ status: 'error', message: error.message });
    }
  }
};
