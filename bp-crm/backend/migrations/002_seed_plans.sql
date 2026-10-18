INSERT INTO plans (code, name, max_users, max_customers, max_invoices_per_month, features) VALUES
  ('starter',  'Starter',  3,    200,  100,  JSON_OBJECT('exports', false, 'investments', true)),
  ('growth',   'Growth',   15,   5000, 2000, JSON_OBJECT('exports', true,  'investments', true)),
  ('business', 'Business', NULL, NULL, NULL, JSON_OBJECT('exports', true,  'investments', true));
