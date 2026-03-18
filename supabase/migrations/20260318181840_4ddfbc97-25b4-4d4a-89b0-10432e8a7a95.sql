
ALTER TABLE public.colaboradores
  ADD COLUMN endereco text,
  ADD COLUMN numero text,
  ADD COLUMN complemento text,
  ADD COLUMN bairro text,
  ADD COLUMN cidade_id uuid REFERENCES public.cidades(id),
  ADD COLUMN cep text;
