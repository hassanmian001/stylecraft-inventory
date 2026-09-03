# Milestone 1 Project Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first `prd.json` milestone: an Electron + React + TypeScript desktop scaffold with Tailwind, shadcn/ui-compatible structure, and sidebar placeholder navigation.

**Architecture:** Use Vite for the React renderer and a small Electron main process that loads the Vite dev server in development or `dist/index.html` after build. Keep navigation as local React state because milestone 1 only needs placeholder screens.

**Tech Stack:** Electron, React, TypeScript, Vite, Tailwind CSS, shadcn/ui-compatible config, npm scripts.

## Global Constraints

- Build strict milestone 1 only from `prd.json`.
- Do not add SQLite, Drizzle, migrations, database files, or Products CRUD in this milestone.
- The app must start locally with a desktop window.
- The main layout must render without errors.
- Placeholder Dashboard, Products, Purchases, Sales, Reports, and Settings sections must be reachable from the sidebar.
- The workspace is currently not a git repository; commit steps should be skipped unless git is initialized before execution.

---

## File Structure

- Create `package.json`: project metadata, runtime dependencies, dev dependencies, and scripts.
- Create `index.html`: Vite renderer entry document.
- Create `vite.config.ts`: Vite React config and path alias.
- Create `tsconfig.json`: base TypeScript settings for renderer and config files.
- Create `tsconfig.node.json`: TypeScript settings for Electron main build output.
- Create `tailwind.config.ts`: Tailwind content scanning and theme setup.
- Create `postcss.config.js`: Tailwind and Autoprefixer PostCSS plugins.
- Create `components.json`: shadcn/ui-compatible project configuration.
- Create `electron/main.ts`: Electron app lifecycle and BrowserWindow creation.
- Create `src/main.tsx`: React renderer entry.
- Create `src/App.tsx`: app shell and navigation state.
- Create `src/index.css`: Tailwind layers and base theme tokens.
- Create `src/components/ui/button.tsx`: minimal shadcn-style button component used by the sidebar.
- Create `src/lib/utils.ts`: `cn()` class name utility.
- Modify `.gitignore`: ignore dependency, build, log, and local environment outputs.
- Modify `README.md`: add milestone 1 development commands.

---

### Task 1: Project Package And Tooling Config

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: no code from earlier tasks.
- Produces: npm scripts `dev`, `dev:renderer`, `dev:electron`, `build`, `build:renderer`, `build:electron`, and path alias `@/*` for later tasks.

- [ ] **Step 1: Create `package.json`**

Create `package.json` with this exact content:

```json
{
  "name": "stylecraft-inventory-management",
  "version": "0.1.0",
  "description": "Windows desktop inventory management software for StyleCraft.",
  "main": "dist-electron/main.js",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "concurrently -k \"npm:dev:renderer\" \"npm:dev:electron\"",
    "dev:renderer": "vite --host 127.0.0.1",
    "dev:electron": "wait-on tcp:5173 && npm run build:electron && electron .",
    "build": "npm run build:renderer && npm run build:electron",
    "build:renderer": "vite build",
    "build:electron": "tsc -p tsconfig.node.json",
    "preview": "npm run build && electron ."
  },
  "dependencies": {
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^0.468.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "tailwind-merge": "^2.6.0"
  },
  "devDependencies": {
    "@types/node": "^22.10.2",
    "@types/react": "^18.3.17",
    "@types/react-dom": "^18.3.5",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "concurrently": "^9.1.0",
    "electron": "^33.2.1",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.7.2",
    "vite": "^6.0.3",
    "wait-on": "^8.0.1"
  }
}
```

- [ ] **Step 2: Create `index.html`**

Create `index.html` with this exact content:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>StyleCraft Inventory</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Create TypeScript configs**

Create `tsconfig.json` with this exact content:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2020"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src", "vite.config.ts", "tailwind.config.ts"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

Create `tsconfig.node.json` with this exact content:

```json
{
  "compilerOptions": {
    "composite": true,
    "target": "ES2020",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "outDir": "dist-electron",
    "rootDir": "electron",
    "types": ["node"]
  },
  "include": ["electron"]
}
```

- [ ] **Step 4: Create `vite.config.ts`**

Create `vite.config.ts` with this exact content:

```ts
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 5: Update `.gitignore`**

Replace or extend `.gitignore` so it includes these lines:

```gitignore
node_modules/
dist/
dist-electron/
*.local
.env
.env.*
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
```

- [ ] **Step 6: Install dependencies**

Run:

```powershell
npm install
```

Expected: npm creates `package-lock.json` and exits with code 0. Warnings about package funding or moderate audit findings do not fail this milestone.

- [ ] **Step 7: Verify config task build is not ready yet**

Run:

```powershell
npm run build
```

Expected: FAIL because `electron/main.ts` and `src/main.tsx` do not exist yet. This confirms Task 1 alone does not claim the full milestone.

- [ ] **Step 8: Commit or skip**

Run:

```powershell
git rev-parse --is-inside-work-tree
```

Expected in this workspace: FAIL with `fatal: not a git repository`. Skip the commit. If git has been initialized, commit with:

```powershell
git add package.json package-lock.json index.html vite.config.ts tsconfig.json tsconfig.node.json .gitignore
git commit -m "chore: add project tooling scaffold"
```

---

### Task 2: Electron Main Process

**Files:**
- Create: `electron/main.ts`

**Interfaces:**
- Consumes: `package.json` script `build:electron`, Electron package, and `dist-electron/main.js` main entry.
- Produces: Electron app lifecycle that opens a `BrowserWindow` and loads `http://127.0.0.1:5173` in development or `dist/index.html` in production.

- [ ] **Step 1: Create `electron/main.ts`**

Create `electron/main.ts` with this exact content:

```ts
import { app, BrowserWindow } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const devServerUrl = process.env.VITE_DEV_SERVER_URL ?? "http://127.0.0.1:5173";
const isDevelopment = !app.isPackaged;

function createWindow() {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    title: "StyleCraft Inventory",
    backgroundColor: "#f8fafc",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDevelopment) {
    void window.loadURL(devServerUrl);
    window.webContents.openDevTools({ mode: "detach" });
    return;
  }

  void window.loadFile(path.join(__dirname, "../dist/index.html"));
}

void app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
```

- [ ] **Step 2: Build Electron main process**

Run:

```powershell
npm run build:electron
```

Expected: PASS and `dist-electron/main.js` is created.

- [ ] **Step 3: Commit or skip**

Run:

```powershell
git rev-parse --is-inside-work-tree
```

Expected in this workspace: FAIL with `fatal: not a git repository`. Skip the commit. If git has been initialized, commit with:

```powershell
git add electron/main.ts dist-electron/.gitkeep
git commit -m "feat: add electron main process"
```

Do not create or stage `dist-electron/main.js`; it is ignored build output.

---

### Task 3: Tailwind And shadcn-Compatible UI Foundation

**Files:**
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Create: `components.json`
- Create: `src/index.css`
- Create: `src/lib/utils.ts`
- Create: `src/components/ui/button.tsx`

**Interfaces:**
- Consumes: TypeScript alias `@/*` from Task 1.
- Produces: `cn(...inputs: ClassValue[]): string` and `Button` React component for Task 4.

- [ ] **Step 1: Create Tailwind and PostCSS config**

Create `tailwind.config.ts` with this exact content:

```ts
import type { Config } from "tailwindcss";

const config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
      },
    },
  },
  plugins: [],
} satisfies Config;

export default config;
```

Create `postcss.config.js` with this exact content:

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 2: Create shadcn-compatible config**

Create `components.json` with this exact content:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/index.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

- [ ] **Step 3: Create base CSS**

Create `src/index.css` with this exact content:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 210 40% 98%;
    --foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --radius: 0.75rem;
  }

  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground antialiased;
    margin: 0;
    min-width: 320px;
    min-height: 100vh;
    font-family:
      Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  button {
    font: inherit;
  }
}
```

- [ ] **Step 4: Create utility and button component**

Create `src/lib/utils.ts` with this exact content:

```ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Create `src/components/ui/button.tsx` with this exact content:

```tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        ghost: "hover:bg-muted hover:text-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  ),
);

Button.displayName = "Button";
```

- [ ] **Step 5: Build renderer to verify CSS/component config is ready for React entry**

Run:

```powershell
npm run build:renderer
```

Expected: FAIL because `src/main.tsx` does not exist yet. There should be no Tailwind config parse error.

- [ ] **Step 6: Commit or skip**

Run:

```powershell
git rev-parse --is-inside-work-tree
```

Expected in this workspace: FAIL with `fatal: not a git repository`. Skip the commit. If git has been initialized, commit with:

```powershell
git add tailwind.config.ts postcss.config.js components.json src/index.css src/lib/utils.ts src/components/ui/button.tsx
git commit -m "feat: add tailwind ui foundation"
```

---

### Task 4: React App Shell And Placeholder Navigation

**Files:**
- Create: `src/main.tsx`
- Create: `src/App.tsx`

**Interfaces:**
- Consumes: `Button` from `@/components/ui/button` and `src/index.css` from Task 3.
- Produces: a renderer app with Dashboard, Products, Purchases, Sales, Reports, and Settings placeholders reachable from the sidebar.

- [ ] **Step 1: Create React renderer entry**

Create `src/main.tsx` with this exact content:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 2: Create app shell**

Create `src/App.tsx` with this exact content:

```tsx
import { BarChart3, Boxes, FileText, LayoutDashboard, Settings, ShoppingCart, Truck } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SectionId = "dashboard" | "products" | "purchases" | "sales" | "reports" | "settings";

type Section = {
  id: SectionId;
  label: string;
  description: string;
  icon: typeof LayoutDashboard;
};

const sections: Section[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    description: "Snapshot cards and business alerts will appear here.",
    icon: LayoutDashboard,
  },
  {
    id: "products",
    label: "Products",
    description: "Product list, stock levels, and low-stock thresholds will be managed here.",
    icon: Boxes,
  },
  {
    id: "purchases",
    label: "Purchases",
    description: "Supplier purchases and stock increases will be recorded here.",
    icon: Truck,
  },
  {
    id: "sales",
    label: "Sales",
    description: "Customer sales, invoices, and stock decreases will be handled here.",
    icon: ShoppingCart,
  },
  {
    id: "reports",
    label: "Reports",
    description: "Sales, purchase, stock, and profit reports will be available here.",
    icon: FileText,
  },
  {
    id: "settings",
    label: "Settings",
    description: "Business details, invoice settings, and backup preferences will live here.",
    icon: Settings,
  },
];

export default function App() {
  const [activeSectionId, setActiveSectionId] = useState<SectionId>("dashboard");
  const activeSection = sections.find((section) => section.id === activeSectionId) ?? sections[0];
  const ActiveIcon = activeSection.icon;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <div className="flex min-h-screen flex-col md:flex-row">
        <aside className="border-b border-slate-200 bg-white p-4 md:w-72 md:border-b-0 md:border-r">
          <div className="mb-6">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">StyleCraft</div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight">Inventory</h1>
            <p className="mt-2 text-sm text-slate-500">Desktop stock control for daily business operations.</p>
          </div>

          <nav className="grid gap-2" aria-label="Main navigation">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSectionId === section.id;

              return (
                <Button
                  className={cn("justify-start gap-3", isActive && "bg-blue-600 text-white hover:bg-blue-700")}
                  key={section.id}
                  onClick={() => setActiveSectionId(section.id)}
                  size="sm"
                  type="button"
                  variant={isActive ? "default" : "ghost"}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {section.label}
                </Button>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 p-6 md:p-8">
          <section className="mx-auto max-w-5xl">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                  <ActiveIcon className="h-7 w-7" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-600">Milestone 1 placeholder</p>
                  <h2 className="mt-1 text-3xl font-bold tracking-tight">{activeSection.label}</h2>
                  <p className="mt-3 max-w-2xl text-slate-600">{activeSection.description}</p>
                </div>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 p-5">
                  <BarChart3 className="mb-4 h-5 w-5 text-blue-600" aria-hidden="true" />
                  <h3 className="font-semibold">Ready for modules</h3>
                  <p className="mt-2 text-sm text-slate-500">Future milestones will replace these placeholders with real workflows.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-5">
                  <Boxes className="mb-4 h-5 w-5 text-blue-600" aria-hidden="true" />
                  <h3 className="font-semibold">Stock-first design</h3>
                  <p className="mt-2 text-sm text-slate-500">Purchases, sales, and stock movement rules will be added incrementally.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-5">
                  <Settings className="mb-4 h-5 w-5 text-blue-600" aria-hidden="true" />
                  <h3 className="font-semibold">Local desktop app</h3>
                  <p className="mt-2 text-sm text-slate-500">This scaffold runs as an Electron app on Windows during development.</p>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Build renderer**

Run:

```powershell
npm run build:renderer
```

Expected: PASS and `dist/` is created.

- [ ] **Step 4: Build all project outputs**

Run:

```powershell
npm run build
```

Expected: PASS. `dist/` and `dist-electron/main.js` exist.

- [ ] **Step 5: Commit or skip**

Run:

```powershell
git rev-parse --is-inside-work-tree
```

Expected in this workspace: FAIL with `fatal: not a git repository`. Skip the commit. If git has been initialized, commit with:

```powershell
git add src/main.tsx src/App.tsx
git commit -m "feat: add milestone one app shell"
```

---

### Task 5: Documentation And Milestone Verification

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: npm scripts from Task 1 and working app from Tasks 2-4.
- Produces: documented local development commands and verified milestone 1 acceptance criteria.

- [ ] **Step 1: Update README**

Replace `README.md` with this exact content:

```md
# StyleCraft Inventory Management Software

Desktop inventory management software for a small business with around 50 products.

## Current State

Milestone 1 is the active build target: Electron + React + TypeScript scaffold with Tailwind CSS, shadcn/ui-compatible structure, and placeholder app navigation.

## Development

Install dependencies:

```powershell
npm install
```

Start the local desktop app:

```powershell
npm run dev
```

Build renderer and Electron main process:

```powershell
npm run build
```

Preview the built app:

```powershell
npm run preview
```

## Planned Features

- Product management
- Purchase records
- Sales records
- Automatic stock updates
- Stock movement history
- Dashboard
- Profit tracking
- Invoices and receipts
- Sales, purchase, stock, and profit reports
- Excel and PDF export
- Local backup and restore
- Windows desktop packaging
```

- [ ] **Step 2: Verify production build**

Run:

```powershell
npm run build
```

Expected: PASS with no TypeScript or Vite errors.

- [ ] **Step 3: Verify desktop app startup**

Run:

```powershell
npm run dev
```

Expected: Vite starts on `http://127.0.0.1:5173`, TypeScript watch compiles `electron/main.ts`, and an Electron window opens showing the StyleCraft Inventory shell. Stop the dev process with `Ctrl+C` after verifying the window.

- [ ] **Step 4: Verify navigation manually**

In the Electron window, click these sidebar items in order:

```text
Dashboard
Products
Purchases
Sales
Reports
Settings
```

Expected: the main panel title and description change for each item, and no renderer error overlay appears.

- [ ] **Step 5: Commit or skip**

Run:

```powershell
git rev-parse --is-inside-work-tree
```

Expected in this workspace: FAIL with `fatal: not a git repository`. Skip the commit. If git has been initialized, commit with:

```powershell
git add README.md
git commit -m "docs: add milestone one development commands"
```

## Self-Review Notes

- Spec coverage: the plan creates Electron, React, TypeScript, Tailwind, shadcn-compatible config, app shell/sidebar, and all placeholder sections required by `prd.json` milestone 1.
- Scope check: SQLite, Drizzle, products persistence, and business workflows are explicitly out of scope and are not included in any task.
- Placeholder scan: this plan contains no `TBD` or unspecified implementation steps; expected failures are intentional task boundaries.
- Type consistency: `Button`, `cn`, `SectionId`, and app imports are defined before use by later tasks.
