'use client';

import React, { useState } from 'react';
import styles from './page.module.css';

export default function OllamaLab() {
  const [modelName, setModelName] = useState<string>('llava-phi3');
  const [serverUrl, setServerUrl] = useState<string>('http://localhost:11434');
  const [prompt, setPrompt] = useState<string>('OUTPUT ONLY THE EXACT NUMBER SHOWN ON THE RED LED DISPLAY. NO TEXT. NO EXPLANATION. JUST THE NUMBER.');
  
  const [image, setImage] = useState<string | null>(null);
  const [base64Raw, setBase64Raw] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const fullBase64 = event.target.result as string;
        setImage(fullBase64);
        setBase64Raw(fullBase64.split(',')[1]); // Ollama precisa só dos dados sem o cabeçalho data:image
        setResult(null);
        setError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const processImage = async () => {
    if (!base64Raw) return;
    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      // Fazendo a chamada direto do navegador para o Ollama local
      const res = await fetch(`${serverUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelName,
          prompt: prompt,
          images: [base64Raw],
          stream: false, // Para pegar a resposta completa de uma vez
          options: {
            temperature: 0.0, // Zera a criatividade para não alucinar textos
            num_predict: 10 // Força o modelo a parar de escrever depois de 10 letras (Acelera brutalmente o tempo de resposta)
          }
        })
      });

      if (!res.ok) {
        throw new Error(`Erro de rede ou servidor rejeitou (Status ${res.status}). Verifique se o Ollama está rodando com OLLAMA_ORIGINS="*"`);
      }

      const data = await res.json();
      setResult(data.response);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Falha ao conectar com o Ollama local. Ele está ligado?');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Laboratório Ollama (Fase 1)</h1>
        <p className={styles.subtitle}>Processamento de imagem no seu próprio servidor local, sem limites e 100% privado.</p>
      </header>

      <div className={styles.labBox}>
        <div className={styles.inputGroup}>
          <label className={styles.label}>URL do Servidor Ollama (Padrão local)</label>
          <input 
            type="text" 
            className={styles.input} 
            value={serverUrl} 
            onChange={e => setServerUrl(e.target.value)} 
          />
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>Nome do Modelo Instalado (ex: moondream, llava, etc)</label>
          <input 
            type="text" 
            className={styles.input} 
            value={modelName} 
            onChange={e => setModelName(e.target.value)} 
          />
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>Comando (Prompt) para a IA</label>
          <input 
            type="text" 
            className={styles.input} 
            value={prompt} 
            onChange={e => setPrompt(e.target.value)} 
          />
        </div>

        {!image ? (
          <label className={styles.uploadArea}>
            <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
            <div style={{ color: '#64748b' }}>Clique aqui para selecionar uma foto da catraca</div>
          </label>
        ) : (
          <div>
            <img src={image} alt="Preview" className={styles.imagePreview} />
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                className={styles.button} 
                onClick={processImage} 
                disabled={isProcessing}
              >
                {isProcessing ? 'Sua máquina está pensando...' : 'Processar no Meu PC (Ollama)'}
              </button>
              <button 
                className={styles.button} 
                style={{ backgroundColor: '#ef4444' }}
                onClick={() => { setImage(null); setBase64Raw(null); }}
                disabled={isProcessing}
              >
                Remover Foto
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className={styles.errorBox}>
            {error}
          </div>
        )}

        {result && (
          <div className={styles.resultBox}>
            <div className={styles.resultTitle}>Ollama respondeu:</div>
            <div className={styles.resultText}>{result}</div>
          </div>
        )}
      </div>
    </div>
  );
}
