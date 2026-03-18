'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Wallet,
  Package,
  ChefHat,
  UtensilsCrossed,
  Calculator,
  BarChart3,
  Settings,
  UserCog,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
  { href: '/dashboard', label: 'Panel', icon: LayoutDashboard },
  { href: '/dashboard/personnel', label: 'Personel', icon: Users },
  { href: '/dashboard/finance', label: 'Finans', icon: Wallet },
  { href: '/dashboard/inventory', label: 'Stok', icon: Package },
  { href: '/dashboard/products', label: 'Urunler', icon: ChefHat },
  { href: '/dashboard/menu', label: 'Menu', icon: UtensilsCrossed },
  { href: '/dashboard/simulation', label: 'Simulasyon', icon: Calculator },
  { href: '/dashboard/reports', label: 'Raporlar', icon: BarChart3 },
  { href: '/dashboard/settings', label: 'Ayarlar', icon: Settings },
  { href: '/dashboard/users', label: 'Kullanicilar', icon: UserCog },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  if (!open) return null;

  const navContent = (
    <>
      <div className="p-6 border-b flex items-center justify-between">
        <h1 className="text-xl font-bold">HepYonet</h1>
        <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100">
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );

  return (
    <>
      {/* Desktop: sabit sidebar, sayfa yanına itilir */}
      <aside className="hidden md:flex w-64 border-r bg-white h-screen sticky top-0 flex-col shrink-0">
        {navContent}
      </aside>

      {/* Mobile: overlay */}
      <div className="fixed inset-0 z-50 md:hidden">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white flex flex-col shadow-xl animate-in slide-in-from-left duration-200">
          {navContent}
        </aside>
      </div>
    </>
  );
}
