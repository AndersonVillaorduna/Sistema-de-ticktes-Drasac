import { Inbox } from 'lucide-react';

export default function EmptyState({ icon: Icon = Inbox, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <Icon className="w-16 h-16 text-neutral-200 mb-4" />
      <p className="text-base font-bold text-neutral-700 mb-1">{title}</p>
      {description && <p className="text-sm text-neutral-500 text-center max-w-sm mb-6">{description}</p>}
      {action}
    </div>
  );
}
