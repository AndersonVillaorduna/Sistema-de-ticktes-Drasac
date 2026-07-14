import { useState, useEffect } from 'react';
import { Search, FileText, Plus, X, Loader2, BookOpen, Trash2 } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function KnowledgeBase() {
  const { user } = useAuth();
  const [articles, setArticles] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);

  // Form
  const [form, setForm] = useState({ problema_tipo: '', solucion: '', categoria_id: '', palabras_clave: '' });
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [artRes, catRes] = await Promise.all([
        api.get('/base-conocimiento'),
        api.get('/categorias')
      ]);
      setArticles(artRes.data);
      setCategorias(catRes.data);
    } catch (error) {
      console.error('Error fetching KB:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/base-conocimiento', form);
      setIsCreateOpen(false);
      setForm({ problema_tipo: '', solucion: '', categoria_id: '', palabras_clave: '' });
      fetchData();
    } catch (error) {
      alert('Error al crear el artículo');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar este artículo?')) return;
    try {
      await api.delete(`/base-conocimiento/${id}`);
      setSelectedArticle(null);
      fetchData();
    } catch (error) {
      alert('Error al eliminar');
    }
  };

  const filteredArticles = articles.filter(a => 
    a.problema_tipo.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.palabras_clave.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-5 md:p-8 lg:p-10 space-y-6">
      <div style={{ maxWidth: '1000px' }} className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900">Base de Conocimiento</h2>
            <p className="text-sm text-neutral-500 mt-1">Artículos y guías de solución de problemas</p>
          </div>
          {(user?.rol === 'admin' || user?.rol === 'tecnico') && (
            <button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2 py-3 px-5 bg-[#1B3C5C] hover:bg-[#142E47] text-white rounded-xl text-sm font-bold transition-all shadow-sm">
              <Plus className="w-4 h-4" /> Nuevo Artículo
            </button>
          )}
        </div>

        <div className="relative max-w-md mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
          <input type="text" placeholder="Buscar por problema o palabras clave..."
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl py-3 pl-12 pr-4 text-sm border border-neutral-200 focus:border-[#1B3C5C] focus:ring-4 focus:ring-[#1B3C5C]/5 focus:outline-none transition-all shadow-sm" />
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#1B3C5C]" /></div>
        ) : (
          <div className="space-y-4">
            {filteredArticles.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-neutral-200 text-neutral-400 shadow-sm">
                <BookOpen className="w-10 h-10 mx-auto mb-3 text-neutral-200" />
                No se encontraron artículos.
              </div>
            ) : (
              filteredArticles.map((a) => (
                <div key={a.id} onClick={() => setSelectedArticle(a)} 
                     className="group flex items-center gap-5 p-5 bg-white rounded-2xl border border-neutral-200 shadow-sm hover:border-[#1B3C5C]/30 hover:shadow-md transition-all cursor-pointer">
                  <div className="w-12 h-12 rounded-xl bg-neutral-50 border border-neutral-100 flex items-center justify-center shrink-0 group-hover:bg-[#1B3C5C]/5 group-hover:border-[#1B3C5C]/10 transition-all">
                    <FileText className="w-5 h-5 text-neutral-400 group-hover:text-[#1B3C5C] transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-neutral-900 group-hover:text-[#1B3C5C] transition-colors">{a.problema_tipo}</p>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-md">{a.categoria_nombre || 'General'}</span>
                      <span className="text-xs text-neutral-400 truncate max-w-md">Tags: {a.palabras_clave}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-bold text-[#1B3C5C] opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                    Leer artículo <span className="text-lg leading-none">→</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* MODAL CREAR */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in flex flex-col">
            <div className="flex justify-between items-center border-b border-neutral-100 bg-neutral-50" style={{ padding: '20px 24px' }}>
              <h3 className="font-bold text-neutral-900 flex items-center gap-2 text-lg"><BookOpen className="w-5 h-5 text-primary" /> Nuevo Artículo</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-neutral-400 hover:text-neutral-600 bg-white border border-neutral-200 rounded-lg w-8 h-8 flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleCreate} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label className="block text-xs font-bold text-neutral-500 mb-1.5 uppercase tracking-wider">Título del Problema</label>
                <input required type="text" value={form.problema_tipo} onChange={(e) => setForm({...form, problema_tipo: e.target.value})} className="w-full border border-neutral-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all" placeholder="Ej: Impresora no enciende" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-1.5 uppercase tracking-wider">Categoría</label>
                  <select value={form.categoria_id} onChange={(e) => setForm({...form, categoria_id: e.target.value})} className="w-full border border-neutral-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all bg-white">
                    <option value="">General</option>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-1.5 uppercase tracking-wider">Palabras clave</label>
                  <input required type="text" value={form.palabras_clave} onChange={(e) => setForm({...form, palabras_clave: e.target.value})} className="w-full border border-neutral-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all" placeholder="impresora, papel, red" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 mb-1.5 uppercase tracking-wider">Solución detallada</label>
                <textarea required rows={6} value={form.solucion} onChange={(e) => setForm({...form, solucion: e.target.value})} className="w-full border border-neutral-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all resize-none" placeholder="Pasos detallados para resolver el problema..." />
              </div>
              <div className="flex justify-end gap-3 border-t border-neutral-100" style={{ paddingTop: '20px', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsCreateOpen(false)} className="px-4 py-2 text-sm font-bold text-neutral-600 hover:bg-neutral-100 rounded-lg">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-bold text-white bg-primary hover:bg-primary-dark rounded-lg flex items-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar Artículo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL LEER */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center border-b border-neutral-100 bg-neutral-50" style={{ padding: '24px 32px' }}>
              <div>
                <span className="text-[10px] font-bold text-primary uppercase tracking-widest bg-primary/10 px-3 py-1.5 rounded-full">{selectedArticle.categoria_nombre || 'General'}</span>
                <h3 className="font-bold text-xl text-neutral-900 mt-3">{selectedArticle.problema_tipo}</h3>
              </div>
              <button onClick={() => setSelectedArticle(null)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-500 transition-all shadow-sm"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto" style={{ padding: '32px' }}>
              <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-4 flex items-center gap-2"><BookOpen className="w-4 h-4" /> Solución Oficial</h4>
              <div className="text-[15px] text-neutral-700 leading-relaxed whitespace-pre-wrap bg-neutral-50 rounded-xl border border-neutral-100" style={{ padding: '24px' }}>
                {selectedArticle.solucion}
              </div>
              
              <div className="border-t border-neutral-100 flex items-center justify-between" style={{ marginTop: '32px', paddingTop: '24px' }}>
                <div className="flex gap-2 flex-wrap">
                  {selectedArticle.palabras_clave.split(',').map((tag, i) => (
                    <span key={i} className="px-3 py-1.5 bg-neutral-100 text-neutral-600 text-xs font-bold rounded-lg border border-neutral-200">
                      #{tag.trim()}
                    </span>
                  ))}
                </div>
                {user?.rol === 'admin' && (
                  <button onClick={() => handleDelete(selectedArticle.id)} className="text-red-500 bg-red-50 hover:bg-red-100 p-2.5 rounded-xl transition-all border border-red-100" title="Eliminar artículo">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
