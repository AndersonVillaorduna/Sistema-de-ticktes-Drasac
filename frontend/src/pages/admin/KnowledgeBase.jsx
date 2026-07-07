import { Search, FileText, Plus } from 'lucide-react';

const articles = [
  { title: 'Cómo resetear contraseña de Windows', category: 'Software', updated: '12/06/2025' },
  { title: 'Solución a impresora que no responde', category: 'Impresoras', updated: '10/06/2025' },
  { title: 'Configuración de correo en Outlook', category: 'Correo / Cuenta', updated: '08/06/2025' },
  { title: 'Pasos para conectar VPN corporativa', category: 'Redes', updated: '05/06/2025' },
  { title: 'Mantenimiento preventivo de POS', category: 'POS / Caja', updated: '01/06/2025' },
];

export default function KnowledgeBase() {
  return (
    <div className="p-5 md:p-8 lg:p-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-neutral-900">Base de Conocimiento</h2>
          <p className="text-sm text-neutral-500">Artículos y guías de solución</p>
        </div>
        <button className="btn-primary flex items-center gap-2 py-2.5 px-4 rounded-lg text-sm font-bold">
          <Plus className="w-4 h-4" /> Nuevo Artículo
        </button>
      </div>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
        <input type="text" placeholder="Buscar en la base de conocimiento..."
          className="w-full rounded-lg py-2.5 pl-11 pr-4 text-sm border border-neutral-200 focus:border-primary focus:outline-none" />
      </div>
      <div className="card divide-y divide-neutral-100">
        {articles.map((a, i) => (
          <div key={i} className="flex items-center gap-4 p-4 hover:bg-neutral-50 transition-all cursor-pointer">
            <div className="w-9 h-9 rounded-lg bg-primary-light flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-neutral-900">{a.title}</p>
              <p className="text-xs text-neutral-500 mt-0.5">{a.category} · Actualizado {a.updated}</p>
            </div>
            <span className="text-xs text-primary font-semibold">Leer →</span>
          </div>
        ))}
      </div>
    </div>
  );
}
