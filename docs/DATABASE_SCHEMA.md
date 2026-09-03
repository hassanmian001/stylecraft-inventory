# Suggested Database Schema

Use SQLite with Drizzle ORM.

## products

- id
- name
- sku
- category_id
- purchase_price
- selling_price
- current_stock
- low_stock_threshold
- is_active
- created_at
- updated_at

## categories

- id
- name
- created_at
- updated_at

## suppliers

- id
- name
- phone
- email
- address
- notes
- created_at
- updated_at

## customers

- id
- name
- phone
- email
- address
- notes
- created_at
- updated_at

## purchases

- id
- supplier_id
- purchase_date
- total_amount
- notes
- created_at
- updated_at

## purchase_items

- id
- purchase_id
- product_id
- quantity
- unit_cost
- total_cost
- created_at

## sales

- id
- invoice_number
- customer_id
- sale_date
- subtotal
- discount_amount
- total_amount
- profit_amount
- payment_method
- notes
- created_at
- updated_at

## sale_items

- id
- sale_id
- product_id
- quantity
- unit_price
- unit_cost
- discount_amount
- total_amount
- profit_amount
- created_at

## stock_movements

- id
- product_id
- movement_type
- reference_type
- reference_id
- quantity_change
- stock_before
- stock_after
- notes
- created_at

Movement types:

- purchase
- sale
- adjustment
- return

## settings

- key
- value
- updated_at

## Transaction Rules

Purchases:

1. Insert purchase.
2. Insert purchase items.
3. Increase product current_stock.
4. Insert stock_movements.
5. Commit transaction.

Sales:

1. Check available stock.
2. Insert sale.
3. Insert sale items.
4. Decrease product current_stock.
5. Insert stock_movements.
6. Commit transaction.

If any step fails, roll back the transaction.

