'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import api from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table';

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

  const columns: ColumnDef<Restaurant>[] = [
    {
      accessorKey: 'name',
      meta: { label: 'Restoran' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Restoran" />
      ),
      cell: ({ row }) => (
        <span className="font-medium text-foreground">
          {row.original.name}
        </span>
      ),
    },
    {
      id: 'manager',
      meta: { label: 'Yönetici' },
      header: 'Yönetici',
      cell: ({ row }) => {
        const user = row.original.members[0]?.user;
        if (!user) return <span className="text-muted-foreground">—</span>;
        return (
          <span className="text-muted-foreground">
            {user.name} ({user.email})
          </span>
        );
      },
    },
    {
      accessorKey: 'status',
      meta: { label: 'Durum' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Durum" />
      ),
      cell: ({ row }) => {
        const s = row.original.status;
        return (
          <Badge variant={statusMap[s].variant}>
            {statusMap[s].label}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      meta: { label: 'Kayıt Tarihi' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Kayıt Tarihi" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {new Date(row.original.createdAt).toLocaleDateString('tr-TR')}
        </span>
      ),
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const r = row.original;
        if (r.status !== 'PENDING') return null;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="sr-only">Menüyü aç</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatusChange(r.id, 'APPROVED');
                }}
              >
                Onayla
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatusChange(r.id, 'REJECTED');
                }}
              >
                Reddet
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Restoranlar</h1>
      <div className="flex gap-2 mb-4">
        {(['', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((s) => (
          <Button
            key={s}
            variant={filter === s ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(s)}
            className={filter !== s ? 'border text-muted-foreground' : ''}
          >
            {s === '' ? 'Tümü' : statusMap[s].label}
          </Button>
        ))}
      </div>
      <DataTable
        columns={columns}
        data={restaurants}
        showToolbar={false}
        onRowClick={(row) => router.push(`/admin/restaurants/${row.id}`)}
        emptyMessage="Restoran bulunamadı."
      />
    </div>
  );
}
