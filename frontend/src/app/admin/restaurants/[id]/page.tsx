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
  members: { role: string; isActive: boolean; user: { id: string; email: string; name: string } }[];
}

const statusMap = {
  PENDING: { label: 'Onay Bekliyor', variant: 'secondary' as const },
  APPROVED: { label: 'Onaylandi', variant: 'default' as const },
  REJECTED: { label: 'Reddedildi', variant: 'destructive' as const },
};

const roleLabels: Record<string, string> = {
  OWNER: 'Sahip',
  ADMIN: 'Yönetici',
  ACCOUNTANT: 'Muhasebe',
  HR: 'İnsan Kaynakları',
  STOCK_MANAGER: 'Depocu',
  MENU_MANAGER: 'Menü Yöneticisi',
  WAITER: 'Garson',
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

  const handleDelete = async () => {
    if (!restaurant) return;
    if (!confirm(`"${restaurant.name}" restoranını ve tüm verilerini kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) return;
    try {
      await api.delete(`/admin/restaurants/${restaurant.id}`);
      router.push('/admin/restaurants');
    } catch {
      alert('Restoran silinirken hata oluştu.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground text-lg">Restoran bulunamadı.</p>
        <Button variant="outline" onClick={() => router.push('/admin/restaurants')} className="mt-4 border text-muted-foreground">
          <ArrowLeft className="h-4 w-4 mr-2" /> Geri Dön
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Button variant="ghost" onClick={() => router.push('/admin/restaurants')} className="mb-4 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 mr-2" /> Restoranlar
      </Button>

      <div className="space-y-6">
        <div className="bg-background border rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{restaurant.name}</h1>
              <p className="text-muted-foreground mt-1">/{restaurant.slug}</p>
            </div>
            <Badge variant={statusMap[restaurant.status].variant}>
              {statusMap[restaurant.status].label}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <div>
              <span className="text-sm text-muted-foreground">Adres</span>
              <p className="text-foreground">{restaurant.address || '-'}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Telefon</span>
              <p className="text-foreground">{restaurant.phone || '-'}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Kayıt Tarihi</span>
              <p className="text-foreground">{new Date(restaurant.createdAt).toLocaleDateString('tr-TR')}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Logo</span>
              <p className="text-foreground">{restaurant.logo ? 'Var' : 'Yok'}</p>
            </div>
          </div>

          {restaurant.status === 'PENDING' && (
            <div className="flex gap-2 mt-6 pt-4 border-t border">
              <Button onClick={() => handleStatusChange('APPROVED')}>Onayla</Button>
              <Button variant="destructive" onClick={() => handleStatusChange('REJECTED')}>Reddet</Button>
            </div>
          )}
          {restaurant.status === 'REJECTED' && (
            <div className="flex gap-2 mt-6 pt-4 border-t border">
              <Button onClick={() => handleStatusChange('APPROVED')}>Yeniden Onayla</Button>
              <Button variant="destructive" onClick={handleDelete}>Restoranı Sil</Button>
            </div>
          )}
          {restaurant.status !== 'PENDING' && restaurant.status !== 'REJECTED' && (
            <div className="mt-6 pt-4 border-t border">
              <Button variant="destructive" onClick={handleDelete}>Restoranı Sil</Button>
            </div>
          )}
        </div>

        <div className="bg-background border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Kullanıcılar ({restaurant.members.length})</h2>
          <div className="space-y-3">
            {restaurant.members.map((m) => (
              <div key={m.user.id} className="flex items-center justify-between py-2 border-b border last:border-0">
                <div>
                  <p className="text-foreground font-medium">{m.user.name}</p>
                  <p className="text-sm text-muted-foreground">{m.user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{roleLabels[m.role] || m.role}</Badge>
                  <Badge variant={m.isActive ? 'default' : 'destructive'}>
                    {m.isActive ? 'Aktif' : 'Pasif'}
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
