'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table';
import { Plus, Check, X, ArrowLeft, MoreHorizontal } from 'lucide-react';
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
      toast.success('Tedarikçi eklendi');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Hata oluştu');
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
      toast.success('Tedarikçi güncellendi');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Hata oluştu');
    },
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/suppliers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['raw-materials'] });
      toast.success('Tedarikçi silindi');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Hata oluştu');
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

  const columns: ColumnDef<Supplier>[] = [
    {
      accessorKey: 'name',
      meta: { label: 'Tedarikçi Adı' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tedarikçi Adı" />,
      cell: ({ row }) => {
        const s = row.original;
        if (editingSupplier?.id === s.id) {
          return (
            <Input
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              className="h-8"
              autoFocus
            />
          );
        }
        return <span className="font-medium">{s.name}</span>;
      },
    },
    {
      accessorKey: 'description',
      meta: { label: 'Açıklama' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Açıklama" />,
      cell: ({ row }) => {
        const s = row.original;
        if (editingSupplier?.id === s.id) {
          return (
            <Textarea
              value={editingDesc}
              onChange={(e) => setEditingDesc(e.target.value)}
              rows={2}
              placeholder="Açıklama..."
              className="min-h-[2rem]"
            />
          );
        }
        return s.description ? (
          <span className="text-sm text-muted-foreground max-w-[200px] truncate block">{s.description}</span>
        ) : (
          <span className="italic text-muted-foreground text-sm">-</span>
        );
      },
    },
    {
      accessorKey: 'deliveryType',
      meta: { label: 'Tedarik Tipi' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tedarik Tipi" />,
      cell: ({ row }) => {
        const s = row.original;
        if (editingSupplier?.id === s.id) {
          return (
            <Select value={editingDeliveryType || ''} onValueChange={setEditingDeliveryType}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Tedarik tipi seçin..." />
              </SelectTrigger>
              <SelectContent>
                {DELIVERY_TYPES.map((dt) => (
                  <SelectItem key={dt} value={dt}>{dt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }
        return s.deliveryType ? (
          <span className="text-sm">{s.deliveryType}</span>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        );
      },
    },
    {
      accessorKey: 'phone',
      meta: { label: 'Telefon' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Telefon" />,
      cell: ({ row }) => {
        const s = row.original;
        if (editingSupplier?.id === s.id) {
          return (
            <Input
              placeholder="0 (5xx) xxx xx xx"
              value={formatPhone(editingPhone)}
              onChange={(e) => setEditingPhone(stripPhone(e.target.value))}
              type="tel"
              className="h-8"
            />
          );
        }
        return s.phone ? (
          <span className="text-sm">{formatPhone(s.phone)}</span>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        );
      },
    },
    {
      id: 'kalem',
      meta: { label: 'Kalem' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Kalem" />,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{getKalemCount(row.original.id)}</span>
      ),
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const s = row.original;
        if (editingSupplier?.id === s.id) {
          return (
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
              <Button variant="ghost" size="icon" onClick={cancelEditing}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          );
        }
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <span className="sr-only">Menüyü aç</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => startEditing(s)}>Düzenle</DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => {
                    if (confirm(`"${s.name}" tedarikçisini silmek istediğinize emin misiniz?`)) {
                      deleteSupplierMutation.mutate(s.id);
                    }
                  }}
                >
                  Sil
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/inventory')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Tedarikçi Yönetimi</h1>
      </div>

      {/* Add supplier form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Yeni Tedarikçi Ekle</CardTitle>
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
              <Label>Tedarikçi Adı</Label>
              <Input
                placeholder="Tedarikçi adı..."
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
              <Label>Açıklama</Label>
              <Textarea
                placeholder="Açıklama (isteğe bağlı)..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <Label>Tedarik Tipi</Label>
              <Select value={newDeliveryType || ''} onValueChange={setNewDeliveryType}>
                <SelectTrigger>
                  <SelectValue placeholder="Tedarik tipi seçin..." />
                </SelectTrigger>
                <SelectContent>
                  {DELIVERY_TYPES.map((dt) => (
                    <SelectItem key={dt} value={dt}>{dt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          <CardTitle>Tedarikçiler ({suppliers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={suppliers}
            showToolbar={false}
            isLoading={isLoading}
            emptyMessage="Henüz tedarikçi tanımlanmamış"
          />
        </CardContent>
      </Card>
    </div>
  );
}
