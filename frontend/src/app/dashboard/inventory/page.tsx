'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface RawMaterial {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  lastPurchasePrice: number;
  minStockLevel: number;
}

const UNITS = ['KG', 'GR', 'LT', 'ML', 'ADET'] as const;

const UNIT_LABELS: Record<string, string> = {
  KG: 'Kilogram',
  GR: 'Gram',
  LT: 'Litre',
  ML: 'Mililitre',
  ADET: 'Adet',
};

/** Miktar formatla: tam sayıysa küsürat gösterme, varsa virgülle göster */
function formatQuantity(val: number): string {
  if (Number.isInteger(val)) return val.toLocaleString('tr-TR');
  return val.toLocaleString('tr-TR', { maximumFractionDigits: 3 });
}

/** Para formatla: her zaman 2 küsürat, Türkiye formatı (1.000,00) */
function formatCurrency(val: number): string {
  return val.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function InventoryPage() {
  const t = useTranslations('inventory');
  const tc = useTranslations('common');
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null);
  const [form, setForm] = useState({
    name: '',
    unit: 'KG' as string,
    currentStock: 0,
    lastPurchasePrice: 0,
    minStockLevel: 0,
  });

  const { data: materials = [], isLoading } = useQuery<RawMaterial[]>({
    queryKey: ['raw-materials'],
    queryFn: () => api.get('/raw-materials').then((r) => r.data),
  });

  const { data: lowStockMaterials = [] } = useQuery<RawMaterial[]>({
    queryKey: ['raw-materials', 'low-stock'],
    queryFn: () => api.get('/raw-materials/low-stock').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => api.post('/raw-materials', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raw-materials'] });
      resetForm();
      toast.success(tc('save') + ' - OK');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof form }) =>
      api.patch(`/raw-materials/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raw-materials'] });
      resetForm();
      toast.success(tc('save') + ' - OK');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/raw-materials/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raw-materials'] });
      toast.success(tc('delete') + ' - OK');
    },
  });

  function resetForm() {
    setForm({ name: '', unit: 'KG', currentStock: 0, lastPurchasePrice: 0, minStockLevel: 0 });
    setEditingMaterial(null);
    setDialogOpen(false);
  }

  function openEdit(material: RawMaterial) {
    setEditingMaterial(material);
    setForm({
      name: material.name,
      unit: material.unit,
      currentStock: Number(material.currentStock),
      lastPurchasePrice: Number(material.lastPurchasePrice),
      minStockLevel: Number(material.minStockLevel),
    });
    setDialogOpen(true);
  }

  function openCreate() {
    resetForm();
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingMaterial) {
      updateMutation.mutate({ id: editingMaterial.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  function isLowStock(material: RawMaterial) {
    return Number(material.minStockLevel) > 0 && Number(material.currentStock) <= Number(material.minStockLevel);
  }

  if (isLoading) {
    return <div className="p-6">{tc('loading')}</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => setDialogOpen(open)}>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            {t('addMaterial')}
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingMaterial ? t('editMaterial') : t('addMaterial')}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>{t('name')}</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>{t('unit')}</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {t(`units.${u}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('currentStock')}</Label>
                  <Input
                    type="number"
                    step="0.001"
                    min="0"
                    value={form.currentStock}
                    onChange={(e) => setForm({ ...form, currentStock: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>{t('minStockLevel')}</Label>
                  <Input
                    type="number"
                    step="0.001"
                    min="0"
                    value={form.minStockLevel}
                    onChange={(e) => setForm({ ...form, minStockLevel: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div>
                <Label>{t('lastPurchasePrice')} (TL)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.lastPurchasePrice}
                  onChange={(e) => setForm({ ...form, lastPurchasePrice: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  {tc('cancel')}
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {tc('save')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Low stock alert */}
      {lowStockMaterials.length > 0 && (
        <Card className="border-orange-300 bg-orange-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-orange-700 flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5" />
              {t('lowStockAlert')} ({lowStockMaterials.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStockMaterials.map((m: RawMaterial) => (
                <Badge key={m.id} variant="destructive">
                  {m.name}: {formatQuantity(Number(m.currentStock))} {UNIT_LABELS[m.unit] || m.unit}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Materials table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('rawMaterials')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('name')}</TableHead>
                <TableHead className="text-center">{t('currentStock')}</TableHead>
                <TableHead className="text-center">{t('minStockLevel')}</TableHead>
                <TableHead className="text-center">{t('lastPurchasePrice')}</TableHead>
                <TableHead className="text-center">{t('stockStatus')}</TableHead>
                <TableHead className="text-right">{tc('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {materials.map((material) => {
                const unitLabel = UNIT_LABELS[material.unit] || material.unit;
                return (
                  <TableRow key={material.id}>
                    <TableCell className="font-medium">{material.name}</TableCell>
                    <TableCell className="text-center">
                      <span className="inline-block w-16 text-right tabular-nums">{formatQuantity(Number(material.currentStock))}</span>
                      <span className="inline-block w-20 text-left text-muted-foreground ml-1">{unitLabel}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-block w-16 text-right tabular-nums">{formatQuantity(Number(material.minStockLevel))}</span>
                      <span className="inline-block w-20 text-left text-muted-foreground ml-1">{unitLabel}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-block w-24 text-right tabular-nums">{formatCurrency(Number(material.lastPurchasePrice))} TL</span>
                      <span className="inline-block w-20 text-left text-muted-foreground ml-1">/{unitLabel}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      {isLowStock(material) ? (
                        <Badge variant="destructive">{t('critical')}</Badge>
                      ) : (
                        <Badge variant="secondary">{t('normal')}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(material)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm(tc('confirm') + '?')) {
                              deleteMutation.mutate(material.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {materials.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {t('materialNotFound')}
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
