'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

interface RestaurantData {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  address: string | null;
  phone: string | null;
  status: string;
  settings: Record<string, unknown> | null;
}

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const [restaurant, setRestaurant] = useState<RestaurantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [logo, setLogo] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    api.get('/restaurants/current').then(({ data }) => {
      setRestaurant(data);
      setName(data.name || '');
      setLogo(data.logo || '');
      setAddress(data.address || '');
      setPhone(data.phone || '');
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch('/restaurants/current', { name, logo: logo || undefined, address: address || undefined, phone: phone || undefined });
      setRestaurant(data);
      toast.success('Restoran bilgileri güncellendi.');
    } catch {
      toast.error('Bilgiler güncellenirken hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Restoran Ayarlari</h1>

      <div className="space-y-6">
        <div className="bg-card border rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold">Genel Bilgiler</h2>

          <div className="space-y-2">
            <Label htmlFor="name">Restoran Adi</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug (URL)</Label>
            <Input id="slug" value={restaurant?.slug || ''} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">Slug degistirilemez. QR menu adresi: /m/{restaurant?.slug}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo">Logo URL</Label>
            <Input id="logo" value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://..." />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Adres</Label>
            <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefon</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+90 5XX XXX XX XX" />
          </div>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Kaydet
          </Button>
        </div>

        <div className="bg-card border rounded-lg p-6 space-y-2">
          <h2 className="text-lg font-semibold">Hesap Durumu</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Durum:</span>
            <span className={`text-sm font-medium ${restaurant?.status === 'APPROVED' ? 'text-green-600' : restaurant?.status === 'PENDING' ? 'text-yellow-600' : 'text-red-600'}`}>
              {restaurant?.status === 'APPROVED' ? 'Onaylandi' : restaurant?.status === 'PENDING' ? 'Onay Bekliyor' : 'Reddedildi'}
            </span>
          </div>
          {user && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Yönetici:</span>
              <span className="text-sm">{user.name} ({user.email})</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
