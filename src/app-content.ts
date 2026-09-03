export type SectionId = "dashboard" | "products" | "contacts" | "purchases" | "sales" | "returns" | "ledger" | "reports" | "settings";

export type IconName = "dashboard" | "products" | "contacts" | "purchases" | "sales" | "returns" | "ledger" | "reports" | "settings" | "chart" | "stock";

export type Section = {
  id: SectionId;
  label: string;
  description: string;
  icon: IconName;
};

export type ModuleCard = {
  title: string;
  description: string;
  icon: IconName;
};

export const sections: Section[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    description: "Snapshot cards and business alerts will appear here.",
    icon: "dashboard",
  },
  {
    id: "products",
    label: "Products",
    description: "Product list, stock levels, and low-stock thresholds will be managed here.",
    icon: "products",
  },
  {
    id: "contacts",
    label: "Contacts",
    description: "Customers and suppliers can be managed here for sales and purchases.",
    icon: "contacts",
  },
  {
    id: "purchases",
    label: "Purchases",
    description: "Supplier purchases and stock increases will be recorded here.",
    icon: "purchases",
  },
  {
    id: "sales",
    label: "Sales",
    description: "Customer sales, invoices, and stock decreases will be handled here.",
    icon: "sales",
  },
  {
    id: "returns",
    label: "Returns",
    description: "Sales and purchase returns will adjust stock and preserve transaction history.",
    icon: "returns",
  },
  {
    id: "ledger",
    label: "Ledger",
    description: "Customer and supplier khata: who owes what, and every payment against it.",
    icon: "ledger",
  },
  {
    id: "reports",
    label: "Reports",
    description: "Sales, purchase, stock, and profit reports will be available here.",
    icon: "reports",
  },
  {
    id: "settings",
    label: "Settings",
    description: "Business details, invoice settings, and backup preferences will live here.",
    icon: "settings",
  },
];

export const moduleCards: Record<SectionId, ModuleCard[]> = {
  dashboard: [
    {
      title: "Inventory snapshot",
      description: "Soon this will show product count, stock quantity, and inventory value.",
      icon: "chart",
    },
    {
      title: "Low-stock watchlist",
      description: "Items below their alert threshold will be highlighted for quick restocking.",
      icon: "stock",
    },
    {
      title: "Sales and profit pulse",
      description: "Daily and monthly sales totals will appear once sales records are added.",
      icon: "sales",
    },
  ],
  products: [
    {
      title: "Product catalog",
      description: "Add each item with name, SKU, category, prices, and active status.",
      icon: "products",
    },
    {
      title: "Stock thresholds",
      description: "Set low-stock quantities so the dashboard can flag products that need attention.",
      icon: "stock",
    },
    {
      title: "Search and filters",
      description: "Find products by name or SKU and narrow the list by category or stock status.",
      icon: "reports",
    },
  ],
  contacts: [
    {
      title: "Customer directory",
      description: "Store customer names, phone numbers, email addresses, and notes for repeat sales.",
      icon: "contacts",
    },
    {
      title: "Supplier directory",
      description: "Maintain supplier contact details used when recording purchases.",
      icon: "purchases",
    },
    {
      title: "Quick search",
      description: "Find contacts by name, phone, email, address, or notes.",
      icon: "reports",
    },
  ],
  purchases: [
    {
      title: "Supplier purchases",
      description: "Record incoming stock with supplier, date, quantity, cost, and notes.",
      icon: "purchases",
    },
    {
      title: "Automatic stock increase",
      description: "Each completed purchase will increase stock in a database transaction.",
      icon: "stock",
    },
    {
      title: "Movement history",
      description: "Every purchase will create a stock movement record for traceability.",
      icon: "reports",
    },
  ],
  sales: [
    {
      title: "Sale entry",
      description: "Choose products, quantities, optional customer details, discounts, and payment method.",
      icon: "sales",
    },
    {
      title: "Oversell protection",
      description: "Sales will be blocked when quantity is greater than available stock.",
      icon: "stock",
    },
    {
      title: "Profit calculation",
      description: "Profit will be calculated from selling price minus purchase cost for each sale.",
      icon: "chart",
    },
  ],
  returns: [
    {
      title: "Sales returns",
      description: "Customer returns increase stock and record refund totals against the original sale.",
      icon: "returns",
    },
    {
      title: "Purchase returns",
      description: "Supplier returns decrease stock while preventing negative stock levels.",
      icon: "purchases",
    },
    {
      title: "Audit trail",
      description: "Every return creates stock movement and audit records for traceability.",
      icon: "reports",
    },
  ],
  ledger: [
    {
      title: "Customer khata",
      description: "Outstanding balance per customer with a running statement.",
      icon: "ledger",
    },
    {
      title: "Supplier khata",
      description: "What the shop still owes each supplier.",
      icon: "ledger",
    },
    {
      title: "Payments",
      description: "Record money received or paid against an outstanding balance.",
      icon: "ledger",
    },
  ],
  reports: [
    {
      title: "Sales report",
      description: "Review sales by date range with totals that match the source records.",
      icon: "sales",
    },
    {
      title: "Stock report",
      description: "See current quantities, low-stock products, and inventory value.",
      icon: "stock",
    },
    {
      title: "Export-ready data",
      description: "PDF and Excel exports will be added after reports are backed by real records.",
      icon: "reports",
    },
  ],
  settings: [
    {
      title: "Business profile",
      description: "Store business name, contact details, address, and currency symbol.",
      icon: "settings",
    },
    {
      title: "Invoice defaults",
      description: "Configure invoice prefix and business details used on printable invoices.",
      icon: "reports",
    },
    {
      title: "Backup location",
      description: "Choose where local backups are saved, create manual backups, and restore from backup files.",
      icon: "purchases",
    },
  ],
};
