'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface PositionConfig {
  id: string;
  name: string;
  _count?: { personnel: number };
}

export default function PositionsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');

  const { data: positions = [], isLoading } = useQuery<PositionConfig[]>({
    queryKey: ['position-configs'],
    queryFn: () => api.get('/position-configs').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => api.post('/position-configs', { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['position-configs'] });
      setName('');
      toast.success('Pozisyon oluşturuldu');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Pozisyon oluşturulurken hata oluştu');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/position-configs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['position-configs'] });
      toast.success('Pozisyon silindi');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Bu pozisyon kullanildigindan silinemiyor');
    },
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Pozisyon adi bos olamaz');
      return;
    }
    createMutation.mutate(trimmed);
  };

  if (isLoading) {
    return <div className="p-6 text-muted-foreground">Yükleniyor...</div>;
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/personnel')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Pozisyon Yönetimi</h1>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Pozisyonlar ({positions.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleAdd} className="flex items-center gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Yeni pozisyon adi (orn: Garson, Asci, Kasiyer)"
              className="flex-1"
            />
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Ekleniyor...' : 'Ekle'}
            </Button>
          </form>

          {positions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Henüz pozisyon eklenmemiş
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pozisyon Adi</TableHead>
                    <TableHead className="text-right w-[80px]">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positions.map((pos) => (
                    <TableRow key={pos.id}>
                      <TableCell className="font-medium">{pos.name}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm(`"${pos.name}" pozisyonunu silmek istediğinize emin misiniz?`)) {
                              deleteMutation.mutate(pos.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
