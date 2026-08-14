'use client';

import React from 'react';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LogoutButton({ role, station }: { role?: string, station?: string }) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const getRoleBadge = () => {
    if (role === 'COORDINATOR') return <span style={{ background: '#1d4ed8', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>Coordenador</span>;
    if (role === 'STATION_ADMIN') return <span style={{ background: '#f9ab00', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>Líder {station?.toUpperCase()}</span>;
    if (role === 'OPERATOR') return <span style={{ background: '#64748b', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>Operador {station?.toUpperCase()}</span>;
    return null;
  };

  return (
    <div style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 9999, display: 'flex', alignItems: 'center', gap: '12px' }}>
      {getRoleBadge()}
      <button 
        onClick={handleLogout}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(255,255,255,0.9)',
          border: '1px solid #e2e8f0',
          padding: '8px 12px',
          borderRadius: '8px',
          cursor: 'pointer',
          color: '#475569',
          fontWeight: 500,
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          backdropFilter: 'blur(4px)'
        }}
        title="Sair do Sistema"
      >
        <LogOut size={16} /> Sair
      </button>
    </div>
  );
}
