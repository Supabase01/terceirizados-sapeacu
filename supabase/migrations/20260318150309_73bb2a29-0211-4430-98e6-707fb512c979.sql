
INSERT INTO public.funcao_sistema_permissoes (funcao_sistema_id, route_path, module_name, allowed)
SELECT fs.id, r.route_path, r.module_name, true
FROM public.funcoes_sistema fs
CROSS JOIN (VALUES
  ('/folha/adicionais', 'Folha de Pagamentos'),
  ('/folha/descontos', 'Folha de Pagamentos'),
  ('/admin/instituicoes', 'Administrador'),
  ('/admin/unidades', 'Administrador')
) AS r(route_path, module_name)
WHERE NOT EXISTS (
  SELECT 1 FROM public.funcao_sistema_permissoes fsp
  WHERE fsp.funcao_sistema_id = fs.id AND fsp.route_path = r.route_path
);
