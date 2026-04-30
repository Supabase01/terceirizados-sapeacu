INSERT INTO public.route_permissions (route_path, role, module_name, allowed) VALUES
  ('/relatorios/contracheque', 'admin', 'relatorios', true),
  ('/relatorios/contracheque', 'usuario', 'relatorios', true)
ON CONFLICT DO NOTHING;