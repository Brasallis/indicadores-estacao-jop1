'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Camera, CheckCircle2, ChevronRight, SkipForward } from 'lucide-react';
import { getStationById } from '@/lib/stations';
import styles from '../../../registrar/page.module.css';

interface Step {
  turnstileId: string;
  type: 'entry' | 'exit';
  readingIndex: number;
}

export default function EditAudit() {
  const params = useParams();
  const router = useRouter();

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const stationId = params.id as string;
  const auditId = params.auditId as string;
  const station = getStationById(stationId);

  const [isLoading, setIsLoading] = useState(true);
  
  // Metadados do Turno
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [operatorName, setOperatorName] = useState('');

  // Leituras da Grade
  const [readings, setReadings] = useState<any[]>([]);

  // Wizard State (-1 = Metadados, 0 to N-1 = Fotos, N = Resumo)
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [isAlreadyClosed, setIsAlreadyClosed] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [batchStatus, setBatchStatus] = useState<string | null>(null);

  useEffect(() => {
    const fetchAudit = async () => {
      try {
        const res = await fetch(`/api/audit/${auditId}`);
        const result = await res.json();
        if (result.success) {
          const audit = result.data;
          setDate(new Date(audit.date).toISOString().split('T')[0]);
          setStartTime(audit.startTime);
          setEndTime(audit.endTime);
          setOperatorName(audit.operatorName || '');

          // Map readings
          let closedCheck = false;
          const mappedReadings = audit.readings.map((r: any) => {
            if (r.entryEnd !== null || r.exitEnd !== null) closedCheck = true;
            return {
              turnstileId: r.turnstileId,
              entryStart: r.entryStart !== null ? r.entryStart.toString() : '',
              entryStartImg: r.entryStartImg || null,
              exitStart: r.exitStart !== null ? r.exitStart.toString() : '',
              exitStartImg: r.exitStartImg || null,
              entryEnd: r.entryEnd !== null ? r.entryEnd.toString() : '',
              entryEndImg: r.entryEndImg || null,
              exitEnd: r.exitEnd !== null ? r.exitEnd.toString() : '',
              exitEndImg: r.exitEndImg || null,
              isOutOfOrder: r.isOutOfOrder
            };
          });
          mappedReadings.sort((a: any, b: any) => a.turnstileId.localeCompare(b.turnstileId));
          setReadings(mappedReadings);
          setIsAlreadyClosed(closedCheck);
        }
      } catch (e) {
        console.error('Erro ao carregar auditoria', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAudit();
  }, [auditId]);

  // Generate steps based on readings
  const steps = useMemo<Step[]>(() => {
    const s: Step[] = [];
    readings.forEach((r, i) => {
      s.push({ turnstileId: r.turnstileId, type: 'entry', readingIndex: i });
      s.push({ turnstileId: r.turnstileId, type: 'exit', readingIndex: i });
    });
    return s;
  }, [readings]);

  const currentStep = steps[currentStepIndex];

  // Helper to draw watermark
  const processImageWithWatermark = (file: File, step: Step): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        // Redimensionar para evitar travamento no celular e falha no toBlob
        const MAX_DIMENSION = 1280;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIMENSION) {
            height *= MAX_DIMENSION / width;
            width = MAX_DIMENSION;
          }
        } else {
          if (height > MAX_DIMENSION) {
            width *= MAX_DIMENSION / height;
            height = MAX_DIMENSION;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('No context');

        // Draw original image
        ctx.drawImage(img, 0, 0, width, height);

        // Gradient overlay instead of solid block for better readability (Google style)
        const overlayHeight = height * 0.20;
        const gradient = ctx.createLinearGradient(0, height - overlayHeight, 0, height);
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(0.3, 'rgba(0,0,0,0.5)');
        gradient.addColorStop(1, 'rgba(0,0,0,0.9)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, height - overlayHeight, width, overlayHeight);

        // Typography settings
        const paddingX = Math.max(16, width * 0.04);
        const paddingY = Math.max(16, height * 0.04);

        // Main line (Turnstile and time)
        const mainFontSize = Math.max(16, height * 0.035);
        ctx.font = `600 ${mainFontSize}px "Inter", "Roboto", "Segoe UI", sans-serif`;
        ctx.fillStyle = '#ffffff';
        
        const timestamp = new Date().toLocaleString('pt-BR');
        const targetDesc = `${step.turnstileId} • ${step.type === 'entry' ? 'Entrada' : 'Saída'}`;
        const mainText = `${targetDesc}  |  ${timestamp}`;
        
        ctx.fillText(mainText, paddingX, height - paddingY);

        // Sub line (Station and operator)
        const subFontSize = Math.max(12, height * 0.025);
        ctx.font = `400 ${subFontSize}px "Inter", "Roboto", "Segoe UI", sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        
        const stationName = station.name.toUpperCase();
        const subText = `ESTAÇÃO ${stationName} • AUDITOR: ${operatorName.toUpperCase()}`;
        
        // Draw sub line above main line
        ctx.fillText(subText, paddingX, height - paddingY - mainFontSize - (height * 0.015));

        canvas.toBlob((blob) => {
          if (!blob) return reject('No blob');
          const finalFile = new File([blob], file.name, { type: 'image/jpeg' });
          resolve(finalFile);
        }, 'image/jpeg', 0.85);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const handleCapture = async (event: React.ChangeEvent<HTMLInputElement>, source: 'camera' | 'gallery') => {
    const file = event.target.files?.[0];
    if (!file || !currentStep) return;

    setIsProcessing(source);
    
    try {
      // 1. Aplicar Marca D'água
      const watermarkedFile = await processImageWithWatermark(file, currentStep);

      // Converter para Base64 e enviar para a IA
      const reader = new FileReader();
      reader.readAsDataURL(watermarkedFile);
      reader.onload = async () => {
        const fullBase64String = reader.result?.toString();
        const base64Data = fullBase64String?.split(',')[1];
        
        if (!base64Data || !fullBase64String) {
          setIsProcessing(null);
          return;
        }

        const savedUrl = fullBase64String;

        const newReadings = [...readings];
        if (currentStep.type === 'entry') {
          newReadings[currentStep.readingIndex].entryEndImg = savedUrl;
        } else {
          newReadings[currentStep.readingIndex].exitEndImg = savedUrl;
        }
        setReadings(newReadings);

        if (cameraInputRef.current) cameraInputRef.current.value = '';
        if (galleryInputRef.current) galleryInputRef.current.value = '';
        setCurrentStepIndex(prev => prev + 1);
        setIsProcessing(null);
      };
    } catch (err) {
      console.error(err);
      alert('Seu dispositivo encontrou um erro ao processar a imagem. Tente uma foto mais leve ou use o botão Pular.');
      setIsProcessing(null);
    }
  };

  const skipStep = () => {
    setCurrentStepIndex(prev => prev + 1);
  };

  const handleSave = async () => {
    try {
      setIsProcessing('camera');
      const payload = {
        date,
        startTime,
        endTime,
        operatorName,
        readings 
      };

      const res = await fetch(`/api/audit/${auditId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Falha ao atualizar no banco');

      alert('Fechamento de turno concluído com sucesso!');
      router.push(`/estacao/${stationId}`);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar no banco de dados.');
      setIsProcessing(null);
    }
  };

  const startBatchOCR = async () => {
    setIsReviewing(true);
    setBatchStatus("Empacotando as fotos...");
    
    const imagesToProcess: any[] = [];
    steps.forEach((step, stepIndex) => {
       const r = readings[step.readingIndex];
       if (step.type === 'entry' && r.entryEndImg && !r.entryEnd && !r.isOutOfOrder) {
          imagesToProcess.push({ base64: r.entryEndImg.split(',')[1], index: stepIndex });
       }
       if (step.type === 'exit' && r.exitEndImg && !r.exitEnd && !r.isOutOfOrder) {
          imagesToProcess.push({ base64: r.exitEndImg.split(',')[1], index: stepIndex });
       }
    });

    if (imagesToProcess.length === 0) {
       setBatchStatus(null);
       return;
    }

    setBatchStatus(`Lendo ${imagesToProcess.length} displays com IA...`);

    try {
        const res = await fetch('/api/ocr-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ images: imagesToProcess })
        });
        
        if (res.status === 429) {
           setBatchStatus("O Google pediu para aguardar alguns segundos. Retentando...");
           await new Promise(resolve => setTimeout(resolve, 10000));
           return startBatchOCR();
        }

        const result = await res.json();
        
        if (result.success && result.data) {
           const newReadings = [...readings];
           result.data.forEach((item: any) => {
              const step = steps[item.index];
              if (!step) return;
              
              if (step.type === 'entry') {
                 newReadings[step.readingIndex].entryEnd = item.value;
              } else {
                 newReadings[step.readingIndex].exitEnd = item.value;
              }
              if (item.isOutOfOrder) {
                 newReadings[step.readingIndex].isOutOfOrder = true;
              }
           });
           setReadings(newReadings);
        }
    } catch (e) {
       console.error("Erro no Batch OCR", e);
       alert("Houve um erro na leitura em lote. Você pode preencher manualmente na tabela.");
    } finally {
       setBatchStatus(null);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f8fafc' }}>
        <Loader2 size={48} style={{ animation: 'spin 1s linear infinite', color: '#f9ab00' }} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button onClick={() => router.push(`/estacao/${stationId}`)} className={styles.backButton}>
          <ArrowLeft size={20} /> Voltar
        </button>
        <h1 className={styles.title}>Fechamento (Câmera Guiada)</h1>
      </header>

      {currentStepIndex === -1 && (
        <div className={styles.formSection} style={{ marginTop: '2rem' }}>
          <h2 style={{ marginBottom: '1rem', color: '#1f2937' }}>1. Dados do Turno</h2>
          <div className={styles.formGrid}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Data</label>
              <input type="date" className="input-premium" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Instante Inicial (Ex: 07:58)</label>
              <input type="time" className="input-premium" value={startTime} onChange={e => setStartTime(e.target.value)} required />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Instante Final (Ex: 15:05)</label>
              <input type="time" className="input-premium" value={endTime} onChange={e => setEndTime(e.target.value)} required />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Auditor/Operador</label>
              <input type="text" className="input-premium" value={operatorName} onChange={e => setOperatorName(e.target.value)} placeholder="Nome" />
            </div>
          </div>
          <button 
            className={`btn-primary ${styles.submitBtn}`} 
            onClick={() => {
              if (operatorName) {
                if (isAlreadyClosed) setCurrentStepIndex(steps.length);
                else setCurrentStepIndex(0);
              }
              else alert('Preencha o nome do operador!');
            }}
            style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: isAlreadyClosed ? '#3b82f6' : '#f9ab00' }}
          >
            {isAlreadyClosed ? 'Editar Tabela do Turno Fechado' : 'Começar Captura de FIM DE TURNO'} <ChevronRight style={{ marginLeft: 8 }} />
          </button>
        </div>
      )}

      {currentStepIndex >= 0 && currentStepIndex < steps.length && currentStep && (
        <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ marginBottom: '1rem', fontSize: '1.2rem', fontWeight: 600, color: '#4b5563' }}>
            Passo {currentStepIndex + 1} de {steps.length}
          </div>
          
          <div style={{ 
            backgroundColor: '#fff', 
            borderRadius: '16px', 
            padding: '2rem', 
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
            textAlign: 'center',
            maxWidth: '500px',
            width: '100%',
            marginBottom: '2rem',
            border: '2px solid #f9ab00'
          }}>
            <h3 style={{ fontSize: '1rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>Bloqueio Atual</h3>
            <h2 style={{ fontSize: '2.5rem', color: '#b07900', fontWeight: 'bold', margin: '0.5rem 0' }}>{currentStep.turnstileId}</h2>

            <div style={{ 
              backgroundColor: currentStep.type === 'entry' ? '#fff7ed' : '#eff6ff', 
              border: `2px solid ${currentStep.type === 'entry' ? '#fdba74' : '#93c5fd'}`, 
              borderRadius: '12px', 
              padding: '1.5rem', 
              margin: '2rem 0' 
            }}>
              <p style={{ fontSize: '1.1rem', color: '#4b5563', margin: '0 0 0.5rem 0' }}>Por favor, registre a foto da:</p>
              <p style={{ fontSize: '2.2rem', fontWeight: '900', color: currentStep.type === 'entry' ? '#ea580c' : '#2563eb', margin: 0 }}>
                {currentStep.type === 'entry' ? 'ENTRADA' : 'SAÍDA'}
              </p>
              <p style={{ fontSize: '0.9rem', color: '#6b7280', margin: '0.5rem 0 0 0' }}>(Fechamento de Turno)</p>
            </div>

            <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
              <label 
                className={`btn-primary ${isProcessing ? 'disabled' : ''}`}
                style={{ 
                  flex: 1, 
                  padding: '1.5rem 1rem', 
                  fontSize: '1.1rem', 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center', 
                  gap: '8px',
                  borderRadius: '12px',
                  backgroundColor: '#f9ab00',
                  color: '#fff',
                  border: 'none',
                  cursor: isProcessing ? 'not-allowed' : 'pointer'
                }}
              >
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={cameraInputRef}
                  onChange={(e) => handleCapture(e, 'camera')}
                  disabled={isProcessing !== null}
                  style={{ display: 'none' }}
                />
                {isProcessing === 'camera' ? (
                  <>
                    <Loader2 size={32} className={styles.loadingSpinner} style={{ color: '#fff' }} />
                    <span style={{ fontSize: '0.9rem' }}>Processando...</span>
                  </>
                ) : (
                  <>
                    <Camera size={32} />
                    <span>Tirar Foto</span>
                  </>
                )}
              </label>

              <label 
                className={`btn-secondary ${isProcessing ? 'disabled' : ''}`}
                style={{ 
                  flex: 1, 
                  padding: '1.5rem 1rem', 
                  fontSize: '1.1rem', 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center', 
                  gap: '8px',
                  borderRadius: '12px',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  cursor: isProcessing ? 'not-allowed' : 'pointer'
                }}
              >
                <input
                  type="file"
                  accept="image/*"
                  ref={galleryInputRef}
                  onChange={(e) => handleCapture(e, 'gallery')}
                  disabled={isProcessing !== null}
                  style={{ display: 'none' }}
                />
                {isProcessing === 'gallery' ? (
                  <>
                    <Loader2 size={32} className={styles.loadingSpinner} style={{ color: '#374151' }} />
                    <span style={{ fontSize: '0.9rem' }}>Processando...</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                    <span>Galeria</span>
                  </>
                )}
              </label>
            </div>

            <button 
              onClick={skipStep}
              disabled={isProcessing !== null}
              style={{ 
                marginTop: '1.5rem', 
                background: 'none', 
                border: 'none', 
                color: '#6b7280', 
                fontWeight: 600, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                width: '100%',
                cursor: isProcessing !== null ? 'not-allowed' : 'pointer',
                opacity: isProcessing !== null ? 0.5 : 1
              }}
            >
              Pular Bloqueio <SkipForward size={16} style={{ marginLeft: 4 }} />
            </button>
          </div>
        </div>
      )}

      {currentStepIndex >= steps.length && !isReviewing && !batchStatus && !isAlreadyClosed && (
        <div style={{ textAlign: 'center', marginTop: '3rem' }}>
          <CheckCircle2 size={48} color="#22c55e" style={{ margin: '0 auto' }} />
          <h2 style={{ margin: '1rem 0' }}>Todas as fotos capturadas!</h2>
          <button className="btn-primary" onClick={startBatchOCR} style={{ padding: '1rem 2rem', fontSize: '1.2rem', width: '100%', maxWidth: '400px', backgroundColor: '#f9ab00' }}>
            Extrair Números com IA
          </button>
          <button className="btn-secondary" onClick={() => setIsReviewing(true)} style={{ padding: '1rem 2rem', fontSize: '1.2rem', marginTop: '1rem', display: 'block', margin: '1rem auto', width: '100%', maxWidth: '400px' }}>
            Pular IA (Preencher Manualmente)
          </button>
        </div>
      )}

      {batchStatus && (
        <div style={{ textAlign: 'center', marginTop: '5rem' }}>
           <Loader2 size={64} className={styles.loadingSpinner} style={{ margin: '0 auto', color: '#b07900' }} />
           <h2 style={{ marginTop: '2rem' }}>{batchStatus}</h2>
           <p style={{ color: '#6b7280' }}>A inteligência artificial está lendo tudo de uma vez. Isso levará alguns segundos...</p>
        </div>
      )}

      {currentStepIndex >= steps.length && (isReviewing || isAlreadyClosed) && !batchStatus && (
        <div className={styles.formSection} style={{ marginTop: '2rem' }}>
          {!isAlreadyClosed && (
            <div className={styles.statusMessage} style={{ marginBottom: '2rem', backgroundColor: '#fff9ec', borderColor: '#f9ab00', color: '#b07900' }}>
              <CheckCircle2 size={24} />
              <span>Captura de Fim de Turno finalizada! Revise a tabela abaixo e conclua o fechamento.</span>
            </div>
          )}
          {isAlreadyClosed && (
            <div className={styles.statusMessage} style={{ marginBottom: '2rem', backgroundColor: '#eff6ff', borderColor: '#3b82f6', color: '#1d4ed8' }}>
              <CheckCircle2 size={24} />
              <span>Você está visualizando a tabela de um turno já fechado. Você pode editar todos os campos abaixo livremente.</span>
            </div>
          )}

          <table className={styles.table}>
            <thead>
              <tr>
                <th rowSpan={2}>Bloqueio</th>
                <th colSpan={2}>INÍCIO DO TURNO</th>
                <th colSpan={2}>FIM DO TURNO</th>
                <th rowSpan={2}>Status (X)</th>
              </tr>
              <tr>
                <th>Entrada (E)</th>
                <th>Saída (S)</th>
                <th>Entrada (E)</th>
                <th>Saída (S)</th>
              </tr>
            </thead>
            <tbody>
              {readings.map((r, i) => (
                <tr key={r.turnstileId}>
                  <td style={{ fontWeight: 600 }}>{r.turnstileId}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input type="text" className={styles.tableInput} value={r.entryStart} onChange={e => {
                        const nr = [...readings];
                        nr[i].entryStart = e.target.value;
                        setReadings(nr);
                      }} disabled={r.isOutOfOrder} style={{ width: '60px' }} />
                      {r.entryStartImg && <img src={r.entryStartImg} alt="Thumb" style={{ width: '28px', height: '28px', objectFit: 'cover', borderRadius: '4px' }} />}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input type="text" className={styles.tableInput} value={r.exitStart} onChange={e => {
                        const nr = [...readings];
                        nr[i].exitStart = e.target.value;
                        setReadings(nr);
                      }} disabled={r.isOutOfOrder} style={{ width: '60px' }} />
                      {r.exitStartImg && <img src={r.exitStartImg} alt="Thumb" style={{ width: '28px', height: '28px', objectFit: 'cover', borderRadius: '4px' }} />}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input type="text" className={styles.tableInput} value={r.entryEnd} onChange={e => {
                        const nr = [...readings];
                        nr[i].entryEnd = e.target.value;
                        setReadings(nr);
                      }} disabled={r.isOutOfOrder} style={{ width: '60px' }} />
                      {r.entryEndImg && <img src={r.entryEndImg} alt="Thumb" style={{ width: '28px', height: '28px', objectFit: 'cover', borderRadius: '4px', border: '2px solid #f9ab00' }} />}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input type="text" className={styles.tableInput} value={r.exitEnd} onChange={e => {
                        const nr = [...readings];
                        nr[i].exitEnd = e.target.value;
                        setReadings(nr);
                      }} disabled={r.isOutOfOrder} style={{ width: '60px' }} />
                      {r.exitEndImg && <img src={r.exitEndImg} alt="Thumb" style={{ width: '28px', height: '28px', objectFit: 'cover', borderRadius: '4px', border: '2px solid #f9ab00' }} />}
                    </div>
                  </td>
                  <td>
                    <input type="checkbox" className={styles.checkbox} checked={r.isOutOfOrder} onChange={e => {
                      const nr = [...readings];
                      nr[i].isOutOfOrder = e.target.checked;
                      setReadings(nr);
                    }} title="Fora de Operação (X)" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button 
            className={`btn-primary ${styles.submitBtn}`} 
            onClick={handleSave} 
            disabled={isProcessing !== null}
            style={{ marginTop: '2rem', backgroundColor: '#f9ab00' }}
          >
            Confirmar e Fechar Turno
          </button>
        </div>
      )}
    </div>
  );
}
