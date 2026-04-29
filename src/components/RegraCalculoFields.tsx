import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export type ModoCalculo = 'fixo' | 'percentual';
export type BaseCalculo = 'salario_base' | 'bruto' | 'liquido' | 'outra';

export interface RegraCalculoState {
  modo_calculo: ModoCalculo;
  valor: string;
  percentual: string;
  base_calculo: BaseCalculo | '';
}

interface Props {
  state: RegraCalculoState;
  onChange: (next: Partial<RegraCalculoState>) => void;
  valorLabel?: string;
}

export const BASE_CALCULO_LABELS: Record<BaseCalculo, string> = {
  salario_base: 'Salário Base',
  bruto: 'Salário Bruto',
  liquido: 'Salário Líquido',
  outra: 'Outra base de cálculo',
};

export const RegraCalculoFields = ({ state, onChange, valorLabel = 'Valor (R$) *' }: Props) => {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Modo de valor</Label>
        <Tabs
          value={state.modo_calculo}
          onValueChange={(v) => onChange({ modo_calculo: v as ModoCalculo })}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="fixo">Valor fixo</TabsTrigger>
            <TabsTrigger value="percentual">Percentual sobre base</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {state.modo_calculo === 'fixo' ? (
        <div className="space-y-2">
          <Label>{valorLabel}</Label>
          <Input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={state.valor}
            onChange={(e) => onChange({ valor: e.target.value })}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Percentual (%) *</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0,00"
              value={state.percentual}
              onChange={(e) => onChange({ percentual: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Base de cálculo *</Label>
            <Select
              value={state.base_calculo || ''}
              onValueChange={(v) => onChange({ base_calculo: v as BaseCalculo })}
            >
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="salario_base">Salário Base</SelectItem>
                <SelectItem value="bruto">Salário Bruto</SelectItem>
                <SelectItem value="liquido">Salário Líquido</SelectItem>
                <SelectItem value="outra" disabled>Outra base (em breve)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
};

export const isRegraCalculoValid = (s: RegraCalculoState): boolean => {
  if (s.modo_calculo === 'fixo') return !!s.valor;
  return !!s.percentual && !!s.base_calculo && s.base_calculo !== 'outra';
};
