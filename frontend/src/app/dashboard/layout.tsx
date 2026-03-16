'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { useAuthStore } from '@/stores/auth-store';
import { useAuth } from '@/hooks/use-auth';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import messages from '../../../messages/tr.json';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user, activeRestaurantId } = useAuthStore();
  const { checkAuth } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Yukleniyor...</p>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  // Super admin goes to admin panel
  const approvedMemberships = user?.memberships.filter((m) => m.restaurantStatus === 'APPROVED') || [];
  if (approvedMemberships.length === 0 && user?.isSuperAdmin) {
    router.push('/admin');
    return null;
  }

  // User has no approved restaurants
  if (approvedMemberships.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4 p-8">
          <h1 className="text-2xl font-bold">Hosgeldiniz!</h1>
          <p className="text-gray-500">
            {user?.memberships.length
              ? 'Restoraniniz henuz onaylanmadi. Onay sonrasi erisim saglayabilirsiniz.'
              : 'Henuz bir restorana bagli degilsiniz. Bir restoran olusturun veya bir restoran yoneticisinden davet isteyin.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuToggle={() => setMobileMenuOpen(true)} />
        <main className="flex-1 p-3 md:p-6">
          <NextIntlClientProvider locale="tr" messages={messages}>
            {children}
          </NextIntlClientProvider>
        </main>
      </div>
    </div>
  );
}
