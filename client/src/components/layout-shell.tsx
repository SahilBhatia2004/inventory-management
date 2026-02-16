import { Link, useLocation } from "wouter";
import { LayoutDashboard, ClipboardList, Package, Database, BarChart3, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Daily Register", href: "/register", icon: ClipboardList },
    { name: "Inventory", href: "/inventory", icon: Package },
    { name: "Items Master", href: "/items", icon: Database },
    { name: "Reports", href: "/reports", icon: BarChart3 },
  ];

  const NavContent = () => (
    <div className="flex flex-col gap-2 py-4">
      <div className="px-3 py-2">
        <h2 className="mb-2 px-4 text-xl font-bold tracking-tight font-heading text-primary">
          HAVALDAR
        </h2>
        <p className="px-4 text-sm text-muted-foreground">Unit Inventory System</p>
      </div>
      <nav className="grid gap-1 px-2">
        {navigation.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.name} href={item.href}>
              <div
                className={`flex items-center gap-3 rounded-lg px-3 py-3 transition-all hover:text-primary cursor-pointer ${
                  isActive
                    ? "bg-primary text-primary-foreground hover:text-primary-foreground font-medium shadow-md shadow-primary/20"
                    : "text-muted-foreground hover:bg-muted"
                }`}
                onClick={() => setIsOpen(false)}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="sticky top-0 z-30 flex h-16 items-center border-b bg-background px-4 md:hidden">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="-ml-2">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <NavContent />
          </SheetContent>
        </Sheet>
        <span className="ml-4 text-lg font-bold font-heading">HAVALDAR</span>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden w-64 flex-col border-r bg-card/50 min-h-screen md:flex sticky top-0 h-screen">
          <NavContent />
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
          <div className="mx-auto max-w-6xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
