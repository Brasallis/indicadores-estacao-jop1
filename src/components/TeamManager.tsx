'use client';

import React, { useState, useEffect } from 'react';
import { Users, Trash2, Edit2, Plus, CheckCircle2 } from 'lucide-react';

export default function TeamManager({ role, stationId, stations }: any) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  
  const [form, setForm] = useState({ username: '', password: '', role: 'OPERATOR', stationId: stationId || '' });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Erro ao buscar equipe');
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    
    try {
      const url = isEditing ? `/api/users/${editId}` : '/api/users';
      const method = isEditing ? 'PUT' : 'POST';
      
      const payload: any = { ...form };
      if (isEditing && !payload.password) delete payload.password; // Não envia senha vazia ao editar
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess(isEditing ? 'Usuário atualizado!' : 'Usuário criado!');
      setIsEditing(false);
      setEditId(null);
      setForm({ username: '', password: '', role: 'OPERATOR', stationId: stationId || '' });
      fetchUsers();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário definitivamente?')) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao excluir');
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const startEdit = (u: any) => {
    setIsEditing(true);
    setEditId(u.id);
    setForm({ username: u.username, password: '', role: u.role, stationId: u.stationId || '' });
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditId(null);
    setForm({ username: '', password: '', role: 'OPERATOR', stationId: stationId || '' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
      {error && <div style={{ padding: '0.8rem', background: '#fef2f2', color: '#991b1b', borderRadius: '8px', fontSize: '0.9rem' }}>{error}</div>}
      {success && <div style={{ padding: '0.8rem', background: '#f0fdf4', color: '#166534', borderRadius: '8px', fontSize: '0.9rem', display: 'flex', gap: '8px', alignItems: 'center' }}><CheckCircle2 size={16} />{success}</div>}

      {/* Formulário de Criação / Edição */}
      <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#334155' }}>
          {isEditing ? <Edit2 size={18} /> : <Plus size={18} />} 
          {isEditing ? 'Editar Usuário' : 'Novo Usuário'}
        </h3>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <input 
            type="text" 
            placeholder="Nome de usuário (sem espaços)" 
            value={form.username} 
            onChange={e => setForm({...form, username: e.target.value})}
            required 
            disabled={isEditing}
            style={{ padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px', width: '100%' }}
          />
          <input 
            type="password" 
            placeholder={isEditing ? "Nova Senha (opcional)" : "Senha inicial"} 
            value={form.password} 
            onChange={e => setForm({...form, password: e.target.value})}
            required={!isEditing}
            style={{ padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px', width: '100%' }}
          />
          
          {role === 'COORDINATOR' && (
            <>
              <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} style={{ padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px', width: '100%', background: 'white' }}>
                <option value="OPERATOR">Operador</option>
                <option value="STATION_ADMIN">Líder de Estação</option>
              </select>
              <select value={form.stationId} onChange={e => setForm({...form, stationId: e.target.value})} required style={{ padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px', width: '100%', background: 'white' }}>
                <option value="">Selecione a Estação</option>
                {stations?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button type="submit" style={{ flex: 1, padding: '0.6rem', background: '#f9ab00', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
              {isEditing ? 'Salvar' : 'Adicionar'}
            </button>
            {isEditing && (
              <button type="button" onClick={cancelEdit} style={{ padding: '0.6rem', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button>
            )}
          </div>
        </form>
      </div>

      {/* Lista de Usuários */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <h3 style={{ margin: '1rem 0 0.5rem 0', fontSize: '1rem', color: '#334155' }}>Equipe Atual</h3>
        {loading ? <p style={{ color: '#94a3b8' }}>Carregando...</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {users.length === 0 && <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Nenhum usuário encontrado.</p>}
            {users.map(u => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.8rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>{u.username}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{u.role === 'OPERATOR' ? 'Operador' : 'Líder'} • {u.station?.code}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => startEdit(u)} style={{ background: '#f1f5f9', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', color: '#1d4ed8' }}><Edit2 size={16} /></button>
                  <button onClick={() => handleDelete(u.id)} style={{ background: '#fef2f2', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', color: '#dc2626' }}><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
