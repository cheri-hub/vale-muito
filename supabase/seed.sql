insert into public.tags (slug, label) values
  ('bem-servido', 'Bem servido'),
  ('barato', 'Barato'),
  ('especial', 'Especial'),
  ('conforto', 'Conforto')
on conflict (slug) do nothing;