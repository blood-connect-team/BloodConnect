-- Reference data: supported cities (#16, used by #22).
-- A migration rather than seed.sql, so every environment (local, staging, production) gets it.
-- Idempotent: re-running does nothing for cities that already exist (case-insensitive).

insert into public.cities (name, province)
select v.name, v.province
from (values
  ('Karachi', 'Sindh'),
  ('Hyderabad', 'Sindh'),
  ('Sukkur', 'Sindh'),
  ('Lahore', 'Punjab'),
  ('Faisalabad', 'Punjab'),
  ('Rawalpindi', 'Punjab'),
  ('Multan', 'Punjab'),
  ('Gujranwala', 'Punjab'),
  ('Sialkot', 'Punjab'),
  ('Bahawalpur', 'Punjab'),
  ('Sargodha', 'Punjab'),
  ('Islamabad', 'Islamabad Capital Territory'),
  ('Peshawar', 'Khyber Pakhtunkhwa'),
  ('Abbottabad', 'Khyber Pakhtunkhwa'),
  ('Mardan', 'Khyber Pakhtunkhwa'),
  ('Quetta', 'Balochistan')
) as v(name, province)
where not exists (
  select 1 from public.cities c where lower(c.name) = lower(v.name)
);
