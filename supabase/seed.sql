-- Seed data for LOCAL development and CI only (`supabase db reset`).
-- Reference data only. Never put real people, phone numbers or emails here.

insert into public.cities (name, province) values
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
on conflict do nothing;
