import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import {
  BookOpen, Search, Plus, Edit2, Trash2, Loader2, AlertCircle,
  Bot, RefreshCw, Tag, KeyRound, ListOrdered, CheckCircle2,
} from 'lucide-react';

const inputCls = 'input-glow w-full rounded-xl py-2.5 px-3.5 text-sm border text-white placeholder-slate-600 transition-all';
const inputStyle = { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' };
const optStyle = { background: '#0d1428' };

// ── Modal: crear / editar artículo ───────────────────────────────────────────
const ArticleModal = ({ articulo, categorias, onClose, onSaved }) => {
  const isEdit = !!articulo;
  const [form, setForm] = useState({
    problema_tipo: articulo?.problema_tipo || '',
    solucion: articulo?.solucion || '',
    palabras_clave: articulo?.palabras_clave || '',
    categoria_id: articulo?.categoria_id ?? '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.problema_tipo.trim() || !form.solucion.trim() || !form.palabras_clave.trim()) {
      setError('El problema, la solución y las palabras clave son obligatorios.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        categoria_id: form.categoria_id === '' ? null : Number(form.categoria_id),
      };
      if (isEdit) {
        await api.put(`/base-conocimiento/${articulo.id}`, payload);
      } else {
        await api.post('/base-conocimiento', payload);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo guardar el artículo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} maxW="max-w-lg">
      <div className="p-5 md:p-6 space-y-4">
        <div className="flex items-center gap-3 mb-1 pr-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--accent-ai-light)' }}>
            <BookOpen className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white">{isEdit ? 'Editar Artículo' : 'Nuevo Artículo de IA'}</h3>
            <p className="text-[10px] text-slate-500">
              La IA usará este caso para resolver tickets automáticamente
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="block text-slate-500 font-bold uppercase text-[9px]">Tipo de Problema</label>
            <input
              value={form.problema_tipo}
              onChange={(e) => setForm({ ...form, problema_tipo: e.target.value })}
              placeholder="Ej: Impresora no imprime"
              className={inputCls} style={inputStyle} required
            />
          </div>

          <div className="space-y-1">
            <label className="block text-slate-500 font-bold uppercase text-[9px]">Categoría</label>
            <select
              value={form.categoria_id}
              onChange={(e) => setForm({ ...form, categoria_id: e.target.value === '' ? '' : Number(e.target.value) })}
              className={inputCls} style={inputStyle}
            >
              <option value="" style={optStyle}>Sin categoría</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id} style={optStyle}>{c.nombre}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-slate-500 font-bold uppercase text-[9px]">
              Solución (pasos que seguirá el usuario)
            </label>
            <textarea
              value={form.solucion}
              onChange={(e) => setForm({ ...form, solucion: e.target.value })}
              placeholder="Describe los pasos: 1) … 2) … 3) …"
              rows={5}
              className={`${inputCls} resize-y leading-relaxed`}
              style={inputStyle} required
            />
          </div>

          <div className="space-y-1">
            <label className="block text-slate-500 font-bold uppercase text-[9px]">
              Palabras clave (separadas por comas)
            </label>
            <input
              value={form.palabras_clave}
              onChange={(e) => setForm({ ...form, palabras_clave: e.target.value })}
              placeholder="impresora,atascado,toner,papel"
              className={inputCls} style={inputStyle} required
            />
            <p className="text-[10px] text-slate-600 flex items-center gap-1 mt-1">
              <KeyRound className="w-3 h-3" />
              La IA compara estas palabras con el problema descrito por el usuario.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 border border-white/8 text-slate-400 rounded-xl font-semibold hover:bg-white/5 hover:text-white transition-all">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="btn-glow px-4 py-2.5 rounded-xl font-semibold flex items-center gap-1.5 disabled:opacity-50">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              {isEdit ? 'Guardar Cambios' : 'Crear Artículo'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// PÁGINA: ARTÍCULOS DE LA IA (BASE DE CONOCIMIENTO)
// ══════════════════════════════════════════════════════════════════════════════
const KnowledgeBase = () => {
  const { isAdmin } = useAuth();
  const [articulos, setArticulos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [catFiltro, setCatFiltro] = useState('');
  const [modal, setModal] = useState(null); // null | {} | articulo
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [artRes, catRes] = await Promise.all([
        api.get('/base-conocimiento'),
        api.get('/categorias'),
      ]);
      setArticulos(artRes.data);
      setCategorias(catRes.data);
      setError('');
    } catch (err) {
      console.error('Error al cargar la base de conocimiento', err);
      setError('No se pudo cargar la base de conocimiento.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (articulo) => {
    if (!window.confirm(`¿Eliminar el artículo "${articulo.problema_tipo}"? La IA dejará de resolver ese caso.`)) return;
    try {
      await api.delete(`/base-conocimiento/${articulo.id}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al eliminar el artículo.');
    }
  };

  const filtrados = articulos.filter((a) => {
    const q = busqueda.toLowerCase();
    const matchQ = !q ||
      a.problema_tipo?.toLowerCase().includes(q) ||
      a.solucion?.toLowerCase().includes(q) ||
      a.palabras_clave?.toLowerCase().includes(q);
    const matchCat = !catFiltro || String(a.categoria_id) === catFiltro;
    return matchQ && matchCat;
  });

  const catNombre = (a) => a.categoria_nombre || 'Sin categoría';
  const catsUsadas = new Set(articulos.map((a) => a.categoria_id).filter(Boolean));
  const totalKeywords = articulos.reduce((s, a) => s + (a.palabras_clave?.split(',').filter(Boolean).length || 0), 0);

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-white">Artículos de la IA</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Base de conocimiento: casos que la IA resuelve automáticamente con pasos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} title="Refrescar"
            className="p-2.5 rounded-xl border border-white/8 bg-white/3 text-slate-400 hover:text-white hover:bg-white/5 transition-all">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {isAdmin && (
            <button onClick={() => setModal({})}
              className="btn-glow text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nuevo Artículo</span>
            </button>
          )}
        </div>
      </div>

      {/* Panel explicativo */}
      <div className="rounded-2xl border border-indigo-500/20 p-4 flex items-start gap-3"
        style={{ background: 'var(--panel-ai-bg)' }}>
        <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/25 flex items-center justify-center shrink-0">
          <Bot className="w-5 h-5 text-indigo-400" />
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Cuando un empleado reporta un problema, la IA busca en estos artículos comparando las palabras clave.
          Si encuentra un caso que coincide, responde al instante con los <strong className="text-slate-200">pasos de la solución</strong> y
          marca el ticket como <strong className="text-slate-200">"Solución IA"</strong>. Mantener esta base actualizada = más tickets resueltos sin intervención humana.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Artículos', value: articulos.length, icon: BookOpen, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/15' },
          { label: 'Categorías Cubiertas', value: catsUsadas.size, icon: Tag, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/15' },
          { label: 'Palabras Clave', value: totalKeywords, icon: KeyRound, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/15' },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="rounded-2xl p-5 border border-white/5 flex items-center justify-between"
              style={{ background: 'var(--bg-card)' }}>
              <div>
                <p className="text-3xl font-black text-white">{card.value}</p>
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-1">{card.label}</p>
              </div>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${card.bg}`}>
                <Icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Buscador + filtro categoría */}
      <div className="rounded-2xl border border-white/5 p-4" style={{ background: 'var(--bg-card)' }}>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por problema, solución o palabra clave…"
              className={`${inputCls} pl-10`}
              style={inputStyle}
            />
          </div>
          <select
            value={catFiltro}
            onChange={(e) => setCatFiltro(e.target.value)}
            className={`${inputCls} sm:w-56`}
            style={{ ...inputStyle, color: catFiltro ? '#e2e8f0' : '#64748b' }}
          >
            <option value="" style={optStyle}>Todas las categorías</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id} style={optStyle}>{c.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista de artículos */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
        </div>
      ) : filtrados.length > 0 ? (
        <div className="space-y-3">
          {filtrados.map((a) => (
            <div key={a.id} className="rounded-2xl border border-white/5 p-5"
              style={{ background: 'var(--bg-card)' }}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'var(--accent-ai-light)' }}>
                    <ListOrdered className="w-4.5 h-4.5 text-indigo-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-200 leading-snug">{a.problema_tipo}</h3>
                    <span className="inline-block mt-1.5 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide badge-ai">
                      {catNombre(a)}
                    </span>
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => setModal(a)}
                      className="p-2 hover:bg-blue-500/10 text-slate-500 hover:text-blue-400 rounded-lg transition-all"
                      title="Editar">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(a)}
                      className="p-2 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-lg transition-all"
                      title="Eliminar">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-white/3 p-3.5" style={{ background: 'var(--bg-primary)' }}>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <ListOrdered className="w-3 h-3" /> Pasos de la solución
                </p>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{a.solucion}</p>
              </div>

              <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                {a.palabras_clave?.split(',').map((kw, i) => (
                  kw.trim() && (
                    <span key={i} className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/8">
                      {kw.trim()}
                    </span>
                  )
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/5 p-12 text-center" style={{ background: 'var(--bg-card)' }}>
          <BookOpen className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-sm text-slate-500 font-semibold">
            {articulos.length === 0
              ? 'La base de conocimiento está vacía'
              : 'No se encontraron artículos con esos filtros'}
          </p>
          <p className="text-xs text-slate-600 mt-1">
            {isAdmin
              ? 'Crea el primer artículo con el botón "Nuevo Artículo".'
              : 'Prueba con otra búsqueda o categoría.'}
          </p>
        </div>
      )}

      {modal && (
        <ArticleModal
          articulo={modal.id ? modal : null}
          categorias={categorias}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); fetchData(); }}
        />
      )}
    </div>
  );
};

export default KnowledgeBase;
