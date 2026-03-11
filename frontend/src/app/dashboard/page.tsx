'use client';

import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, TrendingDown, TrendingUp, Users } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuthStore();

  const summaryCards = [
    { title: 'Aylik Ciro', value: '\u2014', icon: Wallet, color: 'text-green-600' },
    { title: 'Aylik Gider', value: '\u2014', icon: TrendingDown, color: 'text-red-600' },
    { title: 'Net Kar', value: '\u2014', icon: TrendingUp, color: 'text-blue-600' },
    { title: 'Personel', value: '\u2014', icon: Users, color: 'text-purple-600' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">
        Hos geldiniz, {user?.name}
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                {card.title}
              </CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
