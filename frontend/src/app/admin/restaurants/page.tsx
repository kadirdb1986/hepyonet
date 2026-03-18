'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import api from '@/lib/api';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  members: { user: { id: string; email: string; name: string } }[];
}

const statusMap = {
  PENDING: { label: 'Onay Bekliyor', variant: 'secondary' as const },
  APPROVED: { label: 'Onaylandi', variant: 'default' as const },
  REJECTED: { label: 'Reddedildi', variant: 'destructive' as const },
};

export default function AdminRestaurantsPage() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [filter, setFilter] = useState<string>('');

  const loadRestaurants = () => {
    const params = filter ? { status: filter } : {};
    api.get('/admin/restaurants', { params }).then(({ data }) => setRestaurants(data));
  };

  useEffect(() => {
    loadRestaurants();
  }, [filter]);

  const handleStatusChange = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    await api.patch(`/admin/restaurants/${id}/approve`, { status });
    loadRestaurants();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Restoranlar</h1>
      <div className="flex gap-2 mb-4">
        {['', 'PENDING', 'APPROVED', 'REJECTED'].map((s) => (
          <Button
            key={s}
            variant={filter === s ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(s)}
            className={filter !== s ? 'border-gray-600 text-gray-300' : ''}
          >
            {s === '' ? 'Tümü' : statusMap[s as keyof typeof statusMap].label}
          </Button>
        ))}
      </div>
      <div className="rounded-md border border-gray-700">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-700">
              <TableHead className="text-gray-400">Restoran</TableHead>
              <TableHead className="text-gray-400">Yönetici</TableHead>
              <TableHead className="text-gray-400">Durum</TableHead>
              <TableHead className="text-gray-400">Kayıt Tarihi</TableHead>
              <TableHead className="text-gray-400">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {restaurants.map((r) => (
              <TableRow key={r.id} className="border-gray-700">
                <TableCell className="text-white font-medium cursor-pointer hover:underline" onClick={() => router.push(`/admin/restaurants/${r.id}`)}>{r.name}</TableCell>
                <TableCell className="text-gray-300">
                  {r.members[0]?.user?.name} ({r.members[0]?.user?.email})
                </TableCell>
                <TableCell>
                  <Badge variant={statusMap[r.status].variant}>
                    {statusMap[r.status].label}
                  </Badge>
                </TableCell>
                <TableCell className="text-gray-300">
                  {new Date(r.createdAt).toLocaleDateString('tr-TR')}
                </TableCell>
                <TableCell>
                  {r.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleStatusChange(r.id, 'APPROVED')}>
                        Onayla
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleStatusChange(r.id, 'REJECTED')}>
                        Reddet
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
