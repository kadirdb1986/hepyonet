'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { handleNumericInput, displayNumericValue, parseNumericValue } from '@/lib/utils';
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
import { Plus, Pencil, Trash2, AlertTriangle, Settings2, X, Check, Search } from 'lucide-react';
import { toast } from 'sonner';

interface RawMaterial {
  id: string;
  name: string;
  type: string;
  unit: string;
  currentStock: number;
  lastPurchasePrice: number;
  minStockLevel: number;
}

interface MaterialType {
  id: string;
  name: string;
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
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [newTypeName, setNewTypeName] = useState('');
  const [editingType, setEditingType] = useState<MaterialType | null>(null);
  const [editingTypeName, setEditingTypeName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState({
    name: '',
    type: '' as string,
    unit: 'KG' as string,
    currentStock: '' as string | number,
    lastPurchasePrice: '' as string | number,
    minStockLevel: '' as string | number,
  });

  const { data: materials = [], isLoading } = useQuery<RawMaterial[]>({
    queryKey: ['raw-materials'],
    queryFn: () => api.get('/raw-materials').then((r) => r.data),
  });

  const { data: lowStockMaterials = [] } = useQuery<RawMaterial[]>({
    queryKey: ['raw-materials', 'low-stock'],
    queryFn: () => api.get('/raw-materials/low-stock').then((r) => r.data),
  });

  const { data: materialTypes = [] } = useQuery<MaterialType[]>({
    queryKey: ['material-types'],
    queryFn: () => api.get('/material-types').then((r) => r.data),
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

  // Material type CRUD mutations
  const createTypeMutation = useMutation({
    mutationFn: (name: string) => api.post('/material-types', { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-types'] });
      setNewTypeName('');
      toast.success('Stok tipi eklendi');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Hata olustu');
    },
  });

  const updateTypeMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.patch(`/material-types/${id}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-types'] });
      queryClient.invalidateQueries({ queryKey: ['raw-materials'] });
      setEditingType(null);
      setEditingTypeName('');
      toast.success('Stok tipi guncellendi');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Hata olustu');
    },
  });

  const deleteTypeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/material-types/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-types'] });
      toast.success('Stok tipi silindi');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Hata olustu');
    },
  });

  function resetForm() {
    setForm({ name: '', type: materialTypes.length > 0 ? materialTypes[0].name : '', unit: 'KG', currentStock: '', lastPurchasePrice: '', minStockLevel: '' });
    setEditingMaterial(null);
    setDialogOpen(false);
  }

  function openEdit(material: RawMaterial) {
    setEditingMaterial(material);
    setForm({
      name: material.name,
      type: material.type || '',
      unit: material.unit,
      currentStock: Number(material.currentStock),
      lastPurchasePrice: Number(material.lastPurchasePrice),
      minStockLevel: Number(material.minStockLevel),
    });
    setDialogOpen(true);
  }

  function openCreate() {
    setForm({ name: '', type: materialTypes.length > 0 ? materialTypes[0].name : '', unit: 'KG', currentStock: '', lastPurchasePrice: '', minStockLevel: '' });
    setEditingMaterial(null);
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const submitData = {
      ...form,
      currentStock: parseNumericValue(form.currentStock),
      lastPurchasePrice: parseNumericValue(form.lastPurchasePrice),
      minStockLevel: parseNumericValue(form.minStockLevel),
    };
    if (editingMaterial) {
      updateMutation.mutate({ id: editingMaterial.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTypeDialogOpen(true)}>
            <Settings2 className="mr-2 h-4 w-4" />
            Stok Tipleri
          </Button>
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
                  <Label>Stok Tipi</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  >
                    {materialTypes.length === 0 && <option value="">Tip tanimlanmamis</option>}
                    {materialTypes.map((mt) => (
                      <option key={mt.id} value={mt.name}>{mt.name}</option>
                    ))}
                  </select>
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
                      type="text"
                      inputMode="decimal"
                      value={displayNumericValue(form.currentStock)}
                      onChange={(e) => setForm({ ...form, currentStock: handleNumericInput(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>{t('minStockLevel')}</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={displayNumericValue(form.minStockLevel)}
                      onChange={(e) => setForm({ ...form, minStockLevel: handleNumericInput(e.target.value) })}
                    />
                  </div>
                </div>
                <div>
                  <Label>{t('lastPurchasePrice')} (TL)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={displayNumericValue(form.lastPurchasePrice)}
                    onChange={(e) => setForm({ ...form, lastPurchasePrice: handleNumericInput(e.target.value) })}
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

      {/* Filter tabs and search */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {[{ key: 'ALL', label: 'Tumu' }, ...materialTypes.map((mt) => ({ key: mt.name, label: mt.name }))].map((tab) => (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
              <span className="ml-1.5 text-xs opacity-70">
                ({tab.key === 'ALL' ? materials.length : materials.filter((m) => m.type === tab.key).length})
              </span>
            </Button>
          ))}
        </div>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Stok kalemi ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Materials table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {activeTab === 'ALL' ? t('rawMaterials') : activeTab}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('name')}</TableHead>
                <TableHead className="text-center">Tip</TableHead>
                <TableHead className="text-center">{t('currentStock')}</TableHead>
                <TableHead className="text-center">{t('minStockLevel')}</TableHead>
                <TableHead className="text-center">{t('lastPurchasePrice')}</TableHead>
                <TableHead className="text-center">{t('stockStatus')}</TableHead>
                <TableHead className="text-right">{tc('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {materials.filter((m) => (activeTab === 'ALL' || m.type === activeTab) && (!searchQuery || m.name.toLocaleLowerCase('tr-TR').includes(searchQuery.toLocaleLowerCase('tr-TR')))).map((material) => {
                const unitLabel = UNIT_LABELS[material.unit] || material.unit;
                return (
                  <TableRow key={material.id}>
                    <TableCell className="font-medium">{material.name}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{material.type || '-'}</Badge>
                    </TableCell>
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
              {materials.filter((m) => (activeTab === 'ALL' || m.type === activeTab) && (!searchQuery || m.name.toLocaleLowerCase('tr-TR').includes(searchQuery.toLocaleLowerCase('tr-TR')))).length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    {searchQuery ? `"${searchQuery}" ile eslesen stok kalemi bulunamadi` : t('materialNotFound')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Stok Tipleri Yonetim Dialogu */}
      <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Stok Tiplerini Yonet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Yeni tip ekleme */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newTypeName.trim()) {
                  createTypeMutation.mutate(newTypeName.trim());
                }
              }}
              className="flex gap-2"
            >
              <Input
                placeholder="Yeni stok tipi adi..."
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
              />
              <Button type="submit" size="sm" disabled={createTypeMutation.isPending || !newTypeName.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </form>

            {/* Mevcut tipler listesi */}
            <div className="space-y-2">
              {materialTypes.map((mt) => (
                <div key={mt.id} className="flex items-center gap-2 p-2 border rounded-md">
                  {editingType?.id === mt.id ? (
                    <>
                      <Input
                        value={editingTypeName}
                        onChange={(e) => setEditingTypeName(e.target.value)}
                        className="h-8"
                        autoFocus
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => {
                          if (editingTypeName.trim()) {
                            updateTypeMutation.mutate({ id: mt.id, name: editingTypeName.trim() });
                          }
                        }}
                        disabled={updateTypeMutation.isPending}
                      >
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => { setEditingType(null); setEditingTypeName(''); }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm font-medium">{mt.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({materials.filter((m) => m.type === mt.name).length} kalem)
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => { setEditingType(mt); setEditingTypeName(mt.name); }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => {
                          if (confirm(`"${mt.name}" tipini silmek istediginize emin misiniz?`)) {
                            deleteTypeMutation.mutate(mt.id);
                          }
                        }}
                        disabled={deleteTypeMutation.isPending}
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
              {materialTypes.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Henuz stok tipi tanimlanmamis
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
