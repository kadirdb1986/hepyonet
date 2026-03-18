'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2, Check, X, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface Supplier {
  id: string;
  name: string;
  description: string | null;
  deliveryType: string | null;
  phone: string | null;
}

interface RawMaterial {
  id: string;
  name: string;
  supplierId: string | null;
}

const DELIVERY_TYPES = ['Kargo', 'Ayaga Hizmet', 'Kendin Gidip Aliyorsun'] as const;

/** Telefon numarasini 0 (5xx) xxx xx xx formatina cevir */
function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  let result = digits.slice(0, 1);
  if (digits.length > 1) result += ' (' + digits.slice(1, 4);
  if (digits.length > 4) result += ') ' + digits.slice(4, 7);
  if (digits.length > 7) result += ' ' + digits.slice(7, 9);
  if (digits.length > 9) result += ' ' + digits.slice(9, 11);
  return result;
}

/** Sadece rakamlari al (kayit icin) */
function stripPhone(formatted: string): string {
  return formatted.replace(/\D/g, '');
}

export default function SuppliersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // New supplier form state
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDeliveryType, setNewDeliveryType] = useState('');
  const [newPhone, setNewPhone] = useState('');

  // Editing supplier state
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingDesc, setEditingDesc] = useState('');
  const [editingDeliveryType, setEditingDeliveryType] = useState('');
  const [editingPhone, setEditingPhone] = useState('');

  const { data: suppliers = [], isLoading } = useQuery<Supplier[]>({
    queryKey: ['suppliers'],
    queryFn: () => api.get('/suppliers').then((r) => r.data),
  });

  const { data: materials = [] } = useQuery<RawMaterial[]>({
    queryKey: ['raw-materials'],
    queryFn: () => api.get('/raw-materials').then((r) => r.data),
  });

  const createSupplierMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; deliveryType?: string; phone?: string }) =>
      api.post('/suppliers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setNewName('');
      setNewDesc('');
      setNewDeliveryType('');
      setNewPhone('');
      toast.success('Tedarikci eklendi');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Hata olustu');
    },
  });

  const updateSupplierMutation = useMutation({
    mutationFn: ({ id, name, description, deliveryType, phone }: { id: string; name: string; description?: string; deliveryType?: string; phone?: string }) =>
      api.patch(`/suppliers/${id}`, { name, description, deliveryType, phone }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['raw-materials'] });
      setEditingSupplier(null);
      setEditingName('');
      setEditingDesc('');
      setEditingDeliveryType('');
      setEditingPhone('');
      toast.success('Tedarikci guncellendi');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Hata olustu');
    },
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/suppliers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['raw-materials'] });
      toast.success('Tedarikci silindi');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Hata olustu');
    },
  });

  function getKalemCount(supplierId: string): number {
    return materials.filter((m) => m.supplierId === supplierId).length;
  }

  function startEditing(s: Supplier) {
    setEditingSupplier(s);
    setEditingName(s.name);
    setEditingDesc(s.description || '');
    setEditingDeliveryType(s.deliveryType || '');
    setEditingPhone(s.phone || '');
  }

  function cancelEditing() {
    setEditingSupplier(null);
    setEditingName('');
    setEditingDesc('');
    setEditingDeliveryType('');
    setEditingPhone('');
  }

  if (isLoading) {
    return <div className="p-6 text-muted-foreground">Yukleniyor...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/inventory')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Tedarikci Yonetimi</h1>
      </div>

      {/* Add supplier form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Yeni Tedarikci Ekle</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newName.trim()) {
                createSupplierMutation.mutate({
                  name: newName.trim(),
                  description: newDesc.trim() || undefined,
                  deliveryType: newDeliveryType || undefined,
                  phone: stripPhone(newPhone) || undefined,
                });
              }
            }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div>
              <Label>Tedarikci Adi</Label>
              <Input
                placeholder="Tedarikci adi..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Telefon</Label>
              <Input
                placeholder="0 (5xx) xxx xx xx"
                value={formatPhone(newPhone)}
                onChange={(e) => setNewPhone(stripPhone(e.target.value))}
                type="tel"
              />
            </div>
            <div>
              <Label>Aciklama</Label>
              <Textarea
                placeholder="Aciklama (istege bagli)..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <Label>Tedarik Tipi</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={newDeliveryType}
                onChange={(e) => setNewDeliveryType(e.target.value)}
              >
                <option value="">Tedarik tipi secin...</option>
                {DELIVERY_TYPES.map((dt) => (
                  <option key={dt} value={dt}>{dt}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={createSupplierMutation.isPending || !newName.trim()}>
                <Plus className="mr-2 h-4 w-4" />
                Ekle
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Suppliers list */}
      <Card>
        <CardHeader>
          <CardTitle>Tedarikciler ({suppliers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tedarikci Adi</TableHead>
                <TableHead>Aciklama</TableHead>
                <TableHead className="text-center">Tedarik Tipi</TableHead>
                <TableHead className="text-center">Telefon</TableHead>
                <TableHead className="text-center">Kalem</TableHead>
                <TableHead className="text-right">Islemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((s) => (
                <TableRow key={s.id}>
                  {editingSupplier?.id === s.id ? (
                    <>
                      <TableCell>
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="h-8"
                          autoFocus
                        />
                      </TableCell>
                      <TableCell>
                        <Textarea
                          value={editingDesc}
                          onChange={(e) => setEditingDesc(e.target.value)}
                          rows={2}
                          placeholder="Aciklama..."
                          className="min-h-[2rem]"
                        />
                      </TableCell>
                      <TableCell>
                        <select
                          className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          value={editingDeliveryType}
                          onChange={(e) => setEditingDeliveryType(e.target.value)}
                        >
                          <option value="">Tedarik tipi secin...</option>
                          {DELIVERY_TYPES.map((dt) => (
                            <option key={dt} value={dt}>{dt}</option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="0 (5xx) xxx xx xx"
                          value={formatPhone(editingPhone)}
                          onChange={(e) => setEditingPhone(stripPhone(e.target.value))}
                          type="tel"
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {getKalemCount(s.id)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (editingName.trim()) {
                                updateSupplierMutation.mutate({
                                  id: s.id,
                                  name: editingName.trim(),
                                  description: editingDesc.trim() || undefined,
                                  deliveryType: editingDeliveryType || undefined,
                                  phone: stripPhone(editingPhone) || undefined,
                                });
                              }
                            }}
                            disabled={updateSupplierMutation.isPending}
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={cancelEditing}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {s.description || <span className="italic">-</span>}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {s.deliveryType || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {s.phone ? formatPhone(s.phone) : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {getKalemCount(s.id)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startEditing(s)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm(`"${s.name}" tedarikcisini silmek istediginize emin misiniz?`)) {
                                deleteSupplierMutation.mutate(s.id);
                              }
                            }}
                            disabled={deleteSupplierMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
              {suppliers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Henuz tedarikci tanimlanmamis
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
