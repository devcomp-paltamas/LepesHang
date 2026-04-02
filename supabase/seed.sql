insert into public.provider_options (value)
values
  ('Avanova'),
  ('Udemy'),
  ('YouTube')
on conflict (value) do nothing;

insert into public.category_options (value)
values
  ('pszichológia'),
  ('kommunikáció'),
  ('önfejlesztés')
on conflict (value) do nothing;

insert into public.routine_blocks (name, mode, theme_mode)
values
  ('Reggeli séta', 'morning', 'night'),
  ('Esti önfejlesztés', 'evening', 'night');

insert into public.sources (name, provider, content_type, url, category, difficulty_level)
values
  (
    'Gazdasági pszichológia heti válogatás',
    'Avanova',
    'audio',
    'https://example.com/avanova-gazdasagi-pszichologia',
    'pszichológia',
    3
  ),
  (
    'Tárgyalástechnika mesterkurzus',
    'Udemy',
    'course',
    'https://example.com/udemy-targyalastechnika',
    'kommunikáció',
    4
  ),
  (
    'Reggeli fókusz pszichológiai alapokon',
    'YouTube',
    'video',
    'https://example.com/youtube-reggeli-fokusz',
    'önfejlesztés',
    2
  );
