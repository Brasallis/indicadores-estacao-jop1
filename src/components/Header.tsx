'use client';

import React, { useState, useEffect, useRef } from 'react';
import { UserCircle, Train, LogOut, Key, MapPin, X, CheckCircle2, Users } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import TeamManager from './TeamManager';

export default function Header({ role, stationCode, username, stationId, stations }: any) {
  const router = useRouter();
  const pathname = usePathname();
  
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'password' | 'station' | 'team'>('password');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newStationId, setNewStationId] = useState(stationId);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (pathname === '/login') return null;

  const getRoleBadge = () => {
    if (role === 'COORDINATOR') return <span style={{ background: '#1d4ed8', color: 'white', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>Coordenador</span>;
    if (role === 'STATION_ADMIN') return <span style={{ background: '#f9ab00', color: 'white', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>Líder {stationCode?.toUpperCase()}</span>;
    if (role === 'OPERATOR') return <span style={{ background: '#64748b', color: 'white', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>Operador {stationCode?.toUpperCase()}</span>;
    return null;
  };

  const openDrawer = (mode: 'password' | 'station' | 'team') => {
    setDrawerMode(mode);
    setDrawerOpen(true);
    setMenuOpen(false);
    setMessage({ type: '', text: '' });
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (drawerMode === 'password' && password !== confirmPassword) {
      setMessage({ type: 'error', text: 'As senhas não coincidem!' });
      return;
    }

    setIsLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          password: drawerMode === 'password' ? password : undefined, 
          stationId: drawerMode === 'station' ? newStationId : undefined 
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage({ type: 'success', text: 'Alteração salva com sucesso!' });
      setPassword('');
      setConfirmPassword('');
      
      if (drawerMode === 'station' && newStationId !== stationId) {
         setTimeout(() => {
            router.push('/');
            router.refresh();
         }, 1000);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <header style={{ 
        width: '100%', height: '64px', background: 'white', borderBottom: '1px solid #e2e8f0', 
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem',
        position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
      }}>
        <div 
          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
          onClick={() => router.push(role === 'COORDINATOR' ? '/' : `/estacao/${stationCode?.toLowerCase() || 'jop-01'}`)}
        >
          <img src="/logo-linha-uni.png" alt="Logo Linha Uni" style={{ height: '28px', objectFit: 'contain' }} />
          <span style={{ fontWeight: 700, fontSize: '1.2rem', color: '#0f172a', letterSpacing: '-0.5px' }}>Controle de Fluxo</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }} ref={menuRef}>
          {getRoleBadge()}
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: menuOpen ? '#f1f5f9' : '#f8fafc', border: '1px solid #e2e8f0', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', color: '#475569', fontWeight: 600, transition: 'all 0.2s ease' }}
          >
            <UserCircle size={20} /> {username}
          </button>

          {menuOpen && (
            <div style={{ position: 'absolute', top: '50px', right: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', width: '220px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <button onClick={() => openDrawer('password')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', color: '#334155' }}>
                <Key size={16} /> Alterar Senha
              </button>
              <button onClick={() => openDrawer('station')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', color: '#334155' }} disabled={role === 'COORDINATOR'}>
                <MapPin size={16} /> Trocar Estação {role === 'COORDINATOR' && '(Global)'}
              </button>
              {role !== 'OPERATOR' && (
                <button onClick={() => openDrawer('team')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', color: '#334155' }}>
                  <Users size={16} /> Gerenciar Equipe
                </button>
              )}
              <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', border: 'none', background: '#fef2f2', textAlign: 'left', cursor: 'pointer', color: '#dc2626', fontWeight: 'bold' }}>
                <LogOut size={16} /> Sair do Sistema
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Backdrop */}
      {drawerOpen && (
        <div onClick={() => setDrawerOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 99, backdropFilter: 'blur(2px)' }}></div>
      )}

      {/* Drawer */}
      <div style={{ 
        position: 'fixed', top: 0, right: drawerOpen ? 0 : '-400px', width: '100%', maxWidth: '400px', height: '100vh', 
        background: 'white', zIndex: 100, boxShadow: '-5px 0 25px rgba(0,0,0,0.1)', transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {drawerMode === 'password' && <Key size={20} color="#f9ab00" />}
            {drawerMode === 'station' && <MapPin size={20} color="#f9ab00" />}
            {drawerMode === 'team' && <Users size={20} color="#f9ab00" />}
            {drawerMode === 'password' ? 'Alterar Senha' : drawerMode === 'station' ? 'Trocar de Estação' : 'Gerenciar Equipe'}
          </h2>
          <button onClick={() => setDrawerOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          {message.text && (
            <div style={{ padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', backgroundColor: message.type === 'success' ? '#f0fdf4' : '#fef2f2', color: message.type === 'success' ? '#166534' : '#991b1b', border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`, display: 'flex', alignItems: 'center', gap: '8px' }}>
              {message.type === 'success' && <CheckCircle2 size={16} />} {message.text}
            </div>
          )}

          {drawerMode === 'team' ? (
            <TeamManager role={role} stationId={stationId} stations={stations} />
          ) : (
            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {drawerMode === 'password' ? (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>Nova Senha</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ padding: '0.8rem', border: '2px solid #e2e8f0', borderRadius: '8px', outline: 'none' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>Confirmar Senha</label>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required style={{ padding: '0.8rem', border: '2px solid #e2e8f0', borderRadius: '8px', outline: 'none' }} />
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>Selecione a Estação</label>
                <select value={newStationId} onChange={e => setNewStationId(e.target.value)} required style={{ padding: '0.8rem', border: '2px solid #e2e8f0', borderRadius: '8px', outline: 'none', background: 'white' }}>
                  {stations?.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>
            )}
            
            <button type="submit" disabled={isLoading} style={{ marginTop: '1rem', background: '#f9ab00', color: 'white', border: 'none', padding: '1rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', opacity: isLoading ? 0.7 : 1 }}>
              {isLoading ? 'Salvando...' : 'Salvar'}
            </button>
          </form>
          )}
        </div>
      </div>
    </>
  );
}
