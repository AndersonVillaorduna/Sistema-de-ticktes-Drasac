import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { exportarExcel } from '../utils/excel';
import { Laptop, Plus, Edit2, Trash2, Search, Loader2, AlertCircle, FileDown, Bot, CheckCircle2 } from 'lucide-react';

const inputCls = 'input-glow w-full rounded-xl py-2.5 px-3.5 text-sm border text-white placeholder-slate-600 transition-all';
const inputStyle = { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' };
const optStyle = { background: '#0d1428' };

// ── Vida útil según fecha de entrega ─────────────────────────────────────────
// <2 años verde · 2–3 normal · >3 naranja · >4 rojo
const vidaUtil = (iso) => {
  if (!iso) return { nivel: 'sin', anios: null, etiqueta: 'Sin fecha' };
  const anios = (Date.now() - new Date(iso).getTime()) / (365.25 * 24 * 3600 * 1000);
  if (anios < 2) return { nivel: 'verde', anios, etiqueta: `${anios.toFixed(1)} años` };
  if (anios <= 3) return { nivel: 'neutro', anios, etiqueta: `${anios.toFixed(1)} años` };
  if (anios <= 4) return { nivel: 'naranja', anios, etiqueta: `${anios.toFixed(1)} años · revisar` };
  return { nivel: 'rojo', anios, etiqueta: `${anios.toFixed(1)} años · cambiar` };
};

const VIDASESTILOS = {
  verde:  { badge: 'bg-emerald-500/12 text-emerald-400 border-emerald-500/25', barra: '#34d399' },
  neutro: { badge: 'bg-white/5 text-slate-400 border-white/10',                 barra: '#64748b' },
  naranja:{ badge: 'bg-amber-500/12 text-amber-400 border-amber-500/25',        barra: '#fbbf24' },
  rojo:   { badge: 'bg-red-500/12 text-red-400 border-red-500/25',              barra: '#f87171' },
  sin:    { badge: 'bg-white/5 text-slate-500 border-white/10',                 barra: '#475569' },
};

// ── Renderizado profesional del informe de la IA ─────────────────────────────
// Convierte el texto plano en secciones ("Título:") y viñetas ("- ")
const InformeRender = ({ texto }) => {
  const bloques = [];
  let viñetas = [];
  const cerrarLista = () => {
    if (viñetas.length) {
      bloques.push({ tipo: 'lista', items: viñetas });
      viñetas = [];
    }
  };
  texto.split('\n').forEach((lineaRaw) => {
    const linea = lineaRaw.trim();
    if (!linea) return;
    const esVineta = /^[-•]\s*/.test(linea) || /^\d+[.)]\s+/.test(linea);
    if (esVineta) {
      viñetas.push(linea.replace(/^[-•]\s*/, '').replace(/^\d+[.)]\s+/, ''));
    } else if (linea.endsWith(':') && linea.length < 60) {
      cerrarLista();
      bloques.push({ tipo: 'titulo', texto: linea.replace(/:$/, '') });
    } else {
      cerrarLista();
      bloques.push({ tipo: 'parrafo', texto: linea });
    }
  });
  cerrarLista();

  return (
    <div className="space-y-1">
      {bloques.map((b, i) => {
        if (b.tipo === 'titulo') {
          return (
            <p key={i} className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mt-5 mb-2 flex items-center gap-2 first:mt-0">
              <span className="w-4 h-0.5 bg-blue-400/60 rounded-full" />
              {b.texto}
            </p>
          );
        }
        if (b.tipo === 'lista') {
          return (
            <ul key={i} className="space-y-2 mb-2">
              {b.items.map((item, j) => (
                <li key={j} className="flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400/70 mt-1.5 shrink-0" />
                  <span className="min-w-0">{item}</span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="text-xs text-slate-300 leading-relaxed mb-2">{b.texto}</p>
        );
      })}
    </div>
  );
};

const Inventory = () => {
  const { isAdmin, isTecnico } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filtros
  const [search, setSearch] = useState('');
  const [tipo, setTipo] = useState('');
  const [estado, setEstado] = useState('');

  // Modales / Formulario
  const [modalOpen, setModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const [nombreEquipo, setNombreEquipo] = useState('');
  const [tipoEquipo, setTipoEquipo] = useState('Laptop');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [numeroSerie, setNumeroSerie] = useState('');
  const [ubicacionTienda, setUbicacionTienda] = useState('');
  const [estadoEquipo, setEstadoEquipo] = useState('activo');
  const [anydeskId, setAnydeskId] = useState('');
  const [fechaEntrega, setFechaEntrega] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Informe IA de equipos antiguos (bajo demanda)
  const [informeOpen, setInformeOpen] = useState(false);
  const [informeTexto, setInformeTexto] = useState('');
  const [informeIA, setInformeIA] = useState(true);
  const [informeLoading, setInformeLoading] = useState(false);
  const [informeError, setInformeError] = useState('');
  const [informeCopiado, setInformeCopiado] = useState(false);

  const handleInformeIA = async () => {
    setInformeOpen(true);
    setInformeLoading(true);
    setInformeError('');
    setInformeTexto('');
    try {
      const response = await api.post('/inventario/informe-ia');
      setInformeTexto(response.data.informe);
      setInformeIA(response.data.generado_por_ia);
    } catch (err) {
      console.error(err);
      setInformeError(err.response?.data?.message || 'Error al generar el informe.');
    } finally {
      setInformeLoading(false);
    }
  };

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (tipo) params.tipo = tipo;
      if (estado) params.estado = estado;
      
      const response = await api.get('/inventario', { params });
      setItems(response.data);
    } catch (err) {
      console.error(err);
      setError('Error al conectar con la base de datos de inventario.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [tipo, estado]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchInventory();
  };

  const openAddModal = () => {
    setIsEdit(false);
    setNombreEquipo('');
    setTipoEquipo('Laptop');
    setMarca('');
    setModelo('');
    setNumeroSerie('');
    setUbicacionTienda('');
    setEstadoEquipo('activo');
    setAnydeskId('');
    setFechaEntrega('');
    setError('');
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setIsEdit(true);
    setSelectedId(item.id);
    setNombreEquipo(item.nombre_equipo);
    setTipoEquipo(item.tipo);
    setMarca(item.marca || '');
    setModelo(item.modelo || '');
    setNumeroSerie(item.numero_serie);
    setUbicacionTienda(item.ubicacion_tienda);
    setEstadoEquipo(item.estado);
    setAnydeskId(item.anydesk_id || '');
    setFechaEntrega(item.fecha_entrega || '');
    setError('');
    setModalOpen(true);
  };

  const handleTipoChange = (nuevoTipo) => {
    setTipoEquipo(nuevoTipo);
    // AnyDesk solo aplica a laptops
    if (nuevoTipo !== 'Laptop') setAnydeskId('');
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!nombreEquipo || !numeroSerie || !ubicacionTienda) {
      setError('Nombre del equipo, número de serie y ubicación son requeridos.');
      return;
    }

    setSubmitting(true);
    const payload = {
      nombre_equipo: nombreEquipo,
      tipo: tipoEquipo,
      marca,
      modelo,
      numero_serie: numeroSerie,
      ubicacion_tienda: ubicacionTienda,
      estado: estadoEquipo,
      anydesk_id: tipoEquipo === 'Laptop' ? anydeskId : '',
      fecha_entrega: fechaEntrega || null,
    };

    try {
      if (isEdit) {
        await api.put(`/inventario/${selectedId}`, payload);
      } else {
        await api.post('/inventario', payload);
      }
      setModalOpen(false);
      fetchInventory();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Error al guardar los datos del equipo.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('¿Está seguro de que desea eliminar este equipo del inventario?')) return;
    try {
      await api.delete(`/inventario/${id}`);
      fetchInventory();
    } catch (err) {
      console.error(err);
      alert('Error al eliminar equipo del inventario.');
    }
  };

  const handleExportExcel = () => {
    const filas = items.map((item) => {
      const vu = vidaUtil(item.fecha_entrega);
      const nivelTexto = {
        verde: 'OK (menos de 2 años)',
        neutro: 'Normal (2-3 años)',
        naranja: 'Revisar (más de 3 años)',
        rojo: 'Cambiar (más de 4 años)',
        sin: 'Sin fecha de entrega',
      }[vu.nivel];
      return [
        item.nombre_equipo,
        item.marca || '',
        item.modelo || '',
        item.tipo,
        item.fecha_entrega || '',
        vu.anios !== null ? Number(vu.anios.toFixed(1)) : '',
        nivelTexto,
        item.ubicacion_tienda,
        item.tipo === 'Laptop' ? (item.anydesk_id || '') : '',
        item.estado,
      ];
    });

    const hoy = new Date().toISOString().slice(0, 10);
    exportarExcel(
      ['Equipo', 'Marca', 'Modelo', 'Tipo', 'Fecha de Entrega', 'Años de Uso', 'Vida Útil', 'Tienda / Ubicación', 'AnyDesk ID', 'Estado'],
      filas,
      `inventario_${hoy}.xlsx`
    );
  };

  return (
    <div className="rounded-2xl border border-white/5 p-4 md:p-6 space-y-6 animate-fade-in"
      style={{ background: 'var(--bg-card)' }}>
      
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/15 shrink-0">
            <Laptop className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm uppercase tracking-wider">Inventario de Equipos</h3>
            <p className="text-xs text-slate-500">Administre el hardware de TI y la vida útil de cada equipo.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            disabled={loading || items.length === 0}
            title="Descarga los equipos con los filtros actuales"
            className="border border-white/8 bg-white/3 text-slate-300 hover:text-white hover:bg-white/5 text-xs font-semibold py-2.5 px-4 rounded-xl transition-all duration-200 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileDown className="w-4 h-4" />
            <span className="hidden sm:inline">Descargar Excel</span>
          </button>
          {isTecnico && (
            <button
              onClick={handleInformeIA}
              disabled={loading || items.length === 0}
              title="La IA analiza los equipos más antiguos del inventario"
              className="border border-blue-500/25 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-xs font-semibold py-2.5 px-4 rounded-xl transition-all duration-200 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Bot className="w-4 h-4" />
              <span className="hidden sm:inline">Informe IA</span>
            </button>
          )}
          {isTecnico && (
            <button
              onClick={openAddModal}
              className="btn-glow text-white text-xs font-semibold py-2.5 px-4 rounded-xl transition-all duration-200 flex items-center gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" />
              Registrar Equipo
            </button>
          )}
        </div>
      </div>

      {/* Buscador y Filtros */}
      <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-end">
        <div className="space-y-1.5 col-span-1 md:col-span-2">
          <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Buscar Equipo</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-600 pointer-events-none">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, serie o ubicación..."
              className={`${inputCls} py-2 pl-10 pr-4`}
              style={inputStyle}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Tipo</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className={`${inputCls} py-2 px-3`}
            style={{ ...inputStyle, color: tipo ? '#e2e8f0' : '#64748b' }}
          >
            <option value="" style={optStyle}>Todos los tipos</option>
            <option value="Laptop" style={optStyle}>Laptop</option>
            <option value="PC" style={optStyle}>PC</option>
            <option value="Impresora" style={optStyle}>Impresora</option>
            <option value="Modem" style={optStyle}>Modem</option>
            <option value="Otro" style={optStyle}>Otro</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Estado</label>
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className={`${inputCls} py-2 px-3`}
            style={{ ...inputStyle, color: estado ? '#e2e8f0' : '#64748b' }}
          >
            <option value="" style={optStyle}>Todos los estados</option>
            <option value="activo" style={optStyle}>Activo</option>
            <option value="mantenimiento" style={optStyle}>Mantenimiento</option>
            <option value="de_baja" style={optStyle}>De Baja</option>
          </select>
        </div>
      </form>

      {/* Leyenda de vida útil */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-slate-500">
        <span className="font-bold uppercase tracking-wider">Vida útil:</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" />Menos de 2 años</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-500" />2 a 3 años</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" />Más de 3 años (revisar)</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400" />Más de 4 años (cambiar)</span>
      </div>

      {/* Tabla (scroll horizontal en pantallas angostas) */}
      <div className="overflow-x-auto border border-white/5 rounded-xl">
        <table className="w-full text-left border-collapse min-w-[680px]">
          <thead>
            <tr className="bg-white/3 border-b border-white/5 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
              <th className="py-3 px-4">Equipo</th>
              <th className="py-3 px-4">Tipo</th>
              <th className="py-3 px-4">Fecha de Entrega</th>
              <th className="py-3 px-4">Tienda / Ubicación</th>
              <th className="py-3 px-4 text-center">Estado</th>
              {isTecnico && <th className="py-3 px-4 text-right">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-xs">
            {loading ? (
              <tr>
                <td colSpan={isTecnico ? 6 : 5} className="py-12 text-center text-slate-500">
                  <div className="flex justify-center items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                    Cargando inventario...
                  </div>
                </td>
              </tr>
            ) : items.length > 0 ? (
              items.map((item) => {
                const vu = vidaUtil(item.fecha_entrega);
                const estilos = VIDASESTILOS[vu.nivel];
                return (
                  <tr key={item.id} className="hover:bg-blue-500/5 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-200" style={{ borderLeft: `3px solid ${estilos.barra}` }}>
                      <div>
                        {item.nombre_equipo}
                        <p className="text-[10px] text-slate-500 font-normal">{item.marca} {item.modelo}</p>
                        {item.tipo === 'Laptop' && item.anydesk_id && (
                          <p className="text-[10px] text-slate-500 font-normal font-mono mt-0.5">
                            AnyDesk: <span className="text-slate-400">{item.anydesk_id}</span>
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">{item.tipo}</td>
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="text-slate-300">
                          {item.fecha_entrega
                            ? new Date(item.fecha_entrega + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
                            : '—'}
                        </span>
                        <p className="mt-1">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase inline-block border ${estilos.badge}`}>
                            {vu.etiqueta}
                          </span>
                        </p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">{item.ubicacion_tienda}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase inline-block ${
                        item.estado === 'activo'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : item.estado === 'mantenimiento'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {item.estado}
                      </span>
                    </td>
                    {isTecnico && (
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-1.5 hover:bg-blue-500/10 text-slate-500 hover:text-blue-400 rounded-lg transition-all"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1.5 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-lg transition-all"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={isTecnico ? 6 : 5} className="py-12 text-center text-slate-500">
                  No se encontraron equipos en el inventario.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Informe IA */}
      {informeOpen && (
        <Modal onClose={() => setInformeOpen(false)} maxW="max-w-2xl">
          <div className="p-5 md:p-6 space-y-4">
            {/* Cabecera del informe */}
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm uppercase tracking-wider">
                    Informe de Equipos Antiguos
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Inventario TI · {new Date().toLocaleString('es-PE', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <span className={`text-[9px] font-bold px-2 py-1 rounded-full uppercase tracking-wider border shrink-0 ${
                informeIA
                  ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}>
                {informeIA ? '✦ Generado por IA' : 'Sin IA'}
              </span>
            </div>

            {informeLoading && (
              <div className="py-12 flex flex-col items-center gap-3 text-slate-400 text-xs">
                <div className="relative">
                  <Loader2 className="w-7 h-7 animate-spin text-blue-400" />
                </div>
                <p className="font-semibold text-slate-300">Analizando el inventario…</p>
                <p className="text-[11px] text-slate-600">La IA está revisando la antigüedad de cada equipo, esto tarda unos segundos.</p>
              </div>
            )}

            {!informeLoading && informeError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl flex items-start gap-2 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{informeError}</span>
              </div>
            )}

            {!informeLoading && !informeError && informeTexto && (
              <div
                className="rounded-xl border border-white/8 p-5 max-h-[55vh] overflow-y-auto"
                style={{ background: 'rgba(255,255,255,0.02)' }}
              >
                <InformeRender texto={informeTexto} />
              </div>
            )}

            {/* Acciones */}
            <div className="flex justify-end gap-2 pt-1">
              {informeTexto && !informeLoading && !informeError && (
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(informeTexto);
                    setInformeCopiado(true);
                    setTimeout(() => setInformeCopiado(false), 2000);
                  }}
                  className="px-4 py-2.5 border border-white/8 text-slate-300 rounded-xl font-semibold hover:bg-white/5 hover:text-white transition-all text-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className={`w-3.5 h-3.5 ${informeCopiado ? 'text-emerald-400' : ''}`} />
                  {informeCopiado ? 'Copiado' : 'Copiar informe'}
                </button>
              )}
              <button
                onClick={() => setInformeOpen(false)}
                className="px-4 py-2.5 border border-white/8 text-slate-400 rounded-xl font-semibold hover:bg-white/5 hover:text-white transition-all text-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Agregar / Editar */}
      {modalOpen && (
        <Modal onClose={() => setModalOpen(false)} maxW="max-w-lg">
          <div className="p-5 md:p-6 space-y-4">
            <h4 className="font-bold text-white text-sm uppercase tracking-wider pr-8">
              {isEdit ? 'Editar Equipo del Inventario' : 'Registrar Nuevo Equipo'}
            </h4>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl flex items-start gap-2 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-slate-500 font-bold uppercase text-[9px]">Nombre del Equipo</label>
                  <input
                    type="text"
                    value={nombreEquipo}
                    onChange={(e) => setNombreEquipo(e.target.value)}
                    placeholder="Ej: Impresora Caja Sur"
                    className={inputCls}
                    style={inputStyle}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-slate-500 font-bold uppercase text-[9px]">Tipo</label>
                  <select
                    value={tipoEquipo}
                    onChange={(e) => handleTipoChange(e.target.value)}
                    className={inputCls}
                    style={inputStyle}
                  >
                    <option value="Laptop" style={optStyle}>Laptop</option>
                    <option value="PC" style={optStyle}>PC</option>
                    <option value="Impresora" style={optStyle}>Impresora</option>
                    <option value="Modem" style={optStyle}>Modem</option>
                    <option value="Otro" style={optStyle}>Otro</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-slate-500 font-bold uppercase text-[9px]">Marca</label>
                  <input
                    type="text"
                    value={marca}
                    onChange={(e) => setMarca(e.target.value)}
                    placeholder="Ej: Epson"
                    className={inputCls}
                    style={inputStyle}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-slate-500 font-bold uppercase text-[9px]">Modelo</label>
                  <input
                    type="text"
                    value={modelo}
                    onChange={(e) => setModelo(e.target.value)}
                    placeholder="Ej: L3210"
                    className={inputCls}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-slate-500 font-bold uppercase text-[9px]">Número de Serie</label>
                  <input
                    type="text"
                    value={numeroSerie}
                    onChange={(e) => setNumeroSerie(e.target.value)}
                    placeholder="Ej: EPS4433"
                    className={inputCls}
                    style={inputStyle}
                    required
                    disabled={isEdit}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-slate-500 font-bold uppercase text-[9px]">Tienda / Ubicación</label>
                  <input
                    type="text"
                    value={ubicacionTienda}
                    onChange={(e) => setUbicacionTienda(e.target.value)}
                    placeholder="Ej: Tienda Sur"
                    className={inputCls}
                    style={inputStyle}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-slate-500 font-bold uppercase text-[9px]">Fecha de Entrega</label>
                  <input
                    type="date"
                    value={fechaEntrega}
                    onChange={(e) => setFechaEntrega(e.target.value)}
                    className={inputCls}
                    style={inputStyle}
                  />
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    Se usa para calcular la vida útil del equipo.
                  </p>
                </div>
                {tipoEquipo === 'Laptop' && (
                  <div className="space-y-1">
                    <label className="block text-slate-500 font-bold uppercase text-[9px]">AnyDesk ID</label>
                    <input
                      type="text"
                      value={anydeskId}
                      onChange={(e) => setAnydeskId(e.target.value)}
                      placeholder="Ej: 123 456 789"
                      className={inputCls}
                      style={inputStyle}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-slate-500 font-bold uppercase text-[9px]">Estado de Operatividad</label>
                <select
                  value={estadoEquipo}
                  onChange={(e) => setEstadoEquipo(e.target.value)}
                  className={inputCls}
                  style={inputStyle}
                >
                  <option value="activo" style={optStyle}>Activo / Operativo</option>
                  <option value="mantenimiento" style={optStyle}>En Mantenimiento</option>
                  <option value="de_baja" style={optStyle}>De Baja</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 border border-white/8 text-slate-400 rounded-xl font-semibold hover:bg-white/5 hover:text-white transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-glow px-4 py-2.5 text-white rounded-xl font-semibold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    'Guardar Cambios'
                  )}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Inventory;
