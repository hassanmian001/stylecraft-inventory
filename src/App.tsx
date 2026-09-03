import { BarChart3, Boxes, FileText, LayoutDashboard, Moon, NotebookText, RotateCcw, Settings, ShoppingCart, Sun, Truck, Users } from "lucide-react";
import { useState } from "react";

import { moduleCards, sections, type IconName, type SectionId } from "@/app-content";
import ContactsScreen from "@/components/contacts/ContactsScreen";
import DashboardScreen from "@/components/dashboard/DashboardScreen";
import LedgerScreen from "@/components/ledger/LedgerScreen";
import ProductsScreen from "@/components/products/ProductsScreen";
import PurchasesScreen from "@/components/purchases/PurchasesScreen";
import ReportsScreen from "@/components/reports/ReportsScreen";
import ReturnsScreen from "@/components/returns/ReturnsScreen";
import SalesScreen from "@/components/sales/SalesScreen";
import SettingsScreen from "@/components/settings/SettingsScreen";
import { Button } from "@/components/ui/button";
import { styleCraftLogoDataUri } from "@/lib/branding";
import { useTheme } from "@/lib/use-theme";
import { cn } from "@/lib/utils";

const icons = {
  chart: BarChart3,
  contacts: Users,
  dashboard: LayoutDashboard,
  ledger: NotebookText,
  products: Boxes,
  purchases: Truck,
  reports: FileText,
  returns: RotateCcw,
  sales: ShoppingCart,
  settings: Settings,
  stock: Boxes,
} satisfies Record<IconName, typeof LayoutDashboard>;

export default function App() {
  const [activeSectionId, setActiveSectionId] = useState<SectionId>("dashboard");
  const { resolvedTheme, toggle: toggleTheme } = useTheme();
  const activeSection = sections.find((section) => section.id === activeSectionId) ?? sections[0];
  const ActiveIcon = icons[activeSection.icon];
  const activeCards = moduleCards[activeSection.id];

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-950 dark:text-slate-50">
      <div className="flex min-h-screen flex-col md:flex-row">
        <aside className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 md:w-72 md:border-b-0 md:border-r">
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <img alt="StyleCraft logo" className="h-12 w-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1" src={styleCraftLogoDataUri} />
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600 dark:text-blue-400">StyleCraft</div>
                <h1 className="mt-1 text-2xl font-bold tracking-tight">Inventory</h1>
              </div>
            </div>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Desktop stock control for daily business operations.</p>
          </div>

          <nav className="grid gap-2" aria-label="Main navigation">
            {sections.map((section) => {
              const Icon = icons[section.icon];
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

          <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-4">
            <Button
              aria-label={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="w-full justify-start gap-3"
              onClick={toggleTheme}
              size="sm"
              type="button"
              variant="ghost"
            >
              {resolvedTheme === "dark" ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
              {resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
            </Button>
          </div>
        </aside>

        <main className="flex-1 p-6 md:p-8">
          <section className="mx-auto max-w-5xl">
            <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm md:p-8">
              {activeSection.id === "dashboard" ? (
                <DashboardScreen />
              ) : activeSection.id === "products" ? (
                <ProductsScreen />
              ) : activeSection.id === "contacts" ? (
                <ContactsScreen />
              ) : activeSection.id === "purchases" ? (
                <PurchasesScreen />
              ) : activeSection.id === "sales" ? (
                <SalesScreen />
              ) : activeSection.id === "returns" ? (
                <ReturnsScreen />
              ) : activeSection.id === "ledger" ? (
                <LedgerScreen />
              ) : activeSection.id === "reports" ? (
                <ReportsScreen />
              ) : activeSection.id === "settings" ? (
                <SettingsScreen />
              ) : (
                <>
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-blue-50 dark:bg-blue-950/40 p-3 text-blue-600 dark:text-blue-400">
                  <ActiveIcon className="h-7 w-7" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Milestone 1 placeholder</p>
                  <h2 className="mt-1 text-3xl font-bold tracking-tight">{activeSection.label}</h2>
                  <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">{activeSection.description}</p>
                </div>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {activeCards.map((card) => {
                  const CardIcon = icons[card.icon];

                  return (
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-5" key={card.title}>
                      <CardIcon className="mb-4 h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                      <h3 className="font-semibold">{card.title}</h3>
                      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{card.description}</p>
                    </div>
                  );
                })}
              </div>
                </>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
