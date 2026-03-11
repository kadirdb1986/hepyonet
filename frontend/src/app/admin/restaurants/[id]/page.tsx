'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft } from 'lucide-react';
import api from '@/lib/api';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  address: string | null;
  phone: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  settings: Record<string, unknown> | null;
  users: { id: string; email: string; name: string; role: string; isActive: boolean }[];
}

const statusMap = {
  PENDING: { label: 'Onay Bekliyor', variant: 'secondary' as const },
  APPROVED: { label: 'Onaylandi', variant: 'default' as const },
  REJECTED: { label: 'Reddedildi', variant: 'destructive' as const },
};

const roleLabels: Record<string, string> = {
  ADMIN: 'Yonetici',
  ACCOUNTANT: 'Muhasebe',
  HR: 'Insan Kaynaklari',
  STOCK_MANAGER: 'Depocu',
  MENU_MANAGER: 'Menu Yoneticisi',
};

export default function AdminRestaurantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/restaurants').then(({ data }) => {
      const found = data.find((r: Restaurant) => r.id === params.id);
      setRestaurant(found || null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [params.id]);

  const handleStatusChange = async (status: 'APPROVED' | 'REJECTED') => {
    if (!restaurant) return;
    await api.patch(`/admin/restaurants/${restaurant.id}/approve`, { status });
    setRestaurant({ ...restaurant, status });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 text-lg">Restoran bulunamadi.</p>
        <Button variant="outline" onClick={() => router.push('/admin/restaurants')} className="mt-4 border-gray-600 text-gray-300">
          <ArrowLeft className="h-4 w-4 mr-2" /> Geri Don
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Button variant="ghost" onClick={() => router.push('/admin/restaurants')} className="mb-4 text-gray-300 hover:text-white">
        <ArrowLeft className="h-4 w-4 mr-2" /> Restoranlar
      </Button>

      <div className="space-y-6">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">{restaurant.name}</h1>
              <p className="text-gray-400 mt-1">/{restaurant.slug}</p>
            </div>
            <Badge variant={statusMap[restaurant.status].variant}>
              {statusMap[restaurant.status].label}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <div>
              <span className="text-sm text-gray-400">Adres</span>
              <p className="text-white">{restaurant.address || '-'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-400">Telefon</span>
              <p className="text-white">{restaurant.phone || '-'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-400">Kayit Tarihi</span>
              <p className="text-white">{new Date(restaurant.createdAt).toLocaleDateString('tr-TR')}</p>
            </div>
            <div>
              <span className="text-sm text-gray-400">Logo</span>
              <p className="text-white">{restaurant.logo ? 'Var' : 'Yok'}</p>
            </div>
          </div>

          {restaurant.status === 'PENDING' && (
            <div className="flex gap-2 mt-6 pt-4 border-t border-gray-700">
              <Button onClick={() => handleStatusChange('APPROVED')}>Onayla</Button>
              <Button variant="destructive" onClick={() => handleStatusChange('REJECTED')}>Reddet</Button>
            </div>
          )}
          {restaurant.status === 'REJECTED' && (
            <div className="mt-6 pt-4 border-t border-gray-700">
              <Button onClick={() => handleStatusChange('APPROVED')}>Yeniden Onayla</Button>
            </div>
          )}
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Kullanicilar ({restaurant.users.length})</h2>
          <div className="space-y-3">
            {restaurant.users.map((u) => (
              <div key={u.id} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
                <div>
                  <p className="text-white font-medium">{u.name}</p>
                  <p className="text-sm text-gray-400">{u.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{roleLabels[u.role] || u.role}</Badge>
                  <Badge variant={u.isActive ? 'default' : 'destructive'}>
                    {u.isActive ? 'Aktif' : 'Pasif'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
