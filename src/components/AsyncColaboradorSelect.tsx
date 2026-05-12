import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronsUpDown, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';

export interface ColaboradorLite {
  id: string;
  nome: string;
  cpf: string;
  salario_base: number;
}

interface BaseProps {
  unidadeId: string | null;
  disabled?: boolean;
  placeholder?: string;
  /** Fired whenever new colaboradores are loaded (search results or selected fetch). Useful to cache salario_base. */
  onItemsLoaded?: (items: ColaboradorLite[]) => void;
}

interface SingleProps extends BaseProps {
  multiple?: false;
  value: string;
  onValueChange: (value: string) => void;
}

interface MultiProps extends BaseProps {
  multiple: true;
  values: string[];
  onValuesChange: (values: string[]) => void;
}

type Props = SingleProps | MultiProps;

const PAGE_LIMIT = 50;
const PREVIEW_LIMIT = 20;
const DEBOUNCE_MS = 300;

export function AsyncColaboradorSelect(props: Props) {
  const { unidadeId, disabled, placeholder = 'Selecione...', onItemsLoaded } = props;
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  const [debounced, setDebounced] = useState('');

  // Debounce search term
  useEffect(() => {
    const t = setTimeout(() => setDebounced(term.trim()), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [term]);

  // Reset term when closed
  useEffect(() => {
    if (!open) {
      setTerm('');
      setDebounced('');
    }
  }, [open]);

  // Cache of items we've seen (id -> ColaboradorLite)
  const [cache, setCache] = useState<Map<string, ColaboradorLite>>(new Map());
  const cacheRef = useRef(cache);
  cacheRef.current = cache;

  const addToCache = (items: ColaboradorLite[]) => {
    if (!items.length) return;
    setCache(prev => {
      let changed = false;
      const next = new Map(prev);
      for (const it of items) {
        if (!next.has(it.id)) {
          next.set(it.id, it);
          changed = true;
        }
      }
      if (changed) onItemsLoaded?.(Array.from(next.values()));
      return changed ? next : prev;
    });
  };

  // Fetch search results
  const { data: searchResults = [], isFetching } = useQuery({
    queryKey: ['colab-async-search', unidadeId, debounced],
    queryFn: async (): Promise<ColaboradorLite[]> => {
      if (!unidadeId) return [];
      let q = supabase
        .from('colaboradores')
        .select('id, nome, cpf, salario_base')
        .eq('unidade_id', unidadeId)
        .eq('ativo', true)
        .order('nome');
      if (debounced.length >= 2) {
        const safe = debounced.replace(/[%,]/g, ' ');
        q = q.or(`nome.ilike.%${safe}%,cpf.ilike.%${safe}%`).limit(PAGE_LIMIT);
      } else {
        q = q.limit(PREVIEW_LIMIT);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as ColaboradorLite[];
    },
    enabled: !!unidadeId && open,
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (searchResults.length) addToCache(searchResults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchResults]);

  // Resolve selected ids that aren't in cache yet (e.g. on edit)
  const selectedIds = props.multiple ? props.values : ((props as SingleProps).value ? [(props as SingleProps).value] : []);
  const missingIds = selectedIds.filter(id => id && !cache.has(id));

  useQuery({
    queryKey: ['colab-async-resolve', unidadeId, missingIds.sort().join(',')],
    queryFn: async (): Promise<ColaboradorLite[]> => {
      if (!unidadeId || missingIds.length === 0) return [];
      const { data, error } = await supabase
        .from('colaboradores')
        .select('id, nome, cpf, salario_base')
        .in('id', missingIds);
      if (error) throw error;
      const items = (data || []) as ColaboradorLite[];
      addToCache(items);
      return items;
    },
    enabled: !!unidadeId && missingIds.length > 0,
    staleTime: 60_000,
  });

  // Build list to display: search results + any selected items not in current results (so checks are visible)
  const displayed: ColaboradorLite[] = useMemo(() => {
    const ids = new Set(searchResults.map(r => r.id));
    const extras: ColaboradorLite[] = [];
    for (const id of selectedIds) {
      if (!ids.has(id)) {
        const item = cache.get(id);
        if (item) extras.push(item);
      }
    }
    return [...extras, ...searchResults];
  }, [searchResults, selectedIds, cache]);

  // Multi
  if (props.multiple) {
    const { values, onValuesChange } = props;
    const selectedLabels = values.map(v => cache.get(v)?.nome || '...');
    const toggle = (id: string) => {
      const next = values.includes(id) ? values.filter(v => v !== id) : [...values, id];
      onValuesChange(next);
    };

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal h-auto min-h-10"
            disabled={disabled}
          >
            <div className="flex flex-wrap gap-1 flex-1 text-left">
              {selectedLabels.length === 0 ? (
                <span className="text-muted-foreground">{placeholder}</span>
              ) : (
                selectedLabels.map((label, i) => (
                  <Badge key={values[i]} variant="secondary" className="text-xs">
                    {label}
                    <X
                      className="ml-1 h-3 w-3 cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); toggle(values[i]); }}
                    />
                  </Badge>
                ))
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command shouldFilter={false}>
            <div className="flex items-center border-b px-3">
              <CommandInput
                placeholder="Digite nome ou CPF..."
                value={term}
                onValueChange={setTerm}
                className="flex-1"
              />
              {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            <CommandList>
              <CommandEmpty>
                {debounced.length === 0 ? 'Digite para buscar...' : isFetching ? 'Buscando...' : 'Nenhum colaborador encontrado.'}
              </CommandEmpty>
              <CommandGroup>
                {displayed.map((opt) => (
                  <CommandItem key={opt.id} value={opt.id} onSelect={() => toggle(opt.id)}>
                    <Check className={cn("mr-2 h-4 w-4", values.includes(opt.id) ? "opacity-100" : "opacity-0")} />
                    <div>
                      <span>{opt.nome}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{opt.cpf}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }

  // Single
  const { value, onValueChange } = props as SingleProps;
  const selectedLabel = value ? cache.get(value)?.nome : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={disabled}
        >
          {selectedLabel || <span className="text-muted-foreground">{placeholder}</span>}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <CommandInput
              placeholder="Digite nome ou CPF..."
              value={term}
              onValueChange={setTerm}
              className="flex-1"
            />
            {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <CommandList>
            <CommandEmpty>
              {debounced.length === 0 ? 'Digite para buscar...' : isFetching ? 'Buscando...' : 'Nenhum colaborador encontrado.'}
            </CommandEmpty>
            <CommandGroup>
              {displayed.map((opt) => (
                <CommandItem
                  key={opt.id}
                  value={opt.id}
                  onSelect={() => {
                    onValueChange(opt.id === value ? '' : opt.id);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === opt.id ? "opacity-100" : "opacity-0")} />
                  <div>
                    <span>{opt.nome}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{opt.cpf}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
