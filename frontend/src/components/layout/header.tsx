'use client';

import { useAuth } from '@/hooks/use-auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, ChevronDown, Menu, Search, Bell } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Sahip',
  ADMIN: 'Yönetici',
  ACCOUNTANT: 'Muhasebe',
  HR: 'İnsan Kaynakları',
  STOCK_MANAGER: 'Depocu',
  MENU_MANAGER: 'Menü Yöneticisi',
  WAITER: 'Garson',
};

interface HeaderProps {
  onMenuToggle?: () => void;
  onDesktopMenuToggle?: () => void;
  desktopSidebarOpen?: boolean;
}

export function Header({ onMenuToggle, onDesktopMenuToggle, desktopSidebarOpen }: HeaderProps) {
  const { user, activeMembership, switchRestaurant, logout } = useAuth();
  const memberships = user?.memberships.filter((m) => m.restaurantStatus === 'APPROVED') || [];

  return (
    <header className="h-16 flex justify-between items-center px-6 sticky top-0 z-10 bg-muted/80 backdrop-blur-md shadow-xs font-headline">
      <div className="flex items-center gap-4">
        {/* Mobile hamburger */}
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="p-2 -ml-2 rounded-md hover:bg-muted md:hidden"
          >
            <Menu className="size-5 text-muted-foreground" />
          </button>
        )}

        {/* Desktop hamburger - shown when sidebar is closed */}
        {onDesktopMenuToggle && !desktopSidebarOpen && (
          <button
            onClick={onDesktopMenuToggle}
            className="p-2 -ml-2 rounded-md hover:bg-muted hidden md:flex"
          >
            <Menu className="size-5 text-muted-foreground" />
          </button>
        )}

        {/* Search input */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
          <input
            className="pl-10 pr-4 py-2 bg-background/40 backdrop-blur-sm border border-border/30 rounded-full w-64 focus:ring-2 focus:ring-primary/20 text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Ara..."
            type="text"
          />
        </div>

        {/* Separator */}
        <div className="hidden md:block h-8 w-[1px] bg-border/30" />

        {/* Restaurant switcher */}
        {memberships.length > 1 ? (
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-1.5 text-sm text-foreground font-semibold font-[family-name:var(--font-manrope)] hover:text-foreground/80 outline-none border-b-2 border-primary pb-1">
              <span className="truncate max-w-[200px]">{activeMembership?.restaurantName}</span>
              <ChevronDown className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {memberships.map((m) => (
                <DropdownMenuItem
                  key={m.restaurantId}
                  onClick={() => switchRestaurant(m.restaurantId)}
                  className={m.restaurantId === activeMembership?.restaurantId ? 'bg-accent' : ''}
                >
                  {m.restaurantName}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <span className="text-sm text-foreground font-semibold font-[family-name:var(--font-manrope)] border-b-2 border-primary pb-1 hidden md:inline">
            {activeMembership?.restaurantName}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Notification bell */}
        <button className="p-2 rounded-full hover:bg-muted relative">
          <Bell className="size-5 text-muted-foreground" />
        </button>

        {/* Separator */}
        <div className="h-8 w-[1px] bg-border/30" />

        {/* User profile with logout dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center gap-3 outline-none cursor-pointer">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-foreground">{user?.name}</p>
              <p className="text-[10px] text-muted-foreground">
                {activeMembership?.role ? ROLE_LABELS[activeMembership.role] || activeMembership.role : ''}
              </p>
            </div>
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
              {user?.name?.charAt(0)}
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={logout} className="text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Çıkış Yap
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
