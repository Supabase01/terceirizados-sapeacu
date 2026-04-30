import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatBRL, roundMoney } from '@/lib/money';

export type ModoCalculo = 'fixo' | 'percentual' | 'quantidade';
export type BaseCalculo = 'salario_base' | 'bruto' | 'liquido' | 'outra';

export interface RegraCalculoState {
  modo_calculo: ModoCalculo;
  valor: string;
  percentual: string;
  base_calculo: BaseCalculo | '';
  quantidade?: string;
  valor_unitario?: string;
}

interface Props {
  state: RegraCalculoState;
  onChange: (next: Partial<RegraCalculoState>) => void;
  valorLabel?: string;
  /** Bases a esconder do dropdown (ex: ['liquido'] em Descontos para evitar cálculo circular) */
  excludeBases?: BaseCalculo[];
  errors?: Partial<Record<'valor' | 'percentual' | 'base_calculo' | 'quantidade' | 'valor_unitario', string>>;
}

export const BASE_CALCULO_LABELS: Record<BaseCalculo, string> = {
  salario_base: 'Salário Base',
  bruto: 'Salário Bruto',
  liquido: 'Salário Líquido',
  outra: 'Outra base de cálculo',
};

export const RegraCalculoFields = ({ state, onChange, valorLabel = 'Valor (R$) *', excludeBases = [], errors = {} }: Props) => {
  const showBase = (b: BaseCalculo) => !excludeBases.includes(b);

  const qtdNum = Number(state.quantidade || 0);
  const vuNum = Number(state.valor_unitario || 0);
  const totalQtd = roundMoney(qtdNum * vuNum);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Modo de valor</Label>
        <Tabs
          value={state.modo_calculo}
          onValueChange={(v) => onChange({ modo_calculo: v as ModoCalculo })}
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="fixo">Valor fixo</TabsTrigger>
            <TabsTrigger value="percentual">Percentual</TabsTrigger>
            <TabsTrigger value="quantidade">Quantidade × valor</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {state.modo_calculo === 'fixo' && (
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
      )}

      {state.modo_calculo === 'percentual' && (
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

      {state.modo_calculo === 'quantidade' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Quantidade *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                value={state.quantidade || ''}
                onChange={(e) => onChange({ quantidade: e.target.value })}
                className={errors.quantidade ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
              {errors.quantidade && <p className="text-xs text-destructive">{errors.quantidade}</p>}
            </div>
            <div className="space-y-2">
              <Label>Valor unitário (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={state.valor_unitario || ''}
                onChange={(e) => onChange({ valor_unitario: e.target.value })}
                className={errors.valor_unitario ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
              {errors.valor_unitario && <p className="text-xs text-destructive">{errors.valor_unitario}</p>}
            </div>
          </div>
          <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm flex items-center justify-between">
            <span className="text-muted-foreground">Total calculado</span>
            <span className="font-mono font-semibold">{formatBRL(totalQtd)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export const isRegraCalculoValid = (s: RegraCalculoState): boolean => {
  if (s.modo_calculo === 'fixo') return !!s.valor && Number(s.valor) >= 0;
  if (s.modo_calculo === 'quantidade') {
    const q = Number(s.quantidade);
    const vu = Number(s.valor_unitario);
    return !!s.quantidade && !!s.valor_unitario && q > 0 && vu >= 0 && Number.isFinite(q) && Number.isFinite(vu);
  }
  return !!s.percentual && Number(s.percentual) > 0 && Number(s.percentual) <= 100 && !!s.base_calculo && s.base_calculo !== 'outra';
};
