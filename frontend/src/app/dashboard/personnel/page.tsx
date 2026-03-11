'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Eye, UserX } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Personnel {
  id: string;
  name: string;
  surname: string;
  phone: string | null;
  position: string | null;
  startDate: string;
  salary: string;
  isActive: boolean;
  createdAt: string;
}

export default function PersonnelListPage() {
  const [search, setSearch] = useState('');
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

  const filtered = personnel.filter((p) => {
    const fullName = `${p.name} ${p.surname}`.toLowerCase();
    const q = search.toLowerCase();
    return (
      fullName.includes(q) ||
      (p.position && p.position.toLowerCase().includes(q)) ||
      (p.phone && p.phone.includes(q))
    );
  });

  const formatCurrency = (value: string | number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(Number(value));
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('tr-TR');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Yukleniyor...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Personel Yonetimi</h1>
        <Link href="/dashboard/personnel/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Yeni Personel Ekle
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Personel Listesi</CardTitle>
            <Input
              placeholder="Ara (ad, pozisyon, telefon)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {search ? 'Aramanizla eslesen personel bulunamadi.' : 'Henuz personel kaydi yok.'}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ad Soyad</TableHead>
                    <TableHead>Pozisyon</TableHead>
                    <TableHead>Telefon</TableHead>
                    <TableHead>Baslangic Tarihi</TableHead>
                    <TableHead>Maas</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Islemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        {p.name} {p.surname}
                      </TableCell>
                      <TableCell>{p.position || '\u2014'}</TableCell>
                      <TableCell>{p.phone || '\u2014'}</TableCell>
                      <TableCell>{formatDate(p.startDate)}</TableCell>
                      <TableCell>{formatCurrency(p.salary)}</TableCell>
                      <TableCell>
                        <Badge variant={p.isActive ? 'default' : 'secondary'}>
                          {p.isActive ? 'Aktif' : 'Pasif'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Link href={`/dashboard/personnel/${p.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          {p.isActive && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeactivateId(p.id)}
                            >
                              <UserX className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!deactivateId} onOpenChange={() => setDeactivateId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Personeli Pasife Al</DialogTitle>
            <DialogDescription>
              Bu personeli pasife almak istediginizden emin misiniz? Bu islem geri alinabilir.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivateId(null)}>
              Iptal
            </Button>
            <Button
              variant="destructive"
              disabled={deactivateMutation.isPending}
              onClick={() => deactivateId && deactivateMutation.mutate(deactivateId)}
            >
              {deactivateMutation.isPending ? 'Islem yapiliyor...' : 'Pasife Al'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
