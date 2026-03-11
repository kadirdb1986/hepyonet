'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Store, Users, Clock } from 'lucide-react';
import api from '@/lib/api';

interface Stats {
  totalRestaurants: number;
  pendingRestaurants: number;
  approvedRestaurants: number;
  totalUsers: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api.get('/admin/stats').then(({ data }) => setStats(data)).catch(console.error);
  }, []);

  if (!stats) return <p>Yukleniyor...</p>;

  const cards = [
    { title: 'Toplam Restoran', value: stats.totalRestaurants, icon: Store },
    { title: 'Onay Bekleyen', value: stats.pendingRestaurants, icon: Clock },
    { title: 'Onaylanan', value: stats.approvedRestaurants, icon: Store },
    { title: 'Toplam Kullanici', value: stats.totalUsers, icon: Users },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Istatistikler</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => (
          <Card key={card.title} className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">{card.title}</CardTitle>
              <card.icon className="h-5 w-5 text-gray-400" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-white">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
