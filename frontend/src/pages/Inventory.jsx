import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Laptop, Plus, Edit2, Trash2, Search, X, Loader2, AlertCircle } from 'lucide-react';

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
  const [asignadoA, setAsignadoA] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
    setAsignadoA('');
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
    setAsignadoA(item.asignado_a || '');
    setModalOpen(true);
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
      anydesk_id: anydeskId,
      asignado_a: asignadoA
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

  return (
    <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-6 space-y-6 animate-fade-in">
      
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
            <Laptop className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Inventario de Equipos</h3>
            <p className="text-xs text-slate-400">Administre el hardware de TI asignado en las distintas tiendas y áreas.</p>
          </div>
        </div>
        
        {isTecnico && (
          <button
            onClick={openAddModal}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold py-2.5 px-4 rounded-xl shadow-md shadow-blue-500/20 transition-all duration-200 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Registrar Equipo
          </button>
        )}
      </div>

      {/* Buscador y Filtros */}
      <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div className="space-y-1.5 col-span-1 md:col-span-2">
          <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Buscar Equipo</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, serie, asignado, Anydesk..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-slate-800 placeholder-slate-400 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition-all duration-200"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tipo</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition-all duration-200"
          >
            <option value="">Todos los tipos</option>
            <option value="Laptop">Laptop</option>
            <option value="PC">PC</option>
            <option value="Impresora">Impresora</option>
            <option value="Modem">Modem</option>
            <option value="Otro">Otro</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Estado</label>
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition-all duration-200"
          >
            <option value="">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="mantenimiento">Mantenimiento</option>
            <option value="de_baja">De Baja</option>
          </select>
        </div>
      </form>

      {/* Tabla */}
      <div className="overflow-x-auto border border-slate-100 rounded-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
              <th className="py-3 px-4">Equipo</th>
              <th className="py-3 px-4">Tipo</th>
              <th className="py-3 px-4">S/N</th>
              <th className="py-3 px-4">Tienda / Ubicación</th>
              <th className="py-3 px-4">Anydesk ID</th>
              <th className="py-3 px-4">Asignado a</th>
              <th className="py-3 px-4 text-center">Estado</th>
              {isTecnico && <th className="py-3 px-4 text-right">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {loading ? (
              <tr>
                <td colSpan={isTecnico ? 8 : 7} className="py-12 text-center text-slate-400">
                  <div className="flex justify-center items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    Cargando inventario...
                  </div>
                </td>
              </tr>
            ) : items.length > 0 ? (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-800">
                    <div>
                      {item.nombre_equipo}
                      <p className="text-[10px] text-slate-400 font-normal">{item.marca} {item.modelo}</p>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">{item.tipo}</td>
                  <td className="py-3.5 px-4 text-slate-500 font-mono">{item.numero_serie}</td>
                  <td className="py-3.5 px-4 text-slate-600">{item.ubicacion_tienda}</td>
                  <td className="py-3.5 px-4 text-slate-500 font-mono">{item.anydesk_id || '-'}</td>
                  <td className="py-3.5 px-4 text-slate-500">{item.asignado_a || '-'}</td>
                  <td className="py-3.5 px-4 text-center">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase inline-block ${
                      item.estado === 'activo'
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        : item.estado === 'mantenimiento'
                        ? 'bg-amber-50 text-amber-600 border border-amber-100'
                        : 'bg-red-50 text-red-600 border border-red-100'
                    }`}>
                      {item.estado}
                    </span>
                  </td>
                  {isTecnico && (
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded transition-all"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded transition-all"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={isTecnico ? 8 : 7} className="py-12 text-center text-slate-400">
                  No se encontraron equipos en el inventario.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Agregar / Editar */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg border border-slate-200 shadow-2xl p-6 space-y-4 animate-scale-up relative">
            <button 
              onClick={() => setModalOpen(false)}
              className="absolute right-4 top-4 p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider">
              {isEdit ? 'Editar Equipo del Inventario' : 'Registrar Nuevo Equipo'}
            </h4>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl flex items-start gap-2 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-slate-500 font-bold uppercase text-[9px]">Nombre del Equipo</label>
                  <input
                    type="text"
                    value={nombreEquipo}
                    onChange={(e) => setNombreEquipo(e.target.value)}
                    placeholder="Ej: Impresora Caja Sur"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-slate-500 font-bold uppercase text-[9px]">Tipo</label>
                  <select
                    value={tipoEquipo}
                    onChange={(e) => setTipoEquipo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  >
                    <option value="Laptop">Laptop</option>
                    <option value="PC">PC</option>
                    <option value="Impresora">Impresora</option>
                    <option value="Modem">Modem</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-slate-500 font-bold uppercase text-[9px]">Marca</label>
                  <input
                    type="text"
                    value={marca}
                    onChange={(e) => setMarca(e.target.value)}
                    placeholder="Ej: Epson"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-slate-500 font-bold uppercase text-[9px]">Modelo</label>
                  <input
                    type="text"
                    value={modelo}
                    onChange={(e) => setModelo(e.target.value)}
                    placeholder="Ej: L3210"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-slate-500 font-bold uppercase text-[9px]">Número de Serie</label>
                  <input
                    type="text"
                    value={numeroSerie}
                    onChange={(e) => setNumeroSerie(e.target.value)}
                    placeholder="Ej: EPS4433"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-slate-500 font-bold uppercase text-[9px]">Anydesk ID</label>
                  <input
                    type="text"
                    value={anydeskId}
                    onChange={(e) => setAnydeskId(e.target.value)}
                    placeholder="Ej: 123 456 789"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-slate-500 font-bold uppercase text-[9px]">Asignado a (Personal)</label>
                  <input
                    type="text"
                    value={asignadoA}
                    onChange={(e) => setAsignadoA(e.target.value)}
                    placeholder="Ej: Juan Pérez"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-500 font-bold uppercase text-[9px]">Estado de Operatividad</label>
                <select
                  value={estadoEquipo}
                  onChange={(e) => setEstadoEquipo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                >
                  <option value="activo">Activo / Operativo</option>
                  <option value="mantenimiento">En Mantenimiento</option>
                  <option value="de_baja">De Baja</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold flex items-center gap-1.5 disabled:opacity-50"
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
        </div>
      )}
    </div>
  );
};

export default Inventory;
