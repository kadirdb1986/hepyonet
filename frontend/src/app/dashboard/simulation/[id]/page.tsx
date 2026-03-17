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
import { ArrowLeft, Save, Pencil, Plus, Trash2 } from 'lucide-react';
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
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(amount));

function formatMonth(ym: string): string {
  const [y, m] = ym.split('-');
  const months = ['Oca', 'Sub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Agu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

const formatNumber = (n: number) =>
  new Intl.NumberFormat('tr-TR').format(n);

function MoneyInput({ value, onChange, className = '' }: { value: number; onChange: (v: number) => void; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <Input
        type="text"
        inputMode="decimal"
        value={formatNumber(value)}
        onChange={(e) => {
          const raw = e.target.value.replace(/\./g, '').replace(',', '.');
          const num = parseFloat(raw);
          onChange(isNaN(num) ? 0 : num);
        }}
        className="h-8 text-right pr-7"
      />
      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">TL</span>
    </div>
  );
}

function NumberInput({ value, onChange, className = '' }: { value: number; onChange: (v: number) => void; className?: string }) {
  return (
    <Input
      type="text"
      inputMode="numeric"
      value={formatNumber(value)}
      onChange={(e) => {
        const raw = e.target.value.replace(/\./g, '');
        const num = parseInt(raw, 10);
        onChange(isNaN(num) ? 0 : Math.max(0, num));
      }}
      className={`h-8 text-right ${className}`}
    />
  );
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
  const [initialized, setInitialized] = useState(false);
  const [simName, setSimName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [newRevenueName, setNewRevenueName] = useState('');
  const [newRevenueAmount, setNewRevenueAmount] = useState('');
  const [newExpenseName, setNewExpenseName] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [dayWeights, setDayWeights] = useState({
    Pazartesi: 10,
    Sali: 12,
    Carsamba: 13,
    Persembe: 14,
    Cuma: 17,
    Cumartesi: 18,
    Pazar: 16,
  });

  // ─── Fetch Simulation ───
  const { data: simulation, isLoading } = useQuery<SimulationData>({
    queryKey: ['simulation', id],
    queryFn: () => api.get(`/simulations/${id}`).then((r) => r.data),
  });

  // Initialize local state from fetched data (convert Decimal strings to numbers)
  useEffect(() => {
    if (simulation && !initialized) {
      setProducts(simulation.products.map((p: any) => ({
        id: p.id,
        productId: p.productId,
        name: p.productName || p.name || '',
        quantity: Number(p.quantity),
        salePrice: Number(p.salePrice),
        costPrice: Number(p.costPrice),
      })));
      setExpenses(simulation.expenses.map((e: any) => ({
        id: e.id,
        name: e.name,
        amount: Number(e.amount),
        type: e.type,
        productId: e.productId,
      })));
      setKdvRate(Number(simulation.kdvRate) || 10);
      setIncomeTaxRate(Number(simulation.incomeTaxRate) || 20);
      setSimName(simulation.name);
      setInitialized(true);
    }
  }, [simulation, initialized]);

  // ─── Expense groups ───
  const fixedExpenses = expenses.filter((e) => e.type === 'FIXED');
  const otherExpenses = expenses.filter((e) => e.type === 'OTHER');
  const fixedTotal = fixedExpenses.reduce((sum, e) => sum + e.amount, 0);
  const otherTotal = otherExpenses.reduce((sum, e) => sum + e.amount, 0);
  const foodCostTotal = products.reduce((sum, p) => sum + p.quantity * p.costPrice, 0);

  // ─── Calculations ───
  const totalRevenue = useMemo(
    () => products.reduce((sum, p) => sum + p.quantity * p.salePrice, 0),
    [products],
  );

  const totalExpense = useMemo(
    () => fixedTotal + foodCostTotal + otherTotal,
    [fixedTotal, foodCostTotal, otherTotal],
  );

  const grossProfit = totalRevenue - totalExpense;

  const kdvNet = (totalRevenue - totalExpense) * kdvRate / (100 + kdvRate);

  const profitBeforeTax = grossProfit - kdvNet;
  const incomeTax = Math.max(0, profitBeforeTax * incomeTaxRate / 100);
  const netProfit = profitBeforeTax - incomeTax;

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
      name?: string;
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

  const addRevenueMutation = useMutation({
    mutationFn: (data: { name: string; amount: number }) => api.post(`/simulations/${id}/revenues`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['simulation', id] });
      setInitialized(false);
      setNewRevenueName('');
      setNewRevenueAmount('');
      toast.success('Gelir eklendi');
    },
  });

  const removeRevenueMutation = useMutation({
    mutationFn: (productId: string) => api.delete(`/simulations/${id}/revenues/${productId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['simulation', id] });
      setInitialized(false);
      toast.success('Gelir silindi');
    },
  });

  const addExpenseMutation = useMutation({
    mutationFn: (data: { name: string; amount: number }) => api.post(`/simulations/${id}/expenses`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['simulation', id] });
      setInitialized(false);
      setNewExpenseName('');
      setNewExpenseAmount('');
      toast.success('Gider eklendi');
    },
  });

  const removeExpenseMutation = useMutation({
    mutationFn: (expenseId: string) => api.delete(`/simulations/${id}/expenses/${expenseId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['simulation', id] });
      setInitialized(false);
      toast.success('Gider silindi');
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      name: simName,
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
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <Input
                  value={simName}
                  onChange={(e) => setSimName(e.target.value)}
                  className="text-xl font-bold h-10 w-64"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setIsEditingName(false);
                    if (e.key === 'Escape') {
                      setSimName(simulation.name);
                      setIsEditingName(false);
                    }
                  }}
                  onBlur={() => setIsEditingName(false)}
                />
                <span className="text-2xl font-bold">- {formatMonth(simulation.month)}</span>
              </div>
            ) : (
              <h1
                className="text-2xl font-bold cursor-pointer hover:text-muted-foreground flex items-center gap-2"
                onClick={() => setIsEditingName(true)}
              >
                {simName} - {formatMonth(simulation.month)}
                <Pencil className="h-4 w-4 text-muted-foreground" />
              </h1>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {saveMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </div>
      </div>

      {/* ─── Two Column Layout ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ─── Left Column: Gelirler ─── */}
        <Card>
          <CardHeader>
            <CardTitle>Gelirler</CardTitle>
          </CardHeader>
          <CardContent>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
              Urun Gelirleri
            </h3>
            {products.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Urun bulunmuyor</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Urun</TableHead>
                      <TableHead className="text-right w-[80px]">Adet</TableHead>
                      <TableHead className="text-right w-[100px]">Birim Fiyat</TableHead>
                      <TableHead className="text-right">Toplam</TableHead>
                      <TableHead className="w-[40px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell className="text-right">
                          <NumberInput value={product.quantity} onChange={(v) => updateProductQuantity(product.id, v)} className="w-20 ml-auto" />
                        </TableCell>
                        <TableCell className="text-right">
                          <MoneyInput value={product.salePrice} onChange={(v) => updateProductSalePrice(product.id, v)} className="w-28 ml-auto" />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(product.quantity * product.salePrice)}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeRevenueMutation.mutate(product.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <div className="mt-3 flex items-center gap-2">
              <Input placeholder="Gelir adi" value={newRevenueName} onChange={(e) => setNewRevenueName(e.target.value)} className="h-8 flex-1" />
              <MoneyInput value={Number(newRevenueAmount) || 0} onChange={(v) => setNewRevenueAmount(String(v))} className="w-28" />
              <Button size="sm" className="h-8" disabled={!newRevenueName.trim() || addRevenueMutation.isPending}
                onClick={() => addRevenueMutation.mutate({ name: newRevenueName.trim(), amount: Number(newRevenueAmount) || 0 })}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Ekle
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ─── Right Column: Giderler ─── */}
        <Card>
          <CardHeader>
            <CardTitle>Giderler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Gıda Maliyetleri */}
            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
                Gıda Maliyetleri
              </h3>
              {products.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">Gıda maliyeti bulunmuyor</p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Urun</TableHead>
                        <TableHead className="text-right w-[100px]">Birim Maliyet</TableHead>
                        <TableHead className="text-right w-[60px]">Adet</TableHead>
                        <TableHead className="text-right">Toplam</TableHead>
                        <TableHead className="w-[40px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>{product.name}</TableCell>
                          <TableCell className="text-right">
                            <MoneyInput value={product.costPrice} onChange={(v) => updateProductCostPrice(product.id, v)} className="w-28 ml-auto" />
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">{formatNumber(product.quantity)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(product.quantity * product.costPrice)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeRevenueMutation.mutate(product.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            </Button>
                          </TableCell>
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
                        <TableHead className="w-[40px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fixedExpenses.map((exp) => (
                        <TableRow key={exp.id}>
                          <TableCell>{exp.name}</TableCell>
                          <TableCell className="text-right">
                            <MoneyInput value={exp.amount} onChange={(v) => updateFixedExpenseAmount(exp.id, v)} className="w-32 ml-auto" />
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeExpenseMutation.mutate(exp.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            </Button>
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

            {/* Diger Giderler */}
            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
                Diger Giderler
              </h3>
              {otherExpenses.length > 0 && (
                <div className="rounded-md border mb-2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ad</TableHead>
                        <TableHead className="text-right w-[140px]">Tutar</TableHead>
                        <TableHead className="w-[40px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {otherExpenses.map((exp) => (
                        <TableRow key={exp.id}>
                          <TableCell>{exp.name}</TableCell>
                          <TableCell className="text-right">
                            <MoneyInput value={exp.amount} onChange={(v) => updateFixedExpenseAmount(exp.id, v)} className="w-32 ml-auto" />
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeExpenseMutation.mutate(exp.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {otherExpenses.length > 0 && (
                <div className="mt-2 flex items-center justify-between px-2 py-1.5 text-sm">
                  <span className="text-muted-foreground">Alt Toplam</span>
                  <span className="font-medium">{formatCurrency(otherTotal)}</span>
                </div>
              )}
              <div className="mt-2 flex items-center gap-2">
                <Input placeholder="Gider adi" value={newExpenseName} onChange={(e) => setNewExpenseName(e.target.value)} className="h-8 flex-1" />
                <MoneyInput value={Number(newExpenseAmount) || 0} onChange={(v) => setNewExpenseAmount(String(v))} className="w-28" />
                <Button size="sm" className="h-8" disabled={!newExpenseName.trim() || addExpenseMutation.isPending}
                  onClick={() => addExpenseMutation.mutate({ name: newExpenseName.trim(), amount: Number(newExpenseAmount) || 0 })}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Ekle
                </Button>
              </div>
            </div>

          </CardContent>
        </Card>
      </div>

      {/* ─── Bottom Summary ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex items-center justify-between px-4 py-4 bg-white border rounded-lg">
          <span className="font-semibold text-lg">Toplam Ciro</span>
          <span className="font-bold text-xl">{formatCurrency(totalRevenue)}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-4 bg-white border rounded-lg">
          <span className="font-semibold text-lg">Toplam Gider</span>
          <span className="font-bold text-xl">{formatCurrency(totalExpense)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sol: Brut Kar, KDV, Vergi, Net Kar */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Brut Kar</span>
              <span className={`font-bold ${grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(grossProfit)}
              </span>
            </div>

            <hr />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm">KDV Gider (%</span>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={kdvRate}
                  onChange={(e) => setKdvRate(parseFloat(e.target.value) || 0)}
                  className="w-16 h-8 text-right"
                />
                <span className="text-sm">)</span>
              </div>
              <span className="font-medium">{formatCurrency(kdvNet)}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm">Gelir Vergisi (%</span>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={incomeTaxRate}
                  onChange={(e) => setIncomeTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-16 h-8 text-right"
                />
                <span className="text-sm">)</span>
              </div>
              <span className="font-medium">{formatCurrency(incomeTax)}</span>
            </div>

            <hr />

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

        {/* Sag: Haftalik Ciro Dagilimi */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Haftalik Tahmini Ciro Dagilimi</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const [y, m] = (simulation?.month || '2026-01').split('-').map(Number);
              const daysInMonth = new Date(y, m, 0).getDate();
              const weeklyCiro = totalRevenue / daysInMonth * 7;
              const totalWeight = Object.values(dayWeights).reduce((s, w) => s + w, 0);

              return (
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground mb-2">
                    Haftalik Ciro: <span className="font-medium text-foreground">{formatCurrency(weeklyCiro)}</span>
                  </div>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[70px]">Agirlik %</TableHead>
                          <TableHead>Gun</TableHead>
                          <TableHead className="text-right">Tahmini Ciro</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(dayWeights).map(([day, weight]) => (
                          <TableRow key={day}>
                            <TableCell>
                              <NumberInput
                                value={weight}
                                onChange={(v) => setDayWeights((prev) => ({ ...prev, [day]: v }))}
                                className="w-16"
                              />
                            </TableCell>
                            <TableCell className="font-medium">{day}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(totalWeight > 0 ? weeklyCiro * weight / totalWeight : 0)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex items-center px-2 py-1.5 text-sm">
                    <span className="text-muted-foreground">Toplam Agirlik: %{totalWeight}</span>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
