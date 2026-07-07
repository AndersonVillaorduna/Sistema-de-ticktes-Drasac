import { TrendingUp, TrendingDown } from 'lucide-react';

const colorMap = {
  primary: { iconCls: 'blue' },
  ai: { iconCls: 'violet' },
  success: { iconCls: 'green' },
  warning: { iconCls: 'warn' },
  danger: { iconCls: 'red' },
  violet: { iconCls: 'violet' },
};

export default function StatCard({ icon: Icon, label, value, color = 'primary', delta, deltaLabel }) {
  const c = colorMap[color] || colorMap.primary;
  const isUp = delta > 0;
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between mb-3">
        <div className={`stat-icon ${c.iconCls}`}>
          <Icon className="w-5 h-5" />
        </div>
        {delta !== undefined && delta !== null && (
          <span className={`stat-delta ${isUp ? 'up' : 'down'}`}>
            {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
      <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-black text-neutral-900 mt-0.5">{value}</p>
      {deltaLabel && <p className="text-[11px] text-neutral-400 mt-0.5">{deltaLabel}</p>}
    </div>
  );
}
