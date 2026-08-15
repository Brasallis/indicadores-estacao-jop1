'use client';

import React from 'react';
import { UserCircle, Train } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

export default function Header({ role, station }: { role?: string, station?: string }) {
  const router = useRouter();
  const pathname = usePathname();

  // Se estiver na tela de login, não renderiza o header
  if (pathname === '/login') return null;

  const getRoleBadge = () => {
    if (role === 'COORDINATOR') return <span style={{ background: '#1d4ed8', color: 'white', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>Coordenador</span>;
    if (role === 'STATION_ADMIN') return <span style={{ background: '#f9ab00', color: 'white', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>Líder {station?.toUpperCase()}</span>;
    if (role === 'OPERATOR') return <span style={{ background: '#64748b', color: 'white', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>Operador {station?.toUpperCase()}</span>;
    return null;
  };

  return (
    <header style={{ 
      width: '100%', 
      height: '64px', 
      background: 'white', 
      borderBottom: '1px solid #e2e8f0', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      padding: '0 2rem',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
    }}>
      <div 
        style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
        onClick={() => router.push(role === 'COORDINATOR' ? '/' : `/estacao/${station?.toLowerCase() || 'jop-01'}`)}
      >
        <Train color="#f9ab00" size={24} />
        <span style={{ fontWeight: 700, fontSize: '1.2rem', color: '#0f172a', letterSpacing: '-0.5px' }}>Linha Uni <span style={{ color: '#94a3b8', fontWeight: 400 }}>|</span> Indicadores</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {getRoleBadge()}
        <button 
          onClick={() => router.push('/perfil')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            color: '#475569',
            fontWeight: 600,
            transition: 'all 0.2s ease'
          }}
          title="Meu Perfil"
          onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
        >
          <UserCircle size={20} /> Perfil
        </button>
      </div>
    </header>
  );
}
