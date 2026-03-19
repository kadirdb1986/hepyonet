'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
  { href: '/dashboard', label: 'Panel', icon: 'dashboard' },
  { href: '/dashboard/personnel', label: 'Personel', icon: 'group' },
  { href: '/dashboard/finance', label: 'Finans', icon: 'payments' },
  { href: '/dashboard/inventory', label: 'Stok', icon: 'inventory_2' },
  { href: '/dashboard/products', label: 'Ürünler', icon: 'fastfood' },
  { href: '/dashboard/menu', label: 'Menü', icon: 'restaurant_menu' },
  { href: '/dashboard/simulation', label: 'Simülasyon', icon: 'analytics' },
  { href: '/dashboard/reports', label: 'Raporlar', icon: 'assessment' },
];

const bottomItems = [
  { href: '/dashboard/settings', label: 'Ayarlar', icon: 'settings' },
  { href: '/dashboard/users', label: 'Kullanıcılar', icon: 'manage_accounts' },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

function NavItem({ item, pathname, onClick }: { item: typeof menuItems[0]; pathname: string; onClick?: () => void }) {
  const isActive =
    pathname === item.href ||
    (item.href !== '/dashboard' && pathname.startsWith(item.href));

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-md text-sm transition-all duration-150',
        isActive
          ? 'bg-white text-teal-900 border-l-4 border-teal-900 font-bold shadow-sm rounded-l-none translate-x-1'
          : 'text-slate-500 hover:text-teal-800 hover:bg-slate-200/50',
      )}
    >
      <span
        className="material-symbols-outlined text-xl"
        style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
      >
        {item.icon}
      </span>
      {item.label}
    </Link>
  );
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  const logoArea = (
    <div className="p-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#004253] flex items-center justify-center text-white">
          <span className="material-symbols-outlined text-xl">restaurant</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-teal-900 leading-tight">HepyOnet</h1>
          <p className="text-[10px] uppercase tracking-widest text-[#70787d] font-semibold">Restaurant Executive</p>
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
      {/* Desktop: fixed sidebar that pushes content */}
      <aside className="hidden md:flex w-64 bg-slate-100 h-screen sticky top-0 flex-col shrink-0 font-headline text-sm font-medium tracking-tight">
        {logoArea}
        {navContent}
      </aside>

      {/* Mobile: overlay */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-slate-100 flex flex-col shadow-xl animate-in slide-in-from-left duration-200 font-headline text-sm font-medium tracking-tight">
            <div className="flex items-center justify-between pr-2">
              {logoArea}
              <button onClick={onClose} className="p-2 rounded-md hover:bg-slate-200 text-slate-500">
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
