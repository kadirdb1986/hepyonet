'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, Save, Settings2 } from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ───

interface SimProduct {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  salePrice: number;
  costPrice: number;
}

interface SimExpense {
  id: string;
  name: string;
  amount: number;
  type: 'PERSONNEL' | 'FIXED' | 'FOOD_COST';
  productId?: string;
}

interface SimulationData {
  id: string;
  name: string;
  month: string;
  kdvRate: number;
  incomeTaxRate: number;
  products: SimProduct[];
  expenses: SimExpense[];
}

// ─── Helpers ───

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);

function formatMonth(ym: string): string {
  const [y, m] = ym.split('-');
  const months = ['Oca', 'Sub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Agu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

export default function SimulationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const id = params.id as string;

  // ─── Local State ───
  const [products, setProducts] = useState<SimProduct[]>([]);
  const [expenses, setExpenses] = useState<SimExpense[]>([]);
  const [kdvRate, setKdvRate] = useState<number>(10);
  const [incomeTaxRate, setIncomeTaxRate] = useState<number>(20);
  const [isPriceDialogOpen, setIsPriceDialogOpen] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // ─── Fetch Simulation ───
  const { data: simulation, isLoading } = useQuery<SimulationData>({
    queryKey: ['simulation', id],
    queryFn: () => api.get(`/simulations/${id}`).then((r) => r.data),
  });

  // Initialize local state from fetched data
  useEffect(() => {
    if (simulation && !initialized) {
      setProducts(simulation.products.map((p) => ({ ...p })));
      setExpenses(simulation.expenses.map((e) => ({ ...e })));
      setKdvRate(simulation.kdvRate ?? 10);
      setIncomeTaxRate(simulation.incomeTaxRate ?? 20);
      setInitialized(true);
    }
  }, [simulation, initialized]);

  // ─── Recalculate food costs when products change ───
  useEffect(() => {
    if (!initialized) return;
    setExpenses((prev) =>
      prev.map((exp) => {
        if (exp.type !== 'FOOD_COST') return exp;
        const product = products.find((p) => p.id === exp.productId || p.productId === exp.productId);
        if (!product) return exp;
        return { ...exp, amount: product.quantity * product.costPrice };
      }),
    );
  }, [products, initialized]);

  // ─── Calculations ───
  const totalRevenue = useMemo(
    () => products.reduce((sum, p) => sum + p.quantity * p.salePrice, 0),
    [products],
  );

  const totalExpense = useMemo(
    () => expenses.reduce((sum, e) => sum + e.amount, 0),
    [expenses],
  );

  const grossProfit = totalRevenue - totalExpense;

  const kdvRevenue = totalRevenue * kdvRate / (100 + kdvRate);
  const kdvExpense = totalExpense * kdvRate / (100 + kdvRate);

  const profitBeforeTax = grossProfit - (kdvRevenue - kdvExpense);
  const incomeTax = Math.max(0, profitBeforeTax * incomeTaxRate / 100);
  const netProfit = profitBeforeTax - incomeTax;

  // ─── Expense groups ───
  const personnelExpenses = expenses.filter((e) => e.type === 'PERSONNEL');
  const fixedExpenses = expenses.filter((e) => e.type === 'FIXED');
  const foodCostExpenses = expenses.filter((e) => e.type === 'FOOD_COST');

  const personnelTotal = personnelExpenses.reduce((sum, e) => sum + e.amount, 0);
  const fixedTotal = fixedExpenses.reduce((sum, e) => sum + e.amount, 0);
  const foodCostTotal = foodCostExpenses.reduce((sum, e) => sum + e.amount, 0);

  // ─── Product handlers ───
  const updateProductQuantity = (productId: string, quantity: number) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, quantity: Math.max(0, quantity) } : p)),
    );
  };

  const updateProductSalePrice = (productId: string, salePrice: number) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, salePrice: Math.max(0, salePrice) } : p)),
    );
  };

  const updateProductCostPrice = (productId: string, costPrice: number) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, costPrice: Math.max(0, costPrice) } : p)),
    );
  };

  // ─── Expense handlers ───
  const updateFixedExpenseAmount = (expenseId: string, amount: number) => {
    setExpenses((prev) =>
      prev.map((e) => (e.id === expenseId ? { ...e, amount: Math.max(0, amount) } : e)),
    );
  };

  // ─── Save mutation ───
  const saveMutation = useMutation({
    mutationFn: (data: {
      kdvRate: number;
      incomeTaxRate: number;
      products: { id: string; quantity: number; salePrice: number; costPrice: number }[];
      expenses: { id: string; amount: number }[];
    }) => api.patch(`/simulations/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['simulation', id] });
      setInitialized(false);
      toast.success('Simulasyon kaydedildi');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Simulasyon kaydedilirken hata olustu');
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      kdvRate,
      incomeTaxRate,
      products: products.map((p) => ({
        id: p.id,
        quantity: p.quantity,
        salePrice: p.salePrice,
        costPrice: p.costPrice,
      })),
      expenses: expenses.map((e) => ({
        id: e.id,
        amount: e.amount,
      })),
    });
  };

  if (isLoading || !simulation) {
    return <div className="p-6 text-muted-foreground">Yukleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      {/* ─── Top Bar ─── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/dashboard/simulation')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {simulation.name} - {formatMonth(simulation.month)}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsPriceDialogOpen(true)}>
            <Settings2 className="mr-2 h-4 w-4" />
            Urun Fiyatlari
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {saveMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </div>
      </div>

      {/* ─── Product Prices Dialog ─── */}
      <Dialog open={isPriceDialogOpen} onOpenChange={setIsPriceDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Simulasyon Urun Fiyatlari</DialogTitle>
            <DialogDescription>
              Bu degisiklikler sadece bu simulasyona ozeldir
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Urun</TableHead>
                  <TableHead className="text-right">Satis Fiyati</TableHead>
                  <TableHead className="text-right">Maliyet Fiyati</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={product.salePrice}
                        onChange={(e) =>
                          updateProductSalePrice(product.id, parseFloat(e.target.value) || 0)
                        }
                        className="w-28 h-8 text-right ml-auto"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={product.costPrice}
                        onChange={(e) =>
                          updateProductCostPrice(product.id, parseFloat(e.target.value) || 0)
                        }
                        className="w-28 h-8 text-right ml-auto"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Two Column Layout ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ─── Left Column: Gelirler ─── */}
        <Card>
          <CardHeader>
            <CardTitle>Gelirler</CardTitle>
          </CardHeader>
          <CardContent>
            {products.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Urun bulunmuyor</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Urun</TableHead>
                      <TableHead className="text-right w-[90px]">Adet</TableHead>
                      <TableHead className="text-right">Birim Fiyat</TableHead>
                      <TableHead className="text-right">Toplam</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min="0"
                            value={product.quantity}
                            onChange={(e) =>
                              updateProductQuantity(product.id, parseInt(e.target.value, 10) || 0)
                            }
                            className="w-20 h-8 text-right ml-auto"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(product.salePrice)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(product.quantity * product.salePrice)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <div className="mt-4 flex items-center justify-between px-2 py-3 bg-muted/50 rounded-md">
              <span className="font-medium">Toplam Ciro</span>
              <span className="font-bold text-lg">{formatCurrency(totalRevenue)}</span>
            </div>
          </CardContent>
        </Card>

        {/* ─── Right Column: Giderler ─── */}
        <Card>
          <CardHeader>
            <CardTitle>Giderler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Personel Giderleri */}
            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
                Personel Giderleri
              </h3>
              {personnelExpenses.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">Personel gideri bulunmuyor</p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ad</TableHead>
                        <TableHead className="text-right">Tutar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {personnelExpenses.map((exp) => (
                        <TableRow key={exp.id}>
                          <TableCell>{exp.name}</TableCell>
                          <TableCell className="text-right">{formatCurrency(exp.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <div className="mt-2 flex items-center justify-between px-2 py-1.5 text-sm">
                <span className="text-muted-foreground">Alt Toplam</span>
                <span className="font-medium">{formatCurrency(personnelTotal)}</span>
              </div>
            </div>

            {/* Sabit Giderler */}
            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
                Sabit Giderler
              </h3>
              {fixedExpenses.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">Sabit gider bulunmuyor</p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ad</TableHead>
                        <TableHead className="text-right w-[140px]">Tutar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fixedExpenses.map((exp) => (
                        <TableRow key={exp.id}>
                          <TableCell>{exp.name}</TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={exp.amount}
                              onChange={(e) =>
                                updateFixedExpenseAmount(exp.id, parseFloat(e.target.value) || 0)
                              }
                              className="w-32 h-8 text-right ml-auto"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <div className="mt-2 flex items-center justify-between px-2 py-1.5 text-sm">
                <span className="text-muted-foreground">Alt Toplam</span>
                <span className="font-medium">{formatCurrency(fixedTotal)}</span>
              </div>
            </div>

            {/* Gida Maliyetleri */}
            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
                Gida Maliyetleri
              </h3>
              {foodCostExpenses.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">Gida maliyeti bulunmuyor</p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ad</TableHead>
                        <TableHead className="text-right">Tutar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {foodCostExpenses.map((exp) => (
                        <TableRow key={exp.id}>
                          <TableCell>{exp.name}</TableCell>
                          <TableCell className="text-right">{formatCurrency(exp.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <div className="mt-2 flex items-center justify-between px-2 py-1.5 text-sm">
                <span className="text-muted-foreground">Alt Toplam</span>
                <span className="font-medium">{formatCurrency(foodCostTotal)}</span>
              </div>
            </div>

            {/* Toplam Gider */}
            <div className="flex items-center justify-between px-2 py-3 bg-muted/50 rounded-md">
              <span className="font-medium">Toplam Gider</span>
              <span className="font-bold text-lg">{formatCurrency(totalExpense)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Bottom Summary ─── */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Ciro & Gider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Toplam Ciro (KDV dahil)</span>
              <span className="font-medium">{formatCurrency(totalRevenue)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Toplam Gider (KDV dahil)</span>
              <span className="font-medium">{formatCurrency(totalExpense)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Brut Kar</span>
              <span
                className={`font-bold ${grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                {formatCurrency(grossProfit)}
              </span>
            </div>
          </div>

          <hr />

          {/* KDV */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm">KDV Orani:</span>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={kdvRate}
                  onChange={(e) => setKdvRate(parseFloat(e.target.value) || 0)}
                  className="w-20 h-8 text-right"
                />
                <span className="text-sm">%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">KDV Geliri</span>
              <span className="font-medium">{formatCurrency(kdvRevenue)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">KDV Gideri</span>
              <span className="font-medium">{formatCurrency(kdvExpense)}</span>
            </div>
          </div>

          <hr />

          {/* Gelir Vergisi */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm">Gelir Vergisi Orani:</span>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={incomeTaxRate}
                  onChange={(e) => setIncomeTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-20 h-8 text-right"
                />
                <span className="text-sm">%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Gelir Vergisi</span>
              <span className="font-medium">{formatCurrency(incomeTax)}</span>
            </div>
          </div>

          <hr />

          {/* Net Kar */}
          <div className="flex items-center justify-between py-2">
            <span className="text-lg font-bold">NET Kar</span>
            <span
              className={`text-xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {formatCurrency(netProfit)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
