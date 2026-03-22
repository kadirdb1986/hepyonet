'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { handleNumericInput, displayNumericValue, parseNumericValue } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Plus, Pencil, Trash2, X, Check, Truck, Tag, AlertTriangle,
  Search, SlidersHorizontal, Download, Package, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

interface Supplier {
  id: string;
  name: string;
  description: string | null;
  deliveryType: string | null;
  phone: string | null;
}

const DELIVERY_TYPES = ['Kargo', 'Ayaga Hizmet', 'Kendin Gidip Aliyorsun'] as const;

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

/** Sadece rakamları al (kayıt için) */
function stripPhone(formatted: string): string {
  return formatted.replace(/\D/g, '');
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
  { key: 'supplier', label: 'Tedarikçi' },
  { key: 'currentStock', label: 'Mevcut Stok' },
  { key: 'minStockLevel', label: 'Minimum Stok' },
  { key: 'lastPurchasePrice', label: 'Son Alış Fiyatı' },
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
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="text-sm font-medium underline decoration-dotted underline-offset-2 cursor-pointer hover:text-primary"
        >
          {supplier.name}
        </button>
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
  // max stock estimated as 5x min
  const max = min * 5;
  return Math.min(100, Math.max(5, (current / max) * 100));
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

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

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
    queryFn: () => api.get('/restaurants/current').then((r) => r.data),
  });

  const savedColumns = restaurantData?.settings?.inventoryColumns as string[] | undefined;
  const visibleColumns = savedColumns ?? DEFAULT_VISIBLE_COLUMNS;

  const columnSettingsMutation = useMutation({
    mutationFn: (columns: string[]) =>
      api.patch('/restaurants/current/settings', { settings: { inventoryColumns: columns } }),
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

  function isLowStock(material: RawMaterial) {
    return Number(material.minStockLevel) > 0 && Number(material.currentStock) <= Number(material.minStockLevel);
  }

  // Compute total stock value
  const totalStockValue = materials.reduce((sum, m) => {
    return sum + Number(m.currentStock) * Number(m.lastPurchasePrice);
  }, 0);

  // Filtered materials
  const filteredMaterials = materials.filter(
    (m) =>
      (activeTab === 'ALL' || m.type === activeTab) &&
      (!searchQuery || m.name.toLocaleLowerCase('tr-TR').includes(searchQuery.toLocaleLowerCase('tr-TR')))
  );

  // Pagination logic
  const totalItems = filteredMaterials.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedMaterials = filteredMaterials.slice(
    (safeCurrentPage - 1) * itemsPerPage,
    safeCurrentPage * itemsPerPage
  );

  // Reset to page 1 when filter/search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);

  // Count visible data columns (for colspan)
  const visibleDataColCount = (() => {
    let count = 1; // name column always visible
    if (isColumnVisible('type')) count++;
    if (isColumnVisible('supplier')) count++;
    if (isColumnVisible('currentStock')) count++;
    if (isColumnVisible('minStockLevel')) count++;
    if (isColumnVisible('lastPurchasePrice')) count++;
    if (isColumnVisible('stockStatus')) count++;
    count++; // actions column
    return count;
  })();

  if (isLoading) {
    return <div className="p-6 text-muted-foreground">{tc('loading')}</div>;
  }

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
          <Link href="/dashboard/inventory/suppliers">
            <button className="flex items-center gap-2 px-5 py-3 rounded-xl bg-secondary text-muted-foreground font-semibold text-sm hover:brightness-95 transition-all active:scale-95">
              <Truck className="size-5" />
              Tedarikçiler
            </button>
          </Link>
          <button
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-secondary text-muted-foreground font-semibold text-sm hover:brightness-95 transition-all active:scale-95"
            onClick={() => setTypeDialogOpen(true)}
          >
            <Tag className="size-5" />
            Stok Tipleri
          </button>
          <Dialog open={dialogOpen} onOpenChange={(open) => setDialogOpen(open)}>
            <button
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-white font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all active:scale-95"
              onClick={openCreate}
            >
              <Plus className="size-5" />
              {t('addMaterial')}
            </button>
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
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  >
                    {materialTypes.length === 0 && <option value="">Tip tanımlanmamış</option>}
                    {materialTypes.map((mt) => (
                      <option key={mt.id} value={mt.name}>{mt.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>{t('unit')}</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
                  <Label>Tedarikçi</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={form.supplierId}
                    onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
                  >
                    <option value="">Tedarikçi seçilmedi</option>
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

      {/* Bento Grid - Stats & Alert */}
      <div className="grid grid-cols-12 gap-6">
        {/* Critical Alert Card */}
        {lowStockMaterials.length > 0 && (
          <div className={`col-span-12 ${totalStockValue > 0 ? 'lg:col-span-8' : ''} bg-destructive/10 p-1 rounded-3xl border border-destructive/10 overflow-hidden`}>
            <div className="bg-white/60 backdrop-blur-sm p-6 rounded-[22px] flex items-center justify-between h-full">
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

      {/* Filters & Main Data Table Section */}
      <div className="bg-muted rounded-[32px] p-2">
        <div className="bg-white rounded-[28px] shadow-xs p-6 md:p-8">
          {/* Filter Chips & Actions */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
            <div className="flex gap-2 flex-wrap">
              {[{ key: 'ALL', label: 'Tümü' }, ...materialTypes.map((mt) => ({ key: mt.name, label: mt.name }))].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-5 py-2 rounded-full text-xs font-bold transition-colors ${
                    activeTab === tab.key
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {tab.label}
                  <span className="ml-1.5 opacity-70">
                    ({tab.key === 'ALL' ? materials.length : materials.filter((m) => m.type === tab.key).length})
                  </span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  placeholder="Stok kalemi ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-9 py-2 bg-muted border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 w-56 outline-none"
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
              {/* Column toggle */}
              <div className="relative" ref={columnMenuRef}>
                <button
                  onClick={() => setColumnMenuOpen((v) => !v)}
                  className="p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                  title="Sütunları Ayarla"
                >
                  <SlidersHorizontal className="size-5" />
                </button>
                {columnMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 z-50 w-52 rounded-xl border bg-white p-1 shadow-lg">
                    <p className="px-3 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Görünür Sütunlar</p>
                    <div className="h-px bg-border/30 my-1" />
                    {TOGGLEABLE_COLUMNS.map((col) => (
                      <label
                        key={col.key}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer hover:bg-muted transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={isColumnVisible(col.key)}
                          onChange={() => toggleColumn(col.key)}
                          className="h-4 w-4 rounded border-border accent-primary"
                        />
                        {col.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {/* Download */}
              <button className="p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors" title="Dışa Aktar">
                <Download className="size-5" />
              </button>
            </div>
          </div>

          {/* Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground rounded-l-xl">{t('name')}</th>
                  {isColumnVisible('type') && (
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Tip</th>
                  )}
                  {isColumnVisible('supplier') && (
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Tedarikçi</th>
                  )}
                  {isColumnVisible('currentStock') && (
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Mevcut Stok</th>
                  )}
                  {isColumnVisible('minStockLevel') && (
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Min. Stok</th>
                  )}
                  {isColumnVisible('lastPurchasePrice') && (
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground text-right">Son Alış Fiyatı</th>
                  )}
                  {isColumnVisible('stockStatus') && (
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground text-center">Durum</th>
                  )}
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground rounded-r-xl text-center">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-transparent">
                {paginatedMaterials.map((material) => {
                  const unitLabel = UNIT_LABELS[material.unit] || material.unit;
                  const unitShort = UNIT_SHORT[material.unit] || material.unit;
                  const low = isLowStock(material);
                  const stockPct = getStockPercent(material);

                  return (
                    <tr key={material.id} className="hover:bg-muted transition-colors group">
                      {/* Name */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                            <Package className="size-5" />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-foreground">{material.name}</p>
                            <p className="text-[10px] text-muted-foreground">{material.type || '-'} / {unitLabel}</p>
                          </div>
                        </div>
                      </td>
                      {/* Type */}
                      {isColumnVisible('type') && (
                        <td className="px-6 py-5">
                          <span className="px-3 py-1 bg-muted text-foreground rounded-full text-[10px] font-medium uppercase tracking-tight">
                            {material.type || '-'}
                          </span>
                        </td>
                      )}
                      {/* Supplier */}
                      {isColumnVisible('supplier') && (
                        <td className="px-6 py-5">
                          {material.supplier ? (
                            <SupplierPopover supplier={material.supplier} />
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </td>
                      )}
                      {/* Current Stock with progress bar */}
                      {isColumnVisible('currentStock') && (
                        <td className="px-6 py-5">
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
                        </td>
                      )}
                      {/* Min Stock Level */}
                      {isColumnVisible('minStockLevel') && (
                        <td className="px-6 py-5 text-sm text-muted-foreground">
                          {formatQuantity(Number(material.minStockLevel))} {unitShort}
                        </td>
                      )}
                      {/* Last Purchase Price */}
                      {isColumnVisible('lastPurchasePrice') && (
                        <td className="px-6 py-5 text-right">
                          <p className="text-sm font-bold text-foreground">
                            ₺{formatCurrency(Number(material.lastPurchasePrice))}
                          </p>
                          <p className="text-[10px] text-muted-foreground">/{unitShort}</p>
                        </td>
                      )}
                      {/* Stock Status */}
                      {isColumnVisible('stockStatus') && (
                        <td className="px-6 py-5 text-center">
                          {low ? (
                            <span className="px-3 py-1 bg-destructive/10 text-destructive rounded-full text-[10px] font-bold uppercase">
                              {t('critical')}
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-secondary text-primary rounded-full text-[10px] font-bold uppercase">
                              {t('normal')}
                            </span>
                          )}
                        </td>
                      )}
                      {/* Actions - visible on hover */}
                      <td className="px-6 py-5">
                        <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            className="p-2 text-primary hover:bg-primary/5 rounded-lg transition-colors"
                            onClick={() => openEdit(material)}
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            className="p-2 text-destructive hover:bg-destructive/5 rounded-lg transition-colors"
                            onClick={() => {
                              if (confirm(tc('confirm') + '?')) {
                                deleteMutation.mutate(material.id);
                              }
                            }}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredMaterials.length === 0 && (
                  <tr>
                    <td colSpan={visibleDataColCount} className="text-center text-muted-foreground py-12">
                      <div className="flex flex-col items-center gap-2">
                        <Package className="size-12 text-border" />
                        <p className="text-sm">
                          {searchQuery ? `"${searchQuery}" ile eşleşen stok kalemi bulunamadı` : t('materialNotFound')}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 pt-8 flex items-center justify-between border-t border-border/10">
              <p className="text-xs text-muted-foreground">
                Toplam {totalItems} stok kaleminden {(safeCurrentPage - 1) * itemsPerPage + 1}-{Math.min(safeCurrentPage * itemsPerPage, totalItems)} arası gösteriliyor
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safeCurrentPage <= 1}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="size-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => {
                    // Show first, last, current, and neighbors
                    if (page === 1 || page === totalPages) return true;
                    if (Math.abs(page - safeCurrentPage) <= 1) return true;
                    return false;
                  })
                  .reduce<(number | string)[]>((acc, page, idx, arr) => {
                    if (idx > 0) {
                      const prev = arr[idx - 1];
                      if (typeof prev === 'number' && page - prev > 1) {
                        acc.push('...');
                      }
                    }
                    acc.push(page);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    typeof item === 'string' ? (
                      <span key={`ellipsis-${idx}`} className="w-8 h-8 flex items-center justify-center text-xs text-muted-foreground">...</span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => setCurrentPage(item)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${
                          item === safeCurrentPage
                            ? 'bg-primary text-white'
                            : 'text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        {item}
                      </button>
                    )
                  )}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage >= totalPages}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          )}
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
