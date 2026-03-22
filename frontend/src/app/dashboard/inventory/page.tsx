'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef, FilterFn, Row, VisibilityState } from '@tanstack/react-table';
import api from '@/lib/api';
import { handleNumericInput, displayNumericValue, parseNumericValue } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table';
import {
  Plus, Truck, Tag, AlertTriangle,
  Download, Package, MoreHorizontal, Check, X, Pencil, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

interface Supplier {
  id: string;
  name: string;
  description: string | null;
  deliveryType: string | null;
  phone: string | null;
}

/** Telefon numarasını 0 (5xx) xxx xx xx formatına çevir */
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
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="link"
          className="text-sm font-medium underline decoration-dotted underline-offset-2 cursor-pointer hover:text-primary p-0 h-auto"
        >
          {supplier.name}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3">
        <p className="font-semibold text-sm">{supplier.name}</p>
        {supplier.deliveryType && (
          <p className="text-xs mt-1.5"><span className="text-muted-foreground">Tedarik Tipi:</span> {supplier.deliveryType}</p>
        )}
        {supplier.phone && (
          <p className="text-xs mt-1"><span className="text-muted-foreground">Tel:</span> {formatPhone(supplier.phone)}</p>
        )}
        {supplier.description ? (
          <p className="text-xs text-muted-foreground mt-1.5 whitespace-pre-wrap">{supplier.description}</p>
        ) : (
          <p className="text-xs text-muted-foreground mt-1.5 italic">Açıklama eklenmemiş</p>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** Stock level progress bar percentage */
function getStockPercent(material: RawMaterial): number {
  const current = Number(material.currentStock);
  const min = Number(material.minStockLevel);
  if (min <= 0) return 100;
  const max = min * 5;
  return Math.min(100, Math.max(5, (current / max) * 100));
}

function isLowStock(material: RawMaterial): boolean {
  return Number(material.minStockLevel) > 0 && Number(material.currentStock) <= Number(material.minStockLevel);
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
  const [form, setForm] = useState({
    name: '',
    type: '' as string,
    unit: 'KG' as string,
    currentStock: '' as string | number,
    lastPurchasePrice: '' as string | number,
    minStockLevel: '' as string | number,
    supplierId: '' as string,
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

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ['suppliers'],
    queryFn: () => api.get('/suppliers').then((r) => r.data),
  });

  const { data: restaurantData } = useQuery<{ settings: Record<string, unknown> }>({
    queryKey: ['restaurant'],
    queryFn: () => api.get('/restaurants/current').then((r) => r.data),
  });

  // Compute initial column visibility from saved DB state or defaults
  // DEFAULT_VISIBLE_COLUMNS was ['currentStock', 'lastPurchasePrice', 'supplier']
  // All toggleable columns: type, supplier, currentStock, minStockLevel, lastPurchasePrice, stockStatus
  const savedColumns = restaurantData?.settings?.inventoryColumns as string[] | undefined;
  const visibleColumnKeys = savedColumns ?? ['currentStock', 'lastPurchasePrice', 'supplier'];
  const initialColumnVisibility: VisibilityState = {
    type: visibleColumnKeys.includes('type'),
    supplier: visibleColumnKeys.includes('supplier'),
    currentStock: visibleColumnKeys.includes('currentStock'),
    minStockLevel: visibleColumnKeys.includes('minStockLevel'),
    lastPurchasePrice: visibleColumnKeys.includes('lastPurchasePrice'),
    stockStatus: visibleColumnKeys.includes('stockStatus'),
  };

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
      toast.error(err?.response?.data?.message || 'Hata oluştu');
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
      toast.success('Stok tipi güncellendi');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Hata oluştu');
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
      toast.error(err?.response?.data?.message || 'Hata oluştu');
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

  // Filtered by active tab only; search is handled by DataTable globalFilter
  const filteredMaterials = activeTab === 'ALL'
    ? materials
    : materials.filter((m) => m.type === activeTab);

  // Compute total stock value
  const totalStockValue = materials.reduce((sum, m) => {
    return sum + Number(m.currentStock) * Number(m.lastPurchasePrice);
  }, 0);

  const globalFilterFn: FilterFn<RawMaterial> = (row: Row<RawMaterial>, _columnId: string, filterValue: string) => {
    const q = filterValue.toLocaleLowerCase('tr-TR');
    return row.original.name.toLocaleLowerCase('tr-TR').includes(q);
  };

  const columns: ColumnDef<RawMaterial>[] = [
    {
      accessorKey: 'name',
      meta: { label: 'Stok Kalemi' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Stok Kalemi" />
      ),
      cell: ({ row }) => {
        const material = row.original;
        const unitLabel = UNIT_LABELS[material.unit] || material.unit;
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground shrink-0">
              <Package className="size-5" />
            </div>
            <div>
              <p className="font-bold text-sm text-foreground">{material.name}</p>
              <p className="text-[10px] text-muted-foreground">{material.type || '-'} / {unitLabel}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'type',
      meta: { label: 'Tip' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Tip" />
      ),
      cell: ({ row }) => (
        <span className="px-3 py-1 bg-muted text-foreground rounded-full text-[10px] font-medium uppercase tracking-tight">
          {row.original.type || '-'}
        </span>
      ),
    },
    {
      accessorKey: 'supplier',
      meta: { label: 'Tedarikçi' },
      header: 'Tedarikçi',
      enableSorting: false,
      cell: ({ row }) => {
        const material = row.original;
        return material.supplier ? (
          <SupplierPopover supplier={material.supplier} />
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        );
      },
    },
    {
      accessorKey: 'currentStock',
      meta: { label: 'Mevcut Stok' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Mevcut Stok" />
      ),
      cell: ({ row }) => {
        const material = row.original;
        const unitShort = UNIT_SHORT[material.unit] || material.unit;
        const low = isLowStock(material);
        const stockPct = getStockPercent(material);
        return (
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold ${low ? 'text-destructive' : 'text-foreground'}`}>
              {formatQuantity(Number(material.currentStock))} {unitShort}
            </span>
            <div className={`w-20 h-1.5 rounded-full overflow-hidden ${low ? 'bg-destructive/10' : 'bg-muted'}`}>
              <div
                className={`h-full rounded-full ${low ? 'bg-destructive' : 'bg-primary'}`}
                style={{ width: `${stockPct}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'minStockLevel',
      meta: { label: 'Min. Stok' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Min. Stok" />
      ),
      cell: ({ row }) => {
        const material = row.original;
        const unitShort = UNIT_SHORT[material.unit] || material.unit;
        return (
          <span className="text-sm text-muted-foreground">
            {formatQuantity(Number(material.minStockLevel))} {unitShort}
          </span>
        );
      },
    },
    {
      accessorKey: 'lastPurchasePrice',
      meta: { label: 'Son Alış Fiyatı' },
      header: ({ column }) => (
        <div className="text-right">
          <DataTableColumnHeader column={column} title="Son Alış Fiyatı" />
        </div>
      ),
      cell: ({ row }) => {
        const material = row.original;
        const unitShort = UNIT_SHORT[material.unit] || material.unit;
        return (
          <div className="text-right">
            <p className="text-sm font-bold text-foreground">
              ₺{formatCurrency(Number(material.lastPurchasePrice))}
            </p>
            <p className="text-[10px] text-muted-foreground">/{unitShort}</p>
          </div>
        );
      },
    },
    {
      id: 'stockStatus',
      meta: { label: 'Stok Durumu' },
      header: 'Stok Durumu',
      enableSorting: false,
      cell: ({ row }) => {
        const low = isLowStock(row.original);
        return low ? (
          <Badge variant="destructive" className="text-[10px] font-bold uppercase">
            {t('critical')}
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-[10px] font-bold uppercase">
            {t('normal')}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const material = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <span className="sr-only">Menüyü aç</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEdit(material)}>
                Düzenle
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => {
                  if (confirm(tc('confirm') + '?')) {
                    deleteMutation.mutate(material.id);
                  }
                }}
              >
                Sil
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // Tab filter buttons passed as toolbarChildren
  const tabButtons = (
    <div className="flex gap-2 flex-wrap">
      {[{ key: 'ALL', label: 'Tümü' }, ...materialTypes.map((mt) => ({ key: mt.name, label: mt.name }))].map((tab) => (
        <Button
          key={tab.key}
          onClick={() => setActiveTab(tab.key)}
          variant={activeTab === tab.key ? 'default' : 'secondary'}
          size="sm"
          className="rounded-full"
        >
          {tab.label}
          <span className="ml-1.5 opacity-70">
            ({tab.key === 'ALL' ? materials.length : materials.filter((m) => m.type === tab.key).length})
          </span>
        </Button>
      ))}
    </div>
  );

  // Suppress unused variable warning
  void totalStockValue;

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-[1600px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <nav className="flex gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            <span>HepyOnet</span>
            <span>/</span>
            <span className="text-primary">Stok Yönetimi</span>
          </nav>
          <h1 className="text-4xl font-extrabold tracking-tight text-primary font-headline">{t('title')}</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" className="rounded-xl px-5 py-3 h-auto" asChild>
            <Link href="/dashboard/inventory/suppliers">
              <Truck className="size-5" />
              Tedarikçiler
            </Link>
          </Button>
          <Button
            variant="secondary"
            className="rounded-xl px-5 py-3 h-auto"
            onClick={() => setTypeDialogOpen(true)}
          >
            <Tag className="size-5" />
            Stok Tipleri
          </Button>
          <Button variant="ghost" size="icon" title="Dışa Aktar">
            <Download className="size-5" />
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => setDialogOpen(open)}>
            <Button
              className="rounded-xl px-6 py-3 h-auto bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95"
              onClick={openCreate}
            >
              <Plus className="size-5" />
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
                  <Select
                    value={form.type || undefined}
                    onValueChange={(value) => setForm({ ...form, type: value })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={materialTypes.length === 0 ? 'Tip tanımlanmamış' : 'Stok tipi seçin'} />
                    </SelectTrigger>
                    <SelectContent>
                      {materialTypes.map((mt) => (
                        <SelectItem key={mt.id} value={mt.name}>{mt.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('unit')}</Label>
                  <Select
                    value={form.unit}
                    onValueChange={(value) => setForm({ ...form, unit: value })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map((u) => (
                        <SelectItem key={u} value={u}>
                          {t(`units.${u}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tedarikçi</Label>
                  <Select
                    value={form.supplierId || 'none'}
                    onValueChange={(value) => setForm({ ...form, supplierId: value === 'none' ? '' : value })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Tedarikçi seçilmedi" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Tedarikçi seçilmedi</SelectItem>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

      {/* Bento Grid - Stats & Alert */}
      <div className="grid grid-cols-12 gap-6">
        {/* Critical Alert Card */}
        {lowStockMaterials.length > 0 && (
          <div className={`col-span-12 ${totalStockValue > 0 ? 'lg:col-span-8' : ''} bg-destructive/10 p-1 rounded-3xl border border-destructive/10 overflow-hidden`}>
            <div className="bg-card/60 backdrop-blur-sm p-6 rounded-[22px] flex items-center justify-between h-full">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-2xl flex items-center justify-center shrink-0">
                  <AlertTriangle className="size-9" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-destructive">{t('lowStockAlert')}</h3>
                  <p className="text-destructive/70 text-sm mt-1">
                    Şu anda <span className="font-bold">{lowStockMaterials.length} ürün</span> kritik seviyenin altında. Operasyonun aksamaması için sipariş oluşturun.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Data Table Section */}
      <div className="bg-muted rounded-[32px] p-2">
        <div className="bg-card rounded-[28px] shadow-xs p-6 md:p-8">
          <DataTable
            columns={columns}
            data={filteredMaterials}
            searchPlaceholder="Stok kalemi ara..."
            isLoading={isLoading}
            globalFilterFn={globalFilterFn}
            emptyMessage={t('materialNotFound')}
            initialColumnVisibility={initialColumnVisibility}
            toolbarChildren={tabButtons}
            pageSize={50}
          />
        </div>
      </div>

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
                          if (confirm(`"${mt.name}" tipini silmek istediğinize emin misiniz?`)) {
                            deleteTypeMutation.mutate(mt.id);
                          }
                        }}
                        disabled={deleteTypeMutation.isPending}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
              {materialTypes.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Henüz stok tipi tanımlanmamış
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
