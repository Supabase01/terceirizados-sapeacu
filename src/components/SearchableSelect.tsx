import { useState, useRef, useEffect } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

interface Option {
  value: string;
  label: string;
  sublabel?: string;
}

interface SearchableSelectProps {
  options: Option[];
  placeholder?: string;
  emptyText?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  // Multi-select
  multiple?: boolean;
  values?: string[];
  onValuesChange?: (values: string[]) => void;
  disabled?: boolean;
}

export function SearchableSelect({
  options,
  placeholder = 'Selecione...',
  emptyText = 'Nenhum resultado.',
  value,
  onValueChange,
  multiple = false,
  values = [],
  onValuesChange,
  disabled = false,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);

  if (multiple) {
    const selectedLabels = values
      .map(v => options.find(o => o.value === v)?.label)
      .filter(Boolean);

    const toggleValue = (val: string) => {
      const next = values.includes(val)
        ? values.filter(v => v !== val)
        : [...values, val];
      onValuesChange?.(next);
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
                  <Badge key={i} variant="secondary" className="text-xs">
                    {label}
                    <X
                      className="ml-1 h-3 w-3 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleValue(values[i]);
                      }}
                    />
                  </Badge>
                ))
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Digitar para filtrar..." />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {options.map((opt) => (
                  <CommandItem
                    key={opt.value}
                    value={opt.label}
                    onSelect={() => toggleValue(opt.value)}
                  >
                    <Check className={cn("mr-2 h-4 w-4", values.includes(opt.value) ? "opacity-100" : "opacity-0")} />
                    <div>
                      <span>{opt.label}</span>
                      {opt.sublabel && <span className="ml-2 text-xs text-muted-foreground">{opt.sublabel}</span>}
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

  // Single select
  const selectedLabel = options.find(o => o.value === value)?.label;

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
        <Command>
          <CommandInput placeholder="Digitar para filtrar..." />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.label}
                  onSelect={() => {
                    onValueChange?.(opt.value === value ? '' : opt.value);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === opt.value ? "opacity-100" : "opacity-0")} />
                  <div>
                    <span>{opt.label}</span>
                    {opt.sublabel && <span className="ml-2 text-xs text-muted-foreground">{opt.sublabel}</span>}
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
