'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PositionConfig {
  id: string;
  name: string;
}

interface CreatePersonnelForm {
  name: string;
  surname: string;
  phone: string;
  tcNo: string;
  positionId: string;
  startDate: string;
  salary: string;
}

export default function NewPersonnelPage() {
  const router = useRouter();
  const [error, setError] = useState('');

  const { data: positions = [] } = useQuery<PositionConfig[]>({
    queryKey: ['position-configs'],
    queryFn: () => api.get('/position-configs').then((r) => r.data),
  });

  const [form, setForm] = useState<CreatePersonnelForm>({
    name: '',
    surname: '',
    phone: '',
    tcNo: '',
    positionId: '',
    startDate: new Date().toISOString().split('T')[0],
    salary: '',
  });

  const createMutation = useMutation({
    mutationFn: async (payload: CreatePersonnelForm) => {
      const body: Record<string, any> = {
        name: payload.name,
        surname: payload.surname,
        phone: payload.phone || undefined,
        tcNo: payload.tcNo || undefined,
        startDate: payload.startDate,
        salary: Number(payload.salary),
      };
      if (payload.positionId) {
        body.positionId = payload.positionId;
      }
      const { data } = await api.post('/personnel', body);
      return data;
    },
    onSuccess: () => {
      router.push('/dashboard/personnel');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Personel eklenirken bir hata oluştu');
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim() || !form.surname.trim()) {
      setError('Ad ve soyad alanlari zorunludur');
      return;
    }

    if (!form.salary || Number(form.salary) < 0) {
      setError('Geçerli bir maaş giriniz');
      return;
    }

    createMutation.mutate(form);
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard/personnel">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Geri
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Yeni Personel Ekle</h1>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Personel Bilgileri</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Ad *</Label>
                <Input
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="surname">Soyad *</Label>
                <Input
                  id="surname"
                  name="surname"
                  value={form.surname}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="05XX XXX XX XX"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tcNo">TC Kimlik No</Label>
                <Input
                  id="tcNo"
                  name="tcNo"
                  value={form.tcNo}
                  onChange={handleChange}
                  maxLength={11}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Pozisyon</Label>
              <Select value={form.positionId || ""} onValueChange={(value) => setForm({ ...form, positionId: value })}>
                <SelectTrigger id="position">
                  <SelectValue placeholder="Pozisyon Seçin" />
                </SelectTrigger>
                <SelectContent>
                  {positions.map((pos) => (
                    <SelectItem key={pos.id} value={pos.id}>{pos.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Başlangıç Tarihi *</Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salary">Maaş (TL) *</Label>
                <Input
                  id="salary"
                  name="salary"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.salary}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Link href="/dashboard/personnel">
                <Button type="button" variant="outline">
                  İptal
                </Button>
              </Link>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
