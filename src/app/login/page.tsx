'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, Loader2, Train } from 'lucide-react';
import styles from './page.module.css';

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao fazer login');
      }

      // Redirecionamento baseado no perfil (Role)
      if (data.role === 'OPERATOR' || data.role === 'STATION_ADMIN') {
        // Redireciona para a estação específica do usuário
        window.location.href = `/estacao/${data.stationCode?.toLowerCase() || 'jop-01'}`;
      } else {
        // Coordenador (Acesso Geral)
        window.location.href = '/';
      }

    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.overlay}></div>
      <div className={styles.loginBox}>
        <div className={styles.header}>
          <img src="/logo-linha-uni.png" alt="Linha Uni" className={styles.logo} />
          <h1 className={styles.title}>Sistema de Indicadores</h1>
          <p className={styles.subtitle}>Linha 6 Laranja</p>
        </div>

        <form onSubmit={handleLogin} className={styles.form}>
          {error && <div className={styles.errorAlert}>{error}</div>}
          
          <div className={styles.inputGroup}>
            <label className={styles.label}>Usuário</label>
            <div className={styles.inputWrapper}>
              <User className={styles.inputIcon} size={20} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={styles.input}
                placeholder="Ex: operador_jop1"
                required
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Senha</label>
            <div className={styles.inputWrapper}>
              <Lock className={styles.inputIcon} size={20} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button type="submit" className={styles.submitBtn} disabled={isLoading}>
            {isLoading ? <Loader2 size={24} className={styles.spinner} /> : 'Acessar Sistema'}
          </button>
        </form>
        
        <div className={styles.footer}>
          <Train size={16} /> Restrito a funcionários autorizados
        </div>
      </div>
    </div>
  );
}
