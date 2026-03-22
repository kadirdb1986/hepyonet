'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';
import api from '@/lib/api';
import { handleNumericInput, displayNumericValue, parseNumericValue } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table';
import { toast } from 'sonner';
import {
  ChevronRight,
  Tag,
  GripVertical,
  Plus,
  Search,
  Pencil,
  Trash2,
  PlusCircle,
  MoreHorizontal,
} from 'lucide-react';

interface Ingredient {
  id: string;
  rawMaterialId: string | null;
  subProductId: string | null;
  quantity: number;
  unit: string;
}

interface Product {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  image: string | null;
  price: number;
  isMenuItem: boolean;
  isComposite: boolean;
  categoryId: string | null;
  category: { id: string; name: string } | null;
  calculatedCost?: number;
  profitMargin?: number;
  ingredients?: Ingredient[];
}

interface RawMaterial {
  id: string;
  name: string;
  unit: string;
  lastPurchasePrice: number;
}

/** Para formatla: her zaman 2 küsürat, Türkiye formatı (1.000,00) */
function formatCurrency(val: number): string {
  return val.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Yüzde formatla: virgülle, 1 küsürat */
function formatPercent(val: number): string {
  return val.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function getProductType(product: Product): { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' } {
  const ingredients = product.ingredients || [];

  if (ingredients.length === 0) {
    return { label: 'Direkt Satış', variant: 'outline' };
  }

  const hasSubProduct = ingredients.some((i) => i.subProductId != null);
  const hasRawMaterial = ingredients.some((i) => i.rawMaterialId != null);

  if (hasSubProduct) {
    return { label: 'Kompozit', variant: 'destructive' };
  }

  if (hasRawMaterial && ingredients.length === 1 && ingredients[0].unit === 'ADET' && Number(ingredients[0].quantity) === 1) {
    return { label: 'Direkt Satış', variant: 'outline' };
  }

  if (hasRawMaterial) {
    return { label: 'Reçeteli', variant: 'default' };
  }

  return { label: 'Direkt Satış', variant: 'outline' };
}

/** İsmin baş harflerini al (en fazla 2 harf) */
function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

export default function ProductsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [directSaleDialogOpen, setDirectSaleDialogOpen] = useState(false);
  const [selectedRawMaterialId, setSelectedRawMaterialId] = useState('');
  const [directSalePrice, setDirectSalePrice] = useState<string>('');

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => api.get('/products').then((r) => r.data),
  });

  const { data: rawMaterials = [] } = useQuery<RawMaterial[]>({
    queryKey: ['raw-materials'],
    queryFn: () => api.get('/raw-materials').then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Ürün başarıyla silindi');
    },
    onError: () => {
      toast.error('Ürün silinirken hata oluştu');
    },
  });

  const createDirectSaleMutation = useMutation({
    mutationFn: async () => {
      const rm = rawMaterials.find((m) => m.id === selectedRawMaterialId);
      if (!rm) throw new Error('Ham madde bulunamadi');

      const res = await api.post('/products', {
        name: rm.name,
        price: parseNumericValue(directSalePrice),
        isMenuItem: true,
        isComposite: false,
      });

      await api.post(`/products/${res.data.id}/ingredients`, {
        rawMaterialId: rm.id,
        quantity: 1,
        unit: 'ADET',
      });

      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setDirectSaleDialogOpen(false);
      setSelectedRawMaterialId('');
      setDirectSalePrice('');
      toast.success('Direkt satış ürünü oluşturuldu');
      router.push(`/dashboard/products/${data.id}`);
    },
    onError: () => {
      toast.error('Ürün oluşturulurken hata oluştu');
    },
  });

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.code && p.code.toLowerCase().includes(search.toLowerCase())) ||
      (p.category?.name && p.category.name.toLowerCase().includes(search.toLowerCase()))
  );

  const menuProducts = filtered.filter((p) => p.isMenuItem);
  const intermediateProducts = filtered.filter((p) => !p.isMenuItem);

  function handleDirectSaleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRawMaterialId) {
      toast.error('Lütfen bir stok kalemi seçin');
      return;
    }
    if (parseNumericValue(directSalePrice) <= 0) {
      toast.error('Lütfen geçerli bir satış fiyatı girin');
      return;
    }
    createDirectSaleMutation.mutate();
  }

  const menuColumns: ColumnDef<Product>[] = [
    {
      accessorKey: 'name',
      meta: { label: 'Ürün Adı' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Ürün Adı" />,
      cell: ({ row }) => {
        const product = row.original;
        return (
          <div className="flex items-center gap-3">
            {product.image ? (
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted shrink-0">
                <img alt={product.name} className="w-full h-full object-cover" src={product.image} />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-primary font-extrabold text-sm shrink-0">
                {getInitials(product.name)}
              </div>
            )}
            <span className="font-semibold text-primary">{product.name}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'code',
      meta: { label: 'Kod' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Kod" />,
      cell: ({ row }) => (
        <span className="font-mono text-border">{row.original.code || '-'}</span>
      ),
    },
    {
      id: 'category',
      accessorFn: (row) => row.category?.name ?? '',
      meta: { label: 'Kategori' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Kategori" />,
      cell: ({ row }) =>
        row.original.category?.name ? (
          <Badge variant="secondary">{row.original.category.name}</Badge>
        ) : (
          '-'
        ),
    },
    {
      accessorKey: 'price',
      meta: { label: 'Satış Fiyatı' },
      header: ({ column }) => (
        <div className="text-right">
          <DataTableColumnHeader column={column} title="Satış Fiyatı" />
        </div>
      ),
      cell: ({ row }) => {
        const price = Number(row.original.price);
        return (
          <div className="text-right font-bold text-foreground">
            {price > 0 ? `${formatCurrency(price)} TL` : <span className="text-muted-foreground">-</span>}
          </div>
        );
      },
    },
    {
      accessorKey: 'calculatedCost',
      meta: { label: 'Maliyet' },
      header: ({ column }) => (
        <div className="text-right">
          <DataTableColumnHeader column={column} title="Maliyet" />
        </div>
      ),
      cell: ({ row }) => {
        const cost = row.original.calculatedCost;
        return (
          <div className="text-right text-muted-foreground">
            {cost != null && Number(cost) > 0 ? `${formatCurrency(Number(cost))} TL` : '-'}
          </div>
        );
      },
    },
    {
      id: 'profitMargin',
      accessorFn: (row) => {
        const margin = row.profitMargin;
        const price = Number(row.price);
        return margin != null && price > 0 ? Number(margin) : null;
      },
      meta: { label: 'Kar Marjı' },
      header: ({ column }) => (
        <div className="text-right">
          <DataTableColumnHeader column={column} title="Kar Marjı" />
        </div>
      ),
      cell: ({ row }) => {
        const margin = row.original.profitMargin;
        const price = Number(row.original.price);
        if (margin == null || price <= 0) {
          return <div className="text-right">-</div>;
        }
        const m = Number(margin);
        return (
          <div className="text-right">
            <Badge
              variant="secondary"
              className={`font-extrabold ${m >= 30 ? 'text-green-600' : 'text-yellow-600'}`}
            >
              %{formatPercent(m)}
            </Badge>
          </div>
        );
      },
    },
    {
      id: 'type',
      meta: { label: 'Tip' },
      header: 'Tip',
      cell: ({ row }) => {
        const productType = getProductType(row.original);
        return <Badge variant={productType.variant}>{productType.label}</Badge>;
      },
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const product = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <span className="sr-only">Menüyü aç</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/dashboard/products/${product.id}`)}>
                <Pencil className="h-4 w-4 mr-2" />
                Düzenle
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => {
                  if (confirm('Bu ürünü silmek istediğinize emin misiniz?')) {
                    deleteMutation.mutate(product.id);
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Sil
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  if (isLoading) {
    return <div className="p-6 text-muted-foreground">Yükleniyor...</div>;
  }

  return (
    <div className="p-6 md:px-8 md:pb-12 space-y-10">
      {/* Page Header & Global Actions */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <span>Panel</span>
            <ChevronRight className="size-4" />
            <span className="text-primary font-bold">Ürünler</span>
          </nav>
          <h1 className="text-4xl font-extrabold tracking-tight text-primary font-headline">Ürünler</h1>
          <p className="text-muted-foreground mt-1">Restoran menüsü ve ara ürün envanterini buradan yönetin.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={() => router.push('/dashboard/products/categories')}
          >
            <Tag className="size-5" />
            Kategoriler
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setSelectedRawMaterialId('');
              setDirectSalePrice('');
              setDirectSaleDialogOpen(true);
            }}
          >
            <GripVertical className="size-4" />
            Stok Kaleminden Ürün Oluştur
          </Button>
          <Button
            onClick={() => router.push('/dashboard/products/new')}
          >
            <Plus className="size-5" />
            Yeni Ürün
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Ara (ad, kod, kategori)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 rounded-full bg-muted border-none focus-visible:ring-primary/20"
        />
      </div>

      {/* Main Sections */}
      <div className="space-y-8">
        {/* Section: Menü Ürünleri */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-2 h-8 bg-primary rounded-full"></span>
              <h2 className="text-2xl font-bold tracking-tight text-foreground font-headline">Menü Ürünleri</h2>
              <span className="text-sm text-muted-foreground">({menuProducts.length})</span>
            </div>
            <Button variant="link" className="p-0 h-auto text-sm font-semibold">Tümünü Gör</Button>
          </div>
          <DataTable
            columns={menuColumns}
            data={menuProducts}
            showToolbar={false}
            isLoading={isLoading}
            emptyMessage="Henüz menü ürünü bulunamadı"
          />
        </section>

        {/* Section: Ara Ürünler (Card Grid Layout) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-2 h-8 bg-muted-foreground/40 rounded-full"></span>
              <h2 className="text-2xl font-bold tracking-tight text-foreground font-headline">Ara Ürünler</h2>
              <span className="text-sm text-muted-foreground">({intermediateProducts.length})</span>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {intermediateProducts.map((product) => {
              const ingredientCount = product.ingredients?.length ?? 0;
              const costValue = product.calculatedCost != null && Number(product.calculatedCost) > 0 ? Number(product.calculatedCost) : null;
              const isHighCost = costValue != null && costValue > 2000;

              return (
                <div
                  key={product.id}
                  className="bg-card p-5 rounded-xl shadow-xs hover:shadow-md transition-shadow flex items-center justify-between group border-l-4 border-transparent hover:border-primary cursor-pointer"
                  onClick={() => router.push(`/dashboard/products/${product.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-muted rounded-xl flex items-center justify-center text-primary font-extrabold text-xl shrink-0">
                      {getInitials(product.name)}
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground">{product.name}</h4>
                      <p className="text-xs text-muted-foreground font-mono">{product.code || '-'}</p>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {product.category?.name && (
                          <span className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground font-medium">{product.category.name}</span>
                        )}
                        {costValue != null && (
                          <Badge variant={isHighCost ? 'destructive' : 'secondary'} className="text-[10px]">
                            Maliyet: {formatCurrency(costValue)} TL
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">İçerik</p>
                      <p className="text-lg font-black text-primary font-headline">{ingredientCount}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full hover:bg-primary/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/products/${product.id}`);
                      }}
                      title="Düzenle"
                    >
                      <Pencil className="size-4 text-primary" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Bu ürünü silmek istediğinize emin misiniz?')) deleteMutation.mutate(product.id);
                      }}
                      title="Sil"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {/* Hızlı Ara Ürün Ekle */}
            <Button
              variant="outline"
              className="border-2 border-dashed border-border/50 rounded-xl p-5 h-auto flex flex-col items-center justify-center gap-2 hover:bg-muted hover:border-primary min-h-[96px]"
              onClick={() => router.push('/dashboard/products/new')}
            >
              <PlusCircle className="size-5" />
              <span className="text-sm font-bold">Hızlı Ara Ürün Ekle</span>
            </Button>
          </div>

          {intermediateProducts.length === 0 && (
            <p className="text-center text-muted-foreground py-4">Henüz ara ürün bulunamadı</p>
          )}
        </section>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2 pt-4">
        <p className="text-xs text-muted-foreground font-medium">Toplam {products.length} ürün</p>
      </div>

      {/* Stok Kaleminden Direkt Satış Ürünü Oluşturma Dialogu */}
      <Dialog open={directSaleDialogOpen} onOpenChange={setDirectSaleDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Stok Kaleminden Ürün Oluştur</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Seçtiğiniz stok kalemi, 1 ADET olarak ürünün içeriği haline gelir. Örneğin &quot;Şişe Kola&quot; stok kalemini seçip satış fiyatı belirleyebilirsiniz.
          </p>
          <form onSubmit={handleDirectSaleSubmit} className="space-y-4">
            <div>
              <Label>Stok Kalemi</Label>
              <Select
                value={selectedRawMaterialId || undefined}
                onValueChange={(value) => setSelectedRawMaterialId(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Stok kalemi seçin..." />
                </SelectTrigger>
                <SelectContent>
                  {rawMaterials.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name} ({m.unit}) - {formatCurrency(Number(m.lastPurchasePrice))} TL
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Satış Fiyatı (TL)</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={displayNumericValue(directSalePrice)}
                onChange={(e) => setDirectSalePrice(handleNumericInput(e.target.value))}
                placeholder="Örnek: 25,00"
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDirectSaleDialogOpen(false)}>
                İptal
              </Button>
              <Button type="submit" disabled={createDirectSaleMutation.isPending}>
                {createDirectSaleMutation.isPending ? 'Oluşturuluyor...' : 'Oluştur'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
