'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';
import { LayoutDashboard, Store, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const adminMenuItems = [
  { href: '/admin', label: 'Istatistikler', icon: LayoutDashboard },
  { href: '/admin/restaurants', label: 'Restoranlar', icon: Store },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const { logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    if (!isLoginPage && !isLoading && !isAuthenticated) {
      router.push('/admin/login');
    }
  }, [isAuthenticated, isLoading, router, isLoginPage]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted text-foreground">
        <p>Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-muted">
      <aside className="w-64 border-r border bg-background h-screen sticky top-0 flex flex-col">
        <div className="p-6 border-b border">
          <h1 className="text-xl font-bold text-foreground">HepYonet Admin</h1>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {adminMenuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border">
          <Button
            variant="ghost"
            className="w-full text-muted-foreground hover:text-foreground justify-start gap-2"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
            Çıkış Yap
          </Button>
        </div>
      </aside>
      <main className="flex-1 p-8 text-foreground">{children}</main>
    </div>
  );
}
