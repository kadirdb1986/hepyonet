'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { useAuthStore } from '@/stores/auth-store';
import { useAuth } from '@/hooks/use-auth';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import messages from '../../../messages/tr.json';

function CreateRestaurantScreen() {
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const { user, logout, checkAuth } = useAuth();
  const hasPending = user?.memberships.some((m) => m.restaurantStatus === 'PENDING');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await api.post('/restaurants', { name: name.trim() });
      toast.success('Restoran oluşturuldu! Onay bekleniyor.');
      await checkAuth();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Restoran oluşturulurken hata oluştu.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Hoşgeldiniz!</CardTitle>
          <CardDescription>
            {hasPending
              ? 'Restoranınız onay bekliyor. Onaylandıktan sonra erişim sağlayabilirsiniz.'
              : 'Yeni bir restoran oluşturun veya bir restoran yöneticisinden davet bekleyin.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasPending && (
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="restaurantName">Restoran Adı</Label>
                <Input
                  id="restaurantName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Örneğin: Cafe Istanbul"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={creating}>
                {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Restoran Oluştur
              </Button>
            </form>
          )}
          <Button variant="outline" className="w-full" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" />
            Çıkış Yap
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user, activeRestaurantId } = useAuthStore();
  const { checkAuth } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Yükleniyor...</p>
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

  // User has no approved restaurants - show create form
  if (approvedMemberships.length === 0) {
    return <CreateRestaurantScreen />;
  }

  return (
    <div className="flex min-h-screen bg-[#f8fafb]">
      <Sidebar
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        desktopOpen={sidebarOpen}
        onDesktopClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
          onDesktopMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          desktopSidebarOpen={sidebarOpen}
        />
        <main className="flex-1 p-3 md:p-6">
          <NextIntlClientProvider locale="tr" messages={messages}>
            {children}
          </NextIntlClientProvider>
        </main>
      </div>
    </div>
  );
}
