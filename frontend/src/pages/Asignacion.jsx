import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  UserCog, Loader2, AlertCircle, CheckCircle2, Wrench, Ticket, Plus, X,
} from 'lucide-react';

const Asignacion = () => {
  const [tecnicos, setTecnicos] = useState([]);      // [{id, nombre, rol}]
  const [categorias, setCategorias] = useState([]);  // [{categoria_id, categoria_nombre, tecnico_id, tickets_abiertos}]
  const [elecciones, setElecciones] = useState({});  // tecnico_id -> Set de categoria_id
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(null);  // tecnico_id en guardado
  const [feedback, setFeedback] = useState(null);    // {tecnico_id, ok, mensaje}

  // Gestión de categorías personalizadas
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [categoriaFeedback, setCategoriaFeedback] = useState(null); // {ok, mensaje}
  const [creandoCategoria, setCreandoCategoria] = useState(false);
  const [eliminandoCategoria, setEliminandoCategoria] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tecs, asig] = await Promise.all([
        api.get('/auth/tecnicos'),
        api.get('/categorias/asignaciones'),
      ]);
      setTecnicos(tecs.data);
      setCategorias(asig.data);

      // Mapa tecnico_id -> Set(categoria_id) según el estado actual en la BD
      const mapa = {};
      tecs.data.forEach((t) => { mapa[t.id] = new Set(); });
      asig.data.forEach((a) => {
        if (a.tecnico_id && mapa[a.tecnico_id]) mapa[a.tecnico_id].add(a.categoria_id);
      });
      setElecciones(mapa);
    } catch (err) {
      console.error(err);
      setError('Error al cargar las asignaciones.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleCategoria = (tecnicoId, categoriaId) => {
    setElecciones((prev) => {
      const copia = { ...prev, [tecnicoId]: new Set(prev[tecnicoId]) };
      const set = copia[tecnicoId];
      if (set.has(categoriaId)) set.delete(categoriaId);
      else set.add(categoriaId);
      return copia;
    });
  };

  const handleCrearCategoria = async (e) => {
    e.preventDefault();
    const nombre = nuevaCategoria.trim();
    if (!nombre) return;
    setCreandoCategoria(true);
    setCategoriaFeedback(null);
    try {
      await api.post('/categorias', { nombre });
      setNuevaCategoria('');
      setCategoriaFeedback({ ok: true, mensaje: `Categoría "${nombre}" creada. La IA ya la usará para clasificar.` });
      await fetchData();
    } catch (err) {
      setCategoriaFeedback({ ok: false, mensaje: err.response?.data?.message || 'Error al crear la categoría.' });
    } finally {
      setCreandoCategoria(false);
    }
  };

  const handleEliminarCategoria = async (categoriaId, nombre) => {
    if (!window.confirm(`¿Eliminar la categoría "${nombre}"? Solo se puede si no tiene tickets.`)) return;
    setEliminandoCategoria(categoriaId);
    setCategoriaFeedback(null);
    try {
      await api.delete(`/categorias/${categoriaId}`);
      setCategoriaFeedback({ ok: true, mensaje: `Categoría "${nombre}" eliminada.` });
      await fetchData();
    } catch (err) {
      setCategoriaFeedback({ ok: false, mensaje: err.response?.data?.message || 'Error al eliminar la categoría.' });
    } finally {
      setEliminandoCategoria(null);
    }
  };

  const handleGuardar = async (tecnicoId) => {
    setGuardando(tecnicoId);
    setFeedback(null);
    try {
      const ids = Array.from(elecciones[tecnicoId] || []);
      const res = await api.put(`/categorias/tecnicos/${tecnicoId}`, { categoria_ids: ids });
      setFeedback({ tecnico_id: tecnicoId, ok: true, mensaje: res.data.message });
      await fetchData();
    } catch (err) {
      setFeedback({
        tecnico_id: tecnicoId,
        ok: false,
        mensaje: err.response?.data?.message || 'Error al guardar las asignaciones.',
      });
    } finally {
      setGuardando(null);
    }
  };

  const categoriasDeOtro = (tecnicoId, categoriaId) => {
    // ¿Esta categoría está asignada actualmente a OTRO técnico?
    const a = categorias.find((c) => c.categoria_id === categoriaId);
    return a && a.tecnico_id && a.tecnico_id !== tecnicoId;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-fade-in">

      {/* Header */}
      <div className="rounded-2xl border border-white/5 p-5" style={{ background: 'var(--bg-card)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/15 flex items-center justify-center text-blue-400 shrink-0">
            <UserCog className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm uppercase tracking-wider">Asignación de Técnicos</h3>
            <p className="text-xs text-slate-500">
              Marca los temas que atiende cada técnico (puede tener varios). Los tickets nuevos que
              la IA clasifique en esos temas se le asignarán automáticamente, y solo verá esos tickets.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl flex items-start gap-2 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Gestión de categorías */}
      <div className="rounded-2xl border border-white/5 p-4 md:p-5" style={{ background: 'var(--bg-card)' }}>
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Temas / Categorías</p>
          <form onSubmit={handleCrearCategoria} className="flex items-center gap-2">
            <input
              type="text"
              value={nuevaCategoria}
              onChange={(e) => setNuevaCategoria(e.target.value)}
              placeholder="Nueva categoría (ej: Cámaras)"
              maxLength={100}
              className="input-glow rounded-xl py-2 px-3 text-xs border text-white placeholder-slate-600 w-52"
              style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
            />
            <button
              type="submit"
              disabled={creandoCategoria || !nuevaCategoria.trim()}
              className="btn-glow px-3 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-40"
            >
              {creandoCategoria ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Crear
            </button>
          </form>
        </div>

        <div className="flex flex-wrap gap-2">
          {categorias.map((c) => (
            <span
              key={c.categoria_id}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/8 bg-white/3 text-xs font-semibold text-slate-200"
            >
              <Wrench className="w-3 h-3 text-slate-500" />
              {c.categoria_nombre}
              {c.tickets_abiertos > 0 && (
                <span className="text-[9px] text-amber-400 font-bold flex items-center gap-0.5">
                  <Ticket className="w-3 h-3" />{c.tickets_abiertos}
                </span>
              )}
              {c.tickets_abiertos === 0 && (
                <button
                  onClick={() => handleEliminarCategoria(c.categoria_id, c.categoria_nombre)}
                  disabled={eliminandoCategoria === c.categoria_id}
                  title="Eliminar categoría (solo si no tiene tickets)"
                  className="text-slate-600 hover:text-red-400 transition-colors disabled:opacity-40"
                >
                  {eliminandoCategoria === c.categoria_id
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <X className="w-3 h-3" />}
                </button>
              )}
            </span>
          ))}
        </div>

        {categoriaFeedback && (
          <p className={`mt-3 text-[11px] flex items-center gap-1.5 ${categoriaFeedback.ok ? 'text-emerald-400' : 'text-red-400'}`}>
            {categoriaFeedback.ok
              ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
            {categoriaFeedback.mensaje}
          </p>
        )}
      </div>

      {/* Tarjeta por técnico */}
      <div className="space-y-4">
        {tecnicos.map((t) => {
          const sel = elecciones[t.id] || new Set();
          const hayCambios = categorias.some(
            (c) => sel.has(c.categoria_id) !== (c.tecnico_id === t.id)
          );
          return (
            <div key={t.id} className="rounded-2xl border border-white/5 p-4 md:p-5"
              style={{ background: 'var(--bg-card)' }}>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-300 shrink-0">
                    <UserCog className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{t.nombre}</p>
                    <p className="text-[10px] text-slate-500">
                      {sel.size === 0
                        ? 'Sin categorías asignadas'
                        : <>Atiende: <span className="text-blue-400 font-semibold">{sel.size} tema(s)</span></>}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleGuardar(t.id)}
                  disabled={guardando === t.id}
                  className="btn-glow px-4 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                >
                  {guardando === t.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Guardar
                </button>
              </div>

              {/* Categorías en chips seleccionables */}
              <div className="flex flex-wrap gap-2">
                {categorias.map((c) => {
                  const activo = sel.has(c.categoria_id);
                  const enOtro = categoriasDeOtro(t.id, c.categoria_id);
                  return (
                    <button
                      key={c.categoria_id}
                      type="button"
                      onClick={() => toggleCategoria(t.id, c.categoria_id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all text-left ${
                        activo
                          ? 'border-blue-500/40 bg-blue-500/15 text-blue-300'
                          : enOtro
                          ? 'border-white/5 bg-white/3 text-slate-600 hover:text-slate-400 hover:bg-white/5'
                          : 'border-white/8 bg-white/3 text-slate-300 hover:bg-white/5'
                      }`}
                      title={enOtro
                        ? `Actualmente asignada a otro técnico (se la quitarás al guardar)`
                        : activo ? 'Quitar de este técnico' : 'Asignar a este técnico'}
                    >
                      <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        activo ? 'bg-blue-500 border-blue-500' : 'border-white/20'
                      }`}>
                        {activo && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </span>
                      <Wrench className="w-3 h-3 opacity-60" />
                      <span className="truncate">{c.categoria_nombre}</span>
                      {c.tickets_abiertos > 0 && (
                        <span className="flex items-center gap-1 text-[9px] text-amber-400 font-bold">
                          <Ticket className="w-3 h-3" />
                          {c.tickets_abiertos}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {feedback?.tecnico_id === t.id && (
                <p className={`mt-3 text-[11px] flex items-center gap-1.5 ${feedback.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                  {feedback.ok
                    ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                  {feedback.mensaje}
                </p>
              )}
            </div>
          );
        })}

        {tecnicos.length === 0 && (
          <div className="rounded-2xl border border-white/5 p-8 text-center text-xs text-slate-500"
            style={{ background: 'var(--bg-card)' }}>
            No hay técnicos registrados. Créalos en la sección Usuarios.
          </div>
        )}
      </div>
    </div>
  );
};

export default Asignacion;
