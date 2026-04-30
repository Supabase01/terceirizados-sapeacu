import { useNavigate } from 'react-router-dom';
import { type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface Props {
  label: string;
  icon: LucideIcon;
  itemsCount: number;
  targetUrl: string;
  color?: string;
}

export function ModuleCard({ label, icon: Icon, itemsCount, targetUrl, color }: Props) {
  const navigate = useNavigate();
  return (
    <Card
      onClick={() => navigate(targetUrl)}
      className="group cursor-pointer p-4 flex flex-col items-center justify-center text-center gap-2 transition-all hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5"
    >
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${color ?? 'bg-primary/10 text-primary'}`}>
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-semibold text-foreground leading-tight">{label}</h3>
      <p className="text-[11px] text-muted-foreground">
        {itemsCount} {itemsCount === 1 ? 'página' : 'páginas'}
      </p>
    </Card>
  );
}
