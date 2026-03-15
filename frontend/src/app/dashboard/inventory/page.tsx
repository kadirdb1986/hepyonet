'use client';

import { useState, useRef, useEffect } from 'react';
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
import { Plus, Pencil, Trash2, AlertTriangle, Settings2, X, Check, Search, Truck, SlidersHorizontal } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface Supplier {
  id: string;
  name: string;
  description: string | null;
}

interface RawMaterial {
  id: string;
  name: string;
  type: string;
  unit: string;
  currentStock: number;
  lastPurchasePrice: number;
  minStockLevel: number;
  supplierId: string | null;
  supplier: Supplier | null;
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

const UNIT_SHORT: Record<string, string> = {
  KG: 'kg',
  GR: 'gr',
  LT: 'lt',
  ML: 'ml',
  ADET: 'adet',
};

const TOGGLEABLE_COLUMNS = [
  { key: 'type', label: 'Tip' },
  { key: 'supplier', label: 'Tedarikci' },
  { key: 'currentStock', label: 'Mevcut Stok' },
  { key: 'minStockLevel', label: 'Minimum Stok' },
  { key: 'lastPurchasePrice', label: 'Son Alis Fiyati' },
  { key: 'stockStatus', label: 'Stok Durumu' },
] as const;

const DEFAULT_VISIBLE_COLUMNS = ['currentStock', 'lastPurchasePrice', 'supplier'];

/** Miktar formatla: tam sayıysa küsürat gösterme, varsa virgülle göster */
function formatQuantity(val: number): string {
  if (Number.isInteger(val)) return val.toLocaleString('tr-TR');
  return val.toLocaleString('tr-TR', { maximumFractionDigits: 3 });
}

/** Para formatla: küsürat varsa 2 hane göster, yoksa tam sayı */
function formatCurrency(val: number): string {
  if (Number.isInteger(val)) return val.toLocaleString('tr-TR');
  return val.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function SupplierPopover({ supplier }: { supplier: Supplier }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-sm font-medium underline decoration-dotted underline-offset-2 cursor-pointer hover:text-primary"
      >
        {supplier.name}
      </button>
      {open && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 w-64 rounded-lg border bg-popover p-3 shadow-lg">
          <div className="absolute left-1/2 -translate-x-1/2 -top-2 w-3 h-3 rotate-45 border-l border-t bg-popover" />
          <p className="font-semibold text-sm">{supplier.name}</p>
          {supplier.description ? (
            <p className="text-xs text-muted-foreground mt-1.5 whitespace-pre-wrap">{supplier.description}</p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1.5 italic">Aciklama eklenmemis</p>
          )}
        </div>
      )}
    </div>
  );
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
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierDesc, setNewSupplierDesc] = useState('');
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editingSupplierName, setEditingSupplierName] = useState('');
  const [editingSupplierDesc, setEditingSupplierDesc] = useState('');
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const columnMenuRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState({
    name: '',
    type: '' as string,
    unit: 'KG' as string,
    currentStock: '' as string | number,
    lastPurchasePrice: '' as string | number,
    minStockLevel: '' as string | number,
    supplierId: '' as string,
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (columnMenuRef.current && !columnMenuRef.current.contains(e.target as Node)) {
        setColumnMenuOpen(false);
      }
    }
    if (columnMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [columnMenuOpen]);

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

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ['suppliers'],
    queryFn: () => api.get('/suppliers').then((r) => r.data),
  });

  const { data: restaurantData } = useQuery<{ settings: Record<string, unknown> }>({
    queryKey: ['restaurant'],
    queryFn: () => api.get('/restaurant').then((r) => r.data),
  });

  const savedColumns = restaurantData?.settings?.inventoryColumns as string[] | undefined;
  const visibleColumns = savedColumns ?? DEFAULT_VISIBLE_COLUMNS;

  const columnSettingsMutation = useMutation({
    mutationFn: (columns: string[]) =>
      api.patch('/restaurant/settings', { settings: { inventoryColumns: columns } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant'] });
    },
  });

  function toggleColumn(key: string) {
    const next = visibleColumns.includes(key)
      ? visibleColumns.filter((c) => c !== key)
      : [...visibleColumns, key];
    columnSettingsMutation.mutate(next);
  }

  function isColumnVisible(key: string) {
    return visibleColumns.includes(key);
  }

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/raw-materials', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raw-materials'] });
      resetForm();
      toast.success(tc('save') + ' - OK');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
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

  // Supplier CRUD mutations
  const createSupplierMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) => api.post('/suppliers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setNewSupplierName('');
      setNewSupplierDesc('');
      toast.success('Tedarikci eklendi');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Hata olustu');
    },
  });

  const updateSupplierMutation = useMutation({
    mutationFn: ({ id, name, description }: { id: string; name: string; description?: string }) =>
      api.patch(`/suppliers/${id}`, { name, description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['raw-materials'] });
      setEditingSupplier(null);
      setEditingSupplierName('');
      setEditingSupplierDesc('');
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

  function resetForm() {
    setForm({ name: '', type: materialTypes.length > 0 ? materialTypes[0].name : '', unit: 'KG', currentStock: '', lastPurchasePrice: '', minStockLevel: '', supplierId: '' });
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
      supplierId: material.supplierId || '',
    });
    setDialogOpen(true);
  }

  function openCreate() {
    setForm({ name: '', type: materialTypes.length > 0 ? materialTypes[0].name : '', unit: 'KG', currentStock: '', lastPurchasePrice: '', minStockLevel: '', supplierId: '' });
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
      supplierId: form.supplierId || null,
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
          <Button variant="outline" onClick={() => setSupplierDialogOpen(true)}>
            <Truck className="mr-2 h-4 w-4" />
            Tedarikciler
          </Button>
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
                <div>
                  <Label>Tedarikci</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={form.supplierId}
                    onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
                  >
                    <option value="">Tedarikci secilmedi</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('currentStock')}</Label>
                    <div className="relative">
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={displayNumericValue(form.currentStock)}
                        onChange={(e) => setForm({ ...form, currentStock: handleNumericInput(e.target.value) })}
                        className="pr-12"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                        {UNIT_SHORT[form.unit] || form.unit}
                      </span>
                    </div>
                  </div>
                  <div>
                    <Label>{t('minStockLevel')}</Label>
                    <div className="relative">
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={displayNumericValue(form.minStockLevel)}
                        onChange={(e) => setForm({ ...form, minStockLevel: handleNumericInput(e.target.value) })}
                        className="pr-12"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                        {UNIT_SHORT[form.unit] || form.unit}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="w-1/2">
                  <Label>{t('lastPurchasePrice')}</Label>
                  <div className="relative">
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={displayNumericValue(form.lastPurchasePrice)}
                      onChange={(e) => setForm({ ...form, lastPurchasePrice: handleNumericInput(e.target.value) })}
                      className="pr-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                      TL
                    </span>
                  </div>
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
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>
            {activeTab === 'ALL' ? t('rawMaterials') : activeTab}
          </CardTitle>
          <div className="relative" ref={columnMenuRef}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setColumnMenuOpen((v) => !v)}
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Sutunlar
            </Button>
            {columnMenuOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 w-52 rounded-md border bg-popover p-1 shadow-md">
                <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Gorunur Sutunlar</p>
                <div className="h-px bg-border my-1" />
                {TOGGLEABLE_COLUMNS.map((col) => (
                  <label
                    key={col.key}
                    className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent"
                  >
                    <input
                      type="checkbox"
                      checked={isColumnVisible(col.key)}
                      onChange={() => toggleColumn(col.key)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    {col.label}
                  </label>
                ))}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('name')}</TableHead>
                {isColumnVisible('type') && <TableHead className="text-center">Tip</TableHead>}
                {isColumnVisible('supplier') && <TableHead className="text-center">Tedarikci</TableHead>}
                {isColumnVisible('currentStock') && <TableHead className="text-center">{t('currentStock')}</TableHead>}
                {isColumnVisible('minStockLevel') && <TableHead className="text-center">{t('minStockLevel')}</TableHead>}
                {isColumnVisible('lastPurchasePrice') && <TableHead className="text-center">{t('lastPurchasePrice')}</TableHead>}
                {isColumnVisible('stockStatus') && <TableHead className="text-center">{t('stockStatus')}</TableHead>}
                <TableHead className="text-right">{tc('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {materials.filter((m) => (activeTab === 'ALL' || m.type === activeTab) && (!searchQuery || m.name.toLocaleLowerCase('tr-TR').includes(searchQuery.toLocaleLowerCase('tr-TR')))).map((material) => {
                const unitLabel = UNIT_LABELS[material.unit] || material.unit;
                return (
                  <TableRow key={material.id}>
                    <TableCell className="font-medium">{material.name}</TableCell>
                    {isColumnVisible('type') && (
                      <TableCell className="text-center">
                        <Badge variant="outline">{material.type || '-'}</Badge>
                      </TableCell>
                    )}
                    {isColumnVisible('supplier') && (
                      <TableCell className="text-center">
                        {material.supplier ? (
                          <SupplierPopover supplier={material.supplier} />
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    )}
                    {isColumnVisible('currentStock') && (
                      <TableCell className="text-center">
                        <span className="inline-block w-16 text-right tabular-nums">{formatQuantity(Number(material.currentStock))}</span>
                        <span className="inline-block w-20 text-left text-muted-foreground ml-1">{unitLabel}</span>
                      </TableCell>
                    )}
                    {isColumnVisible('minStockLevel') && (
                      <TableCell className="text-center">
                        <span className="inline-block w-16 text-right tabular-nums">{formatQuantity(Number(material.minStockLevel))}</span>
                        <span className="inline-block w-20 text-left text-muted-foreground ml-1">{unitLabel}</span>
                      </TableCell>
                    )}
                    {isColumnVisible('lastPurchasePrice') && (
                      <TableCell className="text-center">
                        <span className="inline-block w-24 text-right tabular-nums">{formatCurrency(Number(material.lastPurchasePrice))} TL</span>
                        <span className="inline-block w-20 text-left text-muted-foreground ml-1">/{UNIT_SHORT[material.unit] || material.unit}</span>
                      </TableCell>
                    )}
                    {isColumnVisible('stockStatus') && (
                      <TableCell className="text-center">
                        {isLowStock(material) ? (
                          <Badge variant="destructive">{t('critical')}</Badge>
                        ) : (
                          <Badge variant="secondary">{t('normal')}</Badge>
                        )}
                      </TableCell>
                    )}
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
                  <TableCell colSpan={2 + visibleColumns.length} className="text-center text-muted-foreground py-8">
                    {searchQuery ? `"${searchQuery}" ile eslesen stok kalemi bulunamadi` : t('materialNotFound')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Tedarikci Yonetim Dialogu */}
      <Dialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tedarikcileri Yonet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Yeni tedarikci ekleme */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newSupplierName.trim()) {
                  createSupplierMutation.mutate({
                    name: newSupplierName.trim(),
                    description: newSupplierDesc.trim() || undefined,
                  });
                }
              }}
              className="space-y-2"
            >
              <Input
                placeholder="Tedarikci adi..."
                value={newSupplierName}
                onChange={(e) => setNewSupplierName(e.target.value)}
              />
              <Textarea
                placeholder="Aciklama (istege bagli)..."
                value={newSupplierDesc}
                onChange={(e) => setNewSupplierDesc(e.target.value)}
                rows={2}
              />
              <Button type="submit" size="sm" className="w-full" disabled={createSupplierMutation.isPending || !newSupplierName.trim()}>
                <Plus className="mr-2 h-4 w-4" />
                Ekle
              </Button>
            </form>

            {/* Mevcut tedarikciler listesi */}
            <div className="space-y-2">
              {suppliers.map((s) => (
                <div key={s.id} className="flex items-start gap-2 p-2 border rounded-md">
                  {editingSupplier?.id === s.id ? (
                    <div className="flex-1 space-y-2">
                      <Input
                        value={editingSupplierName}
                        onChange={(e) => setEditingSupplierName(e.target.value)}
                        className="h-8"
                        autoFocus
                      />
                      <Textarea
                        value={editingSupplierDesc}
                        onChange={(e) => setEditingSupplierDesc(e.target.value)}
                        rows={2}
                        placeholder="Aciklama..."
                      />
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            if (editingSupplierName.trim()) {
                              updateSupplierMutation.mutate({
                                id: s.id,
                                name: editingSupplierName.trim(),
                                description: editingSupplierDesc.trim() || undefined,
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
                          className="h-8 w-8"
                          onClick={() => { setEditingSupplier(null); setEditingSupplierName(''); setEditingSupplierDesc(''); }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium">{s.name}</span>
                        {s.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{s.description}</p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        ({materials.filter((m) => m.supplierId === s.id).length} kalem)
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => { setEditingSupplier(s); setEditingSupplierName(s.name); setEditingSupplierDesc(s.description || ''); }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => {
                          if (confirm(`"${s.name}" tedarikcisini silmek istediginize emin misiniz?`)) {
                            deleteSupplierMutation.mutate(s.id);
                          }
                        }}
                        disabled={deleteSupplierMutation.isPending}
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
              {suppliers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Henuz tedarikci tanimlanmamis
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
