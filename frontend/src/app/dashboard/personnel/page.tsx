'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Settings, MoreHorizontal } from 'lucide-react';
import { ColumnDef, FilterFn, Row } from '@tanstack/react-table';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table';

interface Personnel {
  id: string;
  name: string;
  surname: string;
  phone: string | null;
  position: string | null;
  positionConfig?: { id: string; name: string } | null;
  startDate: string;
  salary: string;
  isActive: boolean;
  createdAt: string;
}

export default function PersonnelListPage() {
  const [deactivateId, setDeactivateId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: personnel = [], isLoading } = useQuery<Personnel[]>({
    queryKey: ['personnel'],
    queryFn: async () => {
      const { data } = await api.get('/personnel');
      return data;
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/personnel/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personnel'] });
      setDeactivateId(null);
    },
  });

  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/personnel/${id}`, { isActive: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personnel'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/personnel/${id}/permanent`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personnel'] });
    },
  });

  const handleDelete = (id: string, name: string) => {
    if (confirm(`${name} adli personeli kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) {
      deleteMutation.mutate(id);
    }
  };

  const formatCurrency = (value: string | number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(Number(value));
  };

  const formatPhone = (raw: string): string => {
    const digits = raw.replace(/\D/g, '').slice(0, 11);
    if (digits.length === 0) return '';
    let result = digits.slice(0, 1);
    if (digits.length > 1) result += ' (' + digits.slice(1, 4);
    if (digits.length > 4) result += ') ' + digits.slice(4, 7);
    if (digits.length > 7) result += ' ' + digits.slice(7, 9);
    if (digits.length > 9) result += ' ' + digits.slice(9, 11);
    return result;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('tr-TR');
  };

  const globalFilterFn: FilterFn<Personnel> = (row: Row<Personnel>, _columnId: string, filterValue: string) => {
    const p = row.original;
    const q = filterValue.toLowerCase();
    const fullName = `${p.name} ${p.surname}`.toLowerCase();
    return (
      fullName.includes(q) ||
      (p.position || '').toLowerCase().includes(q) ||
      (p.phone || '').includes(q)
    );
  };

  const columns: ColumnDef<Personnel>[] = [
    {
      id: 'fullName',
      accessorFn: (row) => `${row.name} ${row.surname}`,
      meta: { label: 'Ad Soyad' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Ad Soyad" />
      ),
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.name} {row.original.surname}
        </span>
      ),
    },
    {
      accessorKey: 'position',
      meta: { label: 'Pozisyon' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Pozisyon" />
      ),
      cell: ({ row }) => row.original.positionConfig?.name || '—',
    },
    {
      accessorKey: 'phone',
      meta: { label: 'Telefon' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Telefon" />
      ),
      cell: ({ row }) => row.original.phone ? formatPhone(row.original.phone) : '—',
    },
    {
      accessorKey: 'startDate',
      meta: { label: 'Başlangıç' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Başlangıç" />
      ),
      cell: ({ row }) => formatDate(row.original.startDate),
    },
    {
      accessorKey: 'salary',
      meta: { label: 'Maaş' },
      header: ({ column }) => (
        <div className="text-right">
          <DataTableColumnHeader column={column} title="Maaş" />
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-right">{formatCurrency(row.original.salary)}</div>
      ),
    },
    {
      id: 'status',
      meta: { label: 'Durum' },
      header: 'Durum',
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? 'default' : 'secondary'}>
          {row.original.isActive ? 'Aktif' : 'Pasif'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const p = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <span className="sr-only">Menüyü aç</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/personnel/${p.id}`}>Görüntüle</Link>
              </DropdownMenuItem>
              {p.isActive ? (
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => setDeactivateId(p.id)}
                >
                  Pasife Al
                </DropdownMenuItem>
              ) : (
                <>
                  <DropdownMenuItem onClick={() => activateMutation.mutate(p.id)}>
                    Aktife Al
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => handleDelete(p.id, `${p.name} ${p.surname}`)}
                  >
                    Sil
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Personel Yönetimi</h1>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/personnel/positions">
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Pozisyonlar
            </Button>
          </Link>
          <Link href="/dashboard/personnel/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Yeni Personel Ekle
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Personel Listesi</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={personnel}
            searchPlaceholder="İsim, pozisyon veya telefon ara..."
            isLoading={isLoading}
            globalFilterFn={globalFilterFn}
            emptyMessage="Henüz personel eklenmemiş."
          />
        </CardContent>
      </Card>

      <Dialog open={!!deactivateId} onOpenChange={() => setDeactivateId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Personeli Pasife Al</DialogTitle>
            <DialogDescription>
              Bu personeli pasife almak istediğinizden emin misiniz? Bu işlem geri alınabilir.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivateId(null)}>
              İptal
            </Button>
            <Button
              variant="destructive"
              disabled={deactivateMutation.isPending}
              onClick={() => deactivateId && deactivateMutation.mutate(deactivateId)}
            >
              {deactivateMutation.isPending ? 'İşlem yapılıyor...' : 'Pasife Al'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
