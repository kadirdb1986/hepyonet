'use client';

import { useAuth } from '@/hooks/use-auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, ChevronDown } from 'lucide-react';

interface HeaderProps {
  onMenuToggle?: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { user, activeMembership, switchRestaurant, logout } = useAuth();
  const memberships = user?.memberships.filter((m) => m.restaurantStatus === 'APPROVED') || [];

  return (
    <header className="h-16 flex justify-between items-center px-6 sticky top-0 z-10 bg-slate-50/80 backdrop-blur-md shadow-sm font-headline">
      <div className="flex items-center gap-4">
        {/* Mobile hamburger */}
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="p-2 -ml-2 rounded-md hover:bg-slate-100 md:hidden"
          >
            <span className="material-symbols-outlined text-slate-600">menu</span>
          </button>
        )}

        {/* Search input */}
        <div className="relative hidden md:block">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#70787d] text-xl">search</span>
          <input
            className="pl-10 pr-4 py-2 bg-white/40 backdrop-blur-sm border border-[#bfc8cc]/30 rounded-full w-64 focus:ring-2 focus:ring-[#004253]/20 text-sm outline-none placeholder:text-[#70787d]"
            placeholder="Ara..."
            type="text"
          />
        </div>

        {/* Separator */}
        <div className="hidden md:block h-8 w-[1px] bg-[#bfc8cc]/30" />

        {/* Restaurant switcher */}
        {memberships.length > 1 ? (
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-1.5 text-sm text-teal-900 font-semibold font-[family-name:var(--font-manrope)] hover:text-teal-800 outline-none border-b-2 border-teal-900 pb-1">
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
          <span className="text-sm text-teal-900 font-semibold font-[family-name:var(--font-manrope)] border-b-2 border-teal-900 pb-1 hidden md:inline">
            {activeMembership?.restaurantName}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Notification bell */}
        <button className="p-2 rounded-full hover:bg-slate-100 relative">
          <span className="material-symbols-outlined text-[#70787d] text-xl">notifications</span>
        </button>

        {/* Separator */}
        <div className="h-8 w-[1px] bg-[#bfc8cc]/30" />

        {/* User profile with logout dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center gap-3 outline-none cursor-pointer">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-[#191c1d]">{user?.name}</p>
              <p className="text-[10px] text-[#70787d]">
                {activeMembership?.role === 'OWNER' ? 'Yönetici' : activeMembership?.role}
              </p>
            </div>
            <div className="w-9 h-9 rounded-full bg-[#d4e6e9] flex items-center justify-center text-[#004253] font-bold text-sm">
              {user?.name?.charAt(0)}
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={logout} className="text-red-600">
              <LogOut className="h-4 w-4 mr-2" />
              Çıkış Yap
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
