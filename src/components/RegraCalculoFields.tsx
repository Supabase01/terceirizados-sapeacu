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
  /** Bases a esconder do dropdown (ex: ['liquido'] em Descontos para evitar cálculo circular) */
  excludeBases?: BaseCalculo[];
  errors?: Partial<Record<'valor' | 'percentual' | 'base_calculo', string>>;
}

export const BASE_CALCULO_LABELS: Record<BaseCalculo, string> = {
  salario_base: 'Salário Base',
  bruto: 'Salário Bruto',
  liquido: 'Salário Líquido',
  outra: 'Outra base de cálculo',
};

export const RegraCalculoFields = ({ state, onChange, valorLabel = 'Valor (R$) *', excludeBases = [], errors = {} }: Props) => {
  const showBase = (b: BaseCalculo) => !excludeBases.includes(b);
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
            min="0"
            placeholder="0.00"
            value={state.valor}
            onChange={(e) => onChange({ valor: e.target.value })}
            className={errors.valor ? 'border-destructive focus-visible:ring-destructive' : ''}
          />
          {errors.valor && <p className="text-xs text-destructive">{errors.valor}</p>}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Percentual (%) *</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              max="100"
              placeholder="0,00"
              value={state.percentual}
              onChange={(e) => onChange({ percentual: e.target.value })}
              className={errors.percentual ? 'border-destructive focus-visible:ring-destructive' : ''}
            />
            {errors.percentual && <p className="text-xs text-destructive">{errors.percentual}</p>}
          </div>
          <div className="space-y-2">
            <Label>Base de cálculo *</Label>
            <Select
              value={state.base_calculo || ''}
              onValueChange={(v) => onChange({ base_calculo: v as BaseCalculo })}
            >
              <SelectTrigger className={errors.base_calculo ? 'border-destructive focus:ring-destructive' : ''}>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {showBase('salario_base') && <SelectItem value="salario_base">Salário Base</SelectItem>}
                {showBase('bruto') && <SelectItem value="bruto">Salário Bruto</SelectItem>}
                {showBase('liquido') && <SelectItem value="liquido">Salário Líquido</SelectItem>}
                {showBase('outra') && <SelectItem value="outra" disabled>Outra base (em breve)</SelectItem>}
              </SelectContent>
            </Select>
            {errors.base_calculo && <p className="text-xs text-destructive">{errors.base_calculo}</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export const isRegraCalculoValid = (s: RegraCalculoState): boolean => {
  if (s.modo_calculo === 'fixo') return !!s.valor && Number(s.valor) >= 0;
  return !!s.percentual && Number(s.percentual) > 0 && Number(s.percentual) <= 100 && !!s.base_calculo && s.base_calculo !== 'outra';
};
