import { useState, useEffect } from 'react';
import api from '../../services/api';
import StatCard from '../../components/shared/StatCard';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { Package, CheckCircle2, Clock, AlertTriangle, Search, Plus, X, Loader2, AlertCircle, Laptop } from 'lucide-react';

const estadoColor = {
  'activo': 'bg-success-light text-success border-success/20',
  'mantenimiento': 'bg-warning-light text-warning border-warning/20',
  'reparacion': 'bg-warning-light text-warning border-warning/20',
  'fuera_servicio': 'bg-danger-light text-danger border-danger/20',
  'de_baja': 'bg-danger-light text-danger border-danger/20',
};

export default function AdminInventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tipo, setTipo] = useState('');
  const [estado, setEstado] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [formData, setFormData] = useState({ nombre_equipo: '', tipo: 'Laptop', marca: '', modelo: '', numero_serie: '', ubicacion_tienda: '', estado: 'activo', anydesk_id: '', asignado_a: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (tipo) params.tipo = tipo;
      if (estado) params.estado = estado;
      const res = await api.get('/inventario', { params });
      setItems(res.data);
    } catch { setError('Error al cargar inventario.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, [tipo, estado]);
  const handleSearch = (e) => { e.preventDefault(); fetchItems(); };

  const openModal = (item = null) => {
    if (item) {
      setSelected(item);
      setFormData({ nombre_equipo: item.nombre_equipo, tipo: item.tipo, marca: item.marca || '', modelo: item.modelo || '', numero_serie: item.numero_serie, ubicacion_tienda: item.ubicacion_tienda, estado: item.estado, anydesk_id: item.anydesk_id || '', asignado_a: item.asignado_a || '' });
    } else {
      setSelected(null);
      setFormData({ nombre_equipo: '', tipo: 'Laptop', marca: '', modelo: '', numero_serie: '', ubicacion_tienda: '', estado: 'activo', anydesk_id: '', asignado_a: '' });
    }
    setModalOpen(true);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nombre_equipo || !formData.numero_serie || !formData.ubicacion_tienda) {
      setError('Nombre, serie y ubicación son requeridos.'); return;
    }
    setSubmitting(true);
    try {
      if (selected) await api.put(`/inventario/${selected.id}`, formData);
      else await api.post('/inventario', formData);
      setModalOpen(false);
      fetchItems();
    } catch (err) { setError(err.response?.data?.message || 'Error al guardar.'); }
    finally { setSubmitting(false); }
  };

  const stats = {
    total: items.length,
    operativos: items.filter((i) => i.estado === 'activo').length,
    reparacion: items.filter((i) => i.estado === 'mantenimiento' || i.estado === 'reparacion').length,
    baja: items.filter((i) => i.estado === 'de_baja' || i.estado === 'fuera_servicio').length,
  };

  return (
    <div className="p-5 md:p-8 lg:p-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-neutral-900">Inventario de Equipos</h2>
          <p className="text-sm text-neutral-500">Administra el hardware de TI</p>
        </div>
        <button onClick={() => openModal()}
          className="btn-primary flex items-center gap-2 py-2.5 px-4 rounded-lg text-sm font-bold">
          <Plus className="w-4 h-4" /> Registrar Equipo
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Package} label="Total de equipos" value={stats.total} color="primary" />
        <StatCard icon={CheckCircle2} label="Operativos" value={stats.operativos} color="success" />
        <StatCard icon={Clock} label="En reparación" value={stats.reparacion} color="warning" />
        <StatCard icon={AlertTriangle} label="Fuera de servicio" value={stats.baja} color="danger" />
      </div>

      <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 space-y-1">
          <label className="block text-[10px] text-neutral-500 font-bold uppercase">Buscar</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, serie, asignado..."
              className="w-full rounded-lg py-2.5 pl-11 pr-4 text-sm border border-neutral-200 focus:border-primary focus:outline-none" />
          </div>
        </div>
        <div className="space-y-1">
          <label className="block text-[10px] text-neutral-500 font-bold uppercase">Tipo</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full rounded-lg py-2.5 px-3 text-sm border border-neutral-200">
            <option value="">Todos</option>
            <option value="Laptop">Laptop</option>
            <option value="PC">PC</option>
            <option value="Impresora">Impresora</option>
            <option value="Modem">Modem</option>
            <option value="Otro">Otro</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="block text-[10px] text-neutral-500 font-bold uppercase">Estado</label>
          <select value={estado} onChange={(e) => setEstado(e.target.value)} className="w-full rounded-lg py-2.5 px-3 text-sm border border-neutral-200">
            <option value="">Todos</option>
            <option value="activo">Operativo</option>
            <option value="mantenimiento">En reparación</option>
            <option value="de_baja">Fuera de servicio</option>
          </select>
        </div>
      </form>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-100 text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                <th className="py-3 px-4">Equipo</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">S/N</th>
                <th className="py-3 px-4">Ubicación</th>
                <th className="py-3 px-4">Asignado a</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-sm">
              {loading ? (
                <tr><td colSpan={7}><LoadingSpinner text="Cargando inventario..." /></td></tr>
              ) : items.length > 0 ? (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-neutral-900">
                      <div className="flex items-center gap-2">
                        <Laptop className="w-4 h-4 text-neutral-400" />
                        {item.nombre_equipo}
                      </div>
                      <p className="text-xs text-neutral-500 font-normal">{item.marca} {item.modelo}</p>
                    </td>
                    <td className="py-3.5 px-4 text-neutral-600">{item.tipo}</td>
                    <td className="py-3.5 px-4 text-neutral-500 font-mono text-xs">{item.numero_serie}</td>
                    <td className="py-3.5 px-4 text-neutral-600">{item.ubicacion_tienda}</td>
                    <td className="py-3.5 px-4 text-neutral-600">{item.asignado_a || '-'}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase inline-block border ${estadoColor[item.estado] || 'bg-neutral-100 text-neutral-600'}`}>
                        {item.estado}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button onClick={() => openModal(item)} className="text-xs text-primary font-semibold hover:underline">Editar</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={7} className="py-12 text-center text-neutral-500">No se encontraron equipos.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[10px] w-full max-w-lg border border-neutral-200 shadow-card p-6 space-y-4 relative">
            <button onClick={() => setModalOpen(false)} className="absolute right-4 top-4 p-1 hover:bg-neutral-100 rounded-full text-neutral-400">
              <X className="w-5 h-5" />
            </button>
            <h4 className="font-bold text-neutral-900 text-sm">{selected ? 'Editar Equipo' : 'Registrar Nuevo Equipo'}</h4>
            {error && <div className="bg-danger-light border border-danger/20 text-danger p-3 rounded-lg flex items-start gap-2 text-xs"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span></div>}
            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="block text-[10px] text-neutral-500 font-bold uppercase">Nombre</label>
                  <input type="text" value={formData.nombre_equipo} onChange={(e) => setFormData({ ...formData, nombre_equipo: e.target.value })} className="w-full rounded-lg py-2.5 px-3 border border-neutral-200 focus:border-primary focus:outline-none" required /></div>
                <div className="space-y-1"><label className="block text-[10px] text-neutral-500 font-bold uppercase">Tipo</label>
                  <select value={formData.tipo} onChange={(e) => setFormData({ ...formData, tipo: e.target.value })} className="w-full rounded-lg py-2.5 px-3 border border-neutral-200 focus:border-primary focus:outline-none">
                    <option value="Laptop">Laptop</option><option value="PC">PC</option><option value="Impresora">Impresora</option><option value="Modem">Modem</option><option value="Otro">Otro</option></select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="block text-[10px] text-neutral-500 font-bold uppercase">Marca</label>
                  <input type="text" value={formData.marca} onChange={(e) => setFormData({ ...formData, marca: e.target.value })} className="w-full rounded-lg py-2.5 px-3 border border-neutral-200 focus:border-primary focus:outline-none" /></div>
                <div className="space-y-1"><label className="block text-[10px] text-neutral-500 font-bold uppercase">Modelo</label>
                  <input type="text" value={formData.modelo} onChange={(e) => setFormData({ ...formData, modelo: e.target.value })} className="w-full rounded-lg py-2.5 px-3 border border-neutral-200 focus:border-primary focus:outline-none" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="block text-[10px] text-neutral-500 font-bold uppercase">N° Serie</label>
                  <input type="text" value={formData.numero_serie} onChange={(e) => setFormData({ ...formData, numero_serie: e.target.value })} className="w-full rounded-lg py-2.5 px-3 border border-neutral-200 focus:border-primary focus:outline-none" required /></div>
                <div className="space-y-1"><label className="block text-[10px] text-neutral-500 font-bold uppercase">Ubicación</label>
                  <input type="text" value={formData.ubicacion_tienda} onChange={(e) => setFormData({ ...formData, ubicacion_tienda: e.target.value })} className="w-full rounded-lg py-2.5 px-3 border border-neutral-200 focus:border-primary focus:outline-none" required /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="block text-[10px] text-neutral-500 font-bold uppercase">Anydesk ID</label>
                  <input type="text" value={formData.anydesk_id} onChange={(e) => setFormData({ ...formData, anydesk_id: e.target.value })} className="w-full rounded-lg py-2.5 px-3 border border-neutral-200 focus:border-primary focus:outline-none" /></div>
                <div className="space-y-1"><label className="block text-[10px] text-neutral-500 font-bold uppercase">Asignado a</label>
                  <input type="text" value={formData.asignado_a} onChange={(e) => setFormData({ ...formData, asignado_a: e.target.value })} className="w-full rounded-lg py-2.5 px-3 border border-neutral-200 focus:border-primary focus:outline-none" /></div>
              </div>
              <div className="space-y-1"><label className="block text-[10px] text-neutral-500 font-bold uppercase">Estado</label>
                <select value={formData.estado} onChange={(e) => setFormData({ ...formData, estado: e.target.value })} className="w-full rounded-lg py-2.5 px-3 border border-neutral-200 focus:border-primary focus:outline-none">
                  <option value="activo">Operativo</option><option value="mantenimiento">En reparación</option><option value="de_baja">Fuera de servicio</option></select></div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2.5 border border-neutral-200 text-neutral-600 rounded-lg font-semibold hover:bg-neutral-50">Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-primary px-4 py-2.5 rounded-lg font-semibold flex items-center gap-1.5 disabled:opacity-50">
                  {submitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Guardando...</> : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}