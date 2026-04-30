import { useNavigate } from 'react-router-dom';
import { ArrowRight, type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface Props {
  label: string;
  description: string;
  icon: LucideIcon;
  itemsCount: number;
  targetUrl: string;
}

export function ModuleCard({ label, description, icon: Icon, itemsCount, targetUrl }: Props) {
  const navigate = useNavigate();
  return (
    <Card
      onClick={() => navigate(targetUrl)}
      className="group cursor-pointer p-6 transition-all hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-6 w-6" />
        </div>
        <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{label}</h3>
      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{description}</p>
      <p className="text-xs text-muted-foreground">
        {itemsCount} {itemsCount === 1 ? 'página' : 'páginas'}
      </p>
    </Card>
  );
}
