'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, CreditCard, TrendingUp, TrendingDown,
  Package, UtensilsCrossed, BookOpen, BarChart3, FlaskConical,
  Settings, UserCog, X, Menu,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type LucideIcon = React.ComponentType<{ className?: string }>;

interface MenuItem {
  href: string;
  label: string;
  icon: LucideIcon;
  children?: { href: string; label: string; icon: LucideIcon }[];
}

const menuItems: MenuItem[] = [
  { href: '/dashboard', label: 'Panel', icon: LayoutDashboard },
  { href: '/dashboard/personnel', label: 'Personel', icon: Users },
  {
    href: '/dashboard/finance', label: 'Finans', icon: CreditCard,
    children: [
      { href: '/dashboard/finance/revenues', label: 'Cirolar', icon: TrendingUp },
      { href: '/dashboard/finance/expenses', label: 'Giderler', icon: TrendingDown },
    ],
  },
  { href: '/dashboard/inventory', label: 'Stok', icon: Package },
  { href: '/dashboard/products', label: 'Ürünler', icon: UtensilsCrossed },
  { href: '/dashboard/menu', label: 'Menü', icon: BookOpen },
  { href: '/dashboard/simulation', label: 'Simülasyon', icon: FlaskConical },
  { href: '/dashboard/reports', label: 'Raporlar', icon: BarChart3 },
];

const bottomItems: MenuItem[] = [
  { href: '/dashboard/settings', label: 'Ayarlar', icon: Settings },
  { href: '/dashboard/users', label: 'Kullanıcılar', icon: UserCog },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
  desktopOpen?: boolean;
  onDesktopClose?: () => void;
}

function NavItem({ item, pathname, onClick }: { item: MenuItem; pathname: string; onClick?: () => void }) {
  const isActive =
    pathname === item.href ||
    (item.href !== '/dashboard' && pathname.startsWith(item.href));

  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = hasChildren && pathname.startsWith(item.href);
  const Icon = item.icon;

  return (
    <div>
      <Button
        variant="ghost"
        className={cn(
          'w-full justify-start gap-3 text-sm font-medium',
          isActive
            ? 'bg-sidebar-accent text-sidebar-accent-foreground border-l-4 border-sidebar-border rounded-l-none translate-x-1 shadow-xs font-bold'
            : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
        )}
        asChild
      >
        <Link href={item.href} onClick={onClick}>
          <Icon className="size-5" />
          {item.label}
        </Link>
      </Button>
      {isExpanded && item.children && (
        <div className="ml-6 mt-0.5 space-y-0.5 border-l-2 border-sidebar-border/40 pl-2">
          {item.children.map((child) => {
            const childActive = pathname === child.href || pathname.startsWith(child.href + '/');
            const ChildIcon = child.icon;
            return (
              <Button
                key={child.href}
                variant="ghost"
                className={cn(
                  'w-full justify-start gap-2.5 text-xs font-medium',
                  childActive
                    ? 'text-sidebar-foreground font-bold bg-sidebar-accent/60'
                    : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50',
                )}
                asChild
              >
                <Link href={child.href} onClick={onClick}>
                  <ChildIcon className="size-5" />
                  {child.label}
                </Link>
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Sidebar({ open, onClose, desktopOpen = true, onDesktopClose }: SidebarProps) {
  const pathname = usePathname();

  const logoArea = (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sidebar-foreground flex items-center justify-center text-sidebar">
            <UtensilsCrossed className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-sidebar-foreground leading-tight">HepYonet</h1>
            <p className="text-[10px] uppercase tracking-widest text-sidebar-foreground/60 font-semibold">Restoran Yönetimi</p>
          </div>
        </div>
      </div>
    </div>
  );

  const navContent = (
    <>
      <nav className="mt-4 flex-1 px-2 space-y-0.5 overflow-y-auto">
        {menuItems.map((item) => (
          <NavItem key={item.href} item={item} pathname={pathname} onClick={onClose} />
        ))}
      </nav>
      <div className="mt-auto px-2 pb-6 space-y-0.5">
        {bottomItems.map((item) => (
          <NavItem key={item.href} item={item} pathname={pathname} onClick={onClose} />
        ))}
      </div>
    </>
  );

  return (
    <>
      {/* Desktop: collapsible sidebar that pushes content */}
      <aside
        className={cn(
          'hidden md:flex bg-sidebar h-screen sticky top-0 flex-col shrink-0 font-headline text-sm font-medium tracking-tight transition-all duration-300 overflow-hidden',
          desktopOpen ? 'w-64' : 'w-0',
        )}
      >
        <div className="w-64 min-w-[16rem] flex flex-col h-full">
          <div className="flex items-center justify-between pr-2">
            <div className="flex-1">{logoArea}</div>
            <button
              onClick={onDesktopClose}
              className="p-2 rounded-md hover:bg-sidebar-accent text-sidebar-foreground/60"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {navContent}
        </div>
      </aside>

      {/* Mobile: overlay */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-sidebar flex flex-col shadow-xl animate-in slide-in-from-left duration-200 font-headline text-sm font-medium tracking-tight">
            <div className="flex items-center justify-between pr-2">
              {logoArea}
              <button onClick={onClose} className="p-2 rounded-md hover:bg-sidebar-accent text-sidebar-foreground/60">
                <X className="h-5 w-5" />
              </button>
            </div>
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}
