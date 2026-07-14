import React from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Receipt, 
  Wallet, 
  PieChart, 
  Tags,
  BookOpen
} from "lucide-react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/transactions", label: "Transactions", icon: Receipt },
    { href: "/accounts", label: "Accounts", icon: Wallet },
    { href: "/budgets", label: "Budgets", icon: PieChart },
    { href: "/categories", label: "Categories", icon: Tags },
  ];

  return (
    <div className="min-h-screen w-full flex bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-sidebar shrink-0 hidden md:flex flex-col">
        <div className="p-6 pb-2">
          <div className="flex items-center gap-3 text-sidebar-foreground">
            <BookOpen className="w-6 h-6 text-primary" />
            <span className="font-serif text-xl tracking-tight">Ledger</span>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors
                  ${isActive 
                    ? 'bg-sidebar-primary/10 text-sidebar-primary' 
                    : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                  }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="h-16 border-b border-border bg-background flex items-center justify-between px-4 md:hidden shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <span className="font-serif text-lg">Ledger</span>
          </div>
          {/* Add a simple mobile menu or just rely on responsive design for now */}
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-5xl mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
