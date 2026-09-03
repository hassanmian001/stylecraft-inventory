# Product Requirements

## Overview

StyleCraft Inventory Management Software is a Windows desktop app for managing a small business inventory of around 50 products.

The app should be simple enough for daily use but strict enough to protect stock and financial records.

## Users

Primary user:

- Business owner or manager

Optional future user:

- Staff member with restricted access

## Core Screens

### Dashboard

Show:

- Total products
- Total stock quantity
- Total inventory value
- Today sales
- Current month sales
- Current month profit
- Low-stock products
- Best-selling products

### Products

Fields:

- Product name
- SKU/code
- Category
- Purchase price
- Selling price
- Current stock
- Low-stock alert quantity
- Active/inactive status

Actions:

- Add product
- Edit product
- Mark inactive
- Search by name or SKU
- Filter by category and low-stock status

### Purchases

Fields:

- Supplier
- Purchase date
- Product
- Quantity
- Unit purchase price
- Total cost
- Notes

Rules:

- Creating a purchase increases stock.
- Each purchase creates a stock movement.
- Purchase history must remain available.

### Sales

Fields:

- Customer, optional
- Sale date
- Product
- Quantity
- Unit selling price
- Discount, optional
- Total amount
- Payment method, optional

Rules:

- Creating a sale decreases stock.
- Do not allow selling more than available stock.
- Each sale creates a stock movement.
- Profit should be calculated from sale price minus cost.

### Invoices

Generate after sale:

- Invoice number
- Business information
- Customer information, optional
- Product line items
- Quantity, price, discount, and total
- Print or save as PDF

### Reports

Reports:

- Sales report
- Purchase report
- Profit report
- Stock report
- Low-stock report

Requirements:

- Filter by date range where relevant.
- Export to Excel.
- Export to PDF where useful.

### Backup And Restore

Actions:

- Create manual backup
- Restore from backup
- Optional automatic backup on app close

Rules:

- Backup filenames should include date and time.
- Never overwrite an existing backup without confirmation.
- Show the backup location clearly.

### Settings

Fields:

- Business name
- Phone
- Email
- Address
- Currency symbol
- Invoice prefix
- Backup location
- Default low-stock threshold

## Non-Goals For First Version

- Cloud sync
- Multi-warehouse inventory
- Barcode scanner integration
- Online store integration
- Payroll/accounting system replacement

