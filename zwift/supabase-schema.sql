create table inventory (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  sku text not null unique,
  category text not null,
  quantity integer not null default 0,
  threshold integer not null default 10,
  price decimal(10, 2) not null,
  last_updated timestamp with time zone default now()
);

-- Add some sample data
insert into inventory (name, sku, category, quantity, threshold, price) values
  ('Product A', 'SKU001', 'Electronics', 25, 10, 99.99),
  ('Product B', 'SKU002', 'Electronics', 8, 15, 149.99),
  ('Product C', 'SKU003', 'Clothing', 50, 20, 29.99),
  ('Product D', 'SKU004', 'Clothing', 5, 10, 39.99),
  ('Product E', 'SKU005', 'Home Goods', 0, 5, 19.99),
  ('Product F', 'SKU006', 'Electronics', 12, 15, 199.99);

