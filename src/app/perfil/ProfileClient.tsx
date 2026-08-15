'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserCircle, Lock, MapPin, LogOut, CheckCircle2 } from 'lucide-react';
import styles from '../login/page.module.css'; // reaproveitando os estilos bonitos do login

export default function ProfileClient({ user, stations }: { user: any, stations: any[] }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [stationId, setStationId] = useState(user.stationId);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const getRoleLabel = (r: string) => {
    if (r === 'COORDINATOR') return 'Coordenador Geral';
    if (r === 'STATION_ADMIN') return 'Líder de Estação';
    return 'Operador de Bloqueio';
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password && password !== confirmPassword) {
      setMessage({ type: 'error', text: 'As senhas não coincidem!' });
      return;
    }

    setIsLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, stationId })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
      setPassword('');
      setConfirmPassword('');
      
      // Se trocou de estação, recarrega a página para aplicar novo cookie e redirecionar
      if (stationId !== user.stationId) {
         setTimeout(() => {
            router.push('/'); 
            router.refresh();
         }, 1500);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', background: 'white', borderRadius: '24px', padding: '3rem 2.5rem', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <UserCircle size={80} color="#f9ab00" style={{ margin: '0 auto', marginBottom: '1rem' }} />
        <h1 style={{ fontSize: '1.8rem', color: '#0f172a', margin: '0 0 0.5rem 0' }}>{user.username}</h1>
        <span style={{ background: '#f1f5f9', color: '#475569', padding: '4px 12px', borderRadius: '16px', fontSize: '0.9rem', fontWeight: 600 }}>
          {getRoleLabel(user.role)}
        </span>
      </div>

      <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {message.text && (
          <div style={{ 
            padding: '1rem', 
            borderRadius: '12px', 
            backgroundColor: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
            color: message.type === 'success' ? '#166534' : '#991b1b',
            border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
            display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            {message.type === 'success' && <CheckCircle2 size={20} />}
            {message.text}
          </div>
        )}

        <div className={styles.inputGroup}>
          <label className={styles.label}>Estação de Trabalho (Atuação)</label>
          <div className={styles.inputWrapper}>
            <MapPin className={styles.inputIcon} size={20} />
            <select 
              value={stationId} 
              onChange={e => setStationId(e.target.value)} 
              className={styles.input}
              disabled={user.role === 'COORDINATOR'} // Coordenador não precisa de estação local
            >
              <option value="">Selecione uma estação</option>
              {stations.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>
          {user.role === 'COORDINATOR' && <small style={{ color: '#64748b' }}>Coordenadores operam em escopo global.</small>}
        </div>

        <div style={{ borderTop: '1px solid #e2e8f0', margin: '1rem 0' }}></div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>Nova Senha (Deixe em branco para não alterar)</label>
          <div className={styles.inputWrapper}>
            <Lock className={styles.inputIcon} size={20} />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={styles.input} placeholder="••••••••" />
          </div>
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>Confirmar Nova Senha</label>
          <div className={styles.inputWrapper}>
            <Lock className={styles.inputIcon} size={20} />
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={styles.input} placeholder="••••••••" />
          </div>
        </div>

        <button type="submit" className={styles.submitBtn} disabled={isLoading}>
          {isLoading ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </form>

      <button 
        onClick={handleLogout}
        style={{ 
          marginTop: '2rem', width: '100%', padding: '1rem', background: '#fee2e2', color: '#dc2626', 
          border: 'none', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 600, display: 'flex', 
          alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' 
        }}
      >
        <LogOut size={20} /> Sair do Sistema
      </button>

    </div>
  );
}
