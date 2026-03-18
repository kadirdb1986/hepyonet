'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
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
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ───

interface Simulation {
  id: string;
  name: string;
  month: string;
  createdAt: string;
}

interface FixedExpense {
  id: string;
  name: string;
  amount: number;
}

interface Product {
  id: string;
  name: string;
  isMenuItem: boolean;
}

interface FixedRevenue {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  product?: { name: string };
}

// ─── Helpers ───

type TabType = 'simulations' | 'fixedExpenses' | 'fixedRevenues';

function formatMonth(ym: string): string {
  const [y, m] = ym.split('-');
  const months = ['Oca', 'Sub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Agu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);

const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

export default function SimulationPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabType>('simulations');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMonth, setNewMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Fixed expense form
  const [expenseName, setExpenseName] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editingExpenseName, setEditingExpenseName] = useState('');
  const [editingExpenseAmount, setEditingExpenseAmount] = useState('');

  // Fixed revenue form
  const [revenueProductId, setRevenueProductId] = useState('');
  const [revenueQuantity, setRevenueQuantity] = useState('');

  // ─── Simulations ───

  const { data: simulations = [], isLoading: simLoading } = useQuery<Simulation[]>({
    queryKey: ['simulations'],
    queryFn: () => api.get('/simulations').then((r) => r.data),
    enabled: activeTab === 'simulations',
  });

  const createSimMutation = useMutation({
    mutationFn: (data: { name: string; month: string }) => api.post('/simulations', data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['simulations'] });
      setIsCreateOpen(false);
      setNewName('');
      toast.success('Simülasyon oluşturuldu');
      router.push(`/dashboard/simulation/${res.data.id}`);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Simülasyon oluşturulurken hata oluştu');
    },
  });

  const deleteSimMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/simulations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['simulations'] });
      toast.success('Simülasyon silindi');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Simülasyon silinirken hata oluştu');
    },
  });

  // ─── Fixed Expenses ───

  const { data: fixedExpenses = [], isLoading: expLoading } = useQuery<FixedExpense[]>({
    queryKey: ['sim-fixed-expenses'],
    queryFn: () => api.get('/sim-fixed-expenses').then((r) => r.data),
    enabled: activeTab === 'fixedExpenses',
  });

  const createExpMutation = useMutation({
    mutationFn: (data: { name: string; amount: number }) => api.post('/sim-fixed-expenses', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sim-fixed-expenses'] });
      setExpenseName('');
      setExpenseAmount('');
      toast.success('Sabit gider eklendi');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Sabit gider eklenirken hata oluştu');
    },
  });

  const updateExpMutation = useMutation({
    mutationFn: ({ id, name, amount }: { id: string; name?: string; amount: number }) =>
      api.patch(`/sim-fixed-expenses/${id}`, { name, amount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sim-fixed-expenses'] });
      setEditingExpenseId(null);
      setEditingExpenseAmount('');
      toast.success('Sabit gider güncellendi');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Sabit gider güncellenirken hata oluştu');
    },
  });

  const deleteExpMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/sim-fixed-expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sim-fixed-expenses'] });
      toast.success('Sabit gider silindi');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Sabit gider silinirken hata oluştu');
    },
  });

  // ─── Fixed Revenues ───

  const { data: fixedRevenues = [], isLoading: revLoading } = useQuery<FixedRevenue[]>({
    queryKey: ['sim-fixed-revenues'],
    queryFn: () => api.get('/sim-fixed-revenues').then((r) => r.data),
    enabled: activeTab === 'fixedRevenues',
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => api.get('/products').then((r) => r.data),
    enabled: activeTab === 'fixedRevenues',
  });

  const menuProducts = products.filter((p) => p.isMenuItem);

  const createRevMutation = useMutation({
    mutationFn: (data: { productId: string; quantity: number }) =>
      api.post('/sim-fixed-revenues', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sim-fixed-revenues'] });
      setRevenueProductId('');
      setRevenueQuantity('');
      toast.success('Sabit gelir eklendi');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Sabit gelir eklenirken hata oluştu');
    },
  });

  const deleteRevMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/sim-fixed-revenues/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sim-fixed-revenues'] });
      toast.success('Sabit gelir silindi');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Sabit gelir silinirken hata oluştu');
    },
  });

  // ─── Handlers ───

  const handleCreateSim = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) {
      toast.error('Simülasyon adı boş olamaz');
      return;
    }
    if (!newMonth) {
      toast.error('Ay seçmelisiniz');
      return;
    }
    createSimMutation.mutate({ name: trimmed, month: newMonth });
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = expenseName.trim();
    const amount = parseFloat(expenseAmount);
    if (!trimmed) {
      toast.error('Gider adı boş olamaz');
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      toast.error('Geçerli bir tutar giriniz');
      return;
    }
    createExpMutation.mutate({ name: trimmed, amount });
  };

  const handleSaveExpense = (id: string) => {
    const amount = parseFloat(editingExpenseAmount);
    if (isNaN(amount) || amount < 0) {
      toast.error('Geçerli bir tutar giriniz');
      return;
    }
    if (!editingExpenseName.trim()) {
      toast.error('Ad boş bırakılamaz');
      return;
    }
    updateExpMutation.mutate({ id, name: editingExpenseName.trim(), amount });
  };

  const handleAddRevenue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!revenueProductId) {
      toast.error('Ürün seçmelisiniz');
      return;
    }
    const quantity = parseInt(revenueQuantity, 10);
    if (isNaN(quantity) || quantity <= 0) {
      toast.error('Geçerli bir adet giriniz');
      return;
    }
    createRevMutation.mutate({ productId: revenueProductId, quantity });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Simülasyon</h1>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Yeni Simülasyon
        </Button>
      </div>

      {/* Tab Buttons */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === 'simulations' ? 'default' : 'outline'}
          onClick={() => setActiveTab('simulations')}
        >
          Simülasyonlar
        </Button>
        <Button
          variant={activeTab === 'fixedExpenses' ? 'default' : 'outline'}
          onClick={() => setActiveTab('fixedExpenses')}
        >
          Sabit Giderler
        </Button>
        <Button
          variant={activeTab === 'fixedRevenues' ? 'default' : 'outline'}
          onClick={() => setActiveTab('fixedRevenues')}
        >
          Sabit Gelirler
        </Button>
      </div>

      {/* New Simulation Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Yeni Simülasyon</DialogTitle>
            <DialogDescription>Simülasyon adı ve ayını belirleyin</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSim} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sim-name">Ad</Label>
              <Input
                id="sim-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="örn: Mart Simülasyonu"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sim-month">Ay</Label>
              <Input
                id="sim-month"
                type="month"
                value={newMonth}
                onChange={(e) => setNewMonth(e.target.value)}
                required
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                İptal
              </Button>
              <Button type="submit" disabled={createSimMutation.isPending}>
                {createSimMutation.isPending ? 'Oluşturuluyor...' : 'Oluştur'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Simülasyonlar Tab ─── */}
      {activeTab === 'simulations' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Simülasyonlar</CardTitle>
          </CardHeader>
          <CardContent>
            {simLoading ? (
              <p className="text-muted-foreground text-center py-8">Yükleniyor...</p>
            ) : simulations.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Henüz simülasyon oluşturulmamış
              </p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ad</TableHead>
                      <TableHead className="text-right">Ciro</TableHead>
                      <TableHead className="text-right">Net Kar</TableHead>
                      <TableHead className="text-right w-[80px]">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {simulations.map((sim: any) => (
                      <TableRow
                        key={sim.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/dashboard/simulation/${sim.id}`)}
                      >
                        <TableCell className="font-medium">{sim.name}</TableCell>
                        <TableCell className="text-right">{formatCurrency(sim.totalRevenue ?? 0)}</TableCell>
                        <TableCell className={`text-right font-medium ${(sim.netProfit ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(sim.netProfit ?? 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`"${sim.name}" simülasyonunu silmek istediğinize emin misiniz?`)) {
                                deleteSimMutation.mutate(sim.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── Sabit Giderler Tab ─── */}
      {activeTab === 'fixedExpenses' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sabit Giderler</CardTitle>
            <p className="text-sm text-muted-foreground">
              Yeni simülasyon oluştururken otomatik eklenen gider kalemleri
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleAddExpense} className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label htmlFor="exp-name">Ad</Label>
                <Input
                  id="exp-name"
                  value={expenseName}
                  onChange={(e) => setExpenseName(e.target.value)}
                  placeholder="orn: Kira, Elektrik"
                />
              </div>
              <div className="w-40 space-y-1">
                <Label htmlFor="exp-amount">Tutar (TL)</Label>
                <Input
                  id="exp-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <Button type="submit" disabled={createExpMutation.isPending}>
                {createExpMutation.isPending ? 'Ekleniyor...' : 'Ekle'}
              </Button>
            </form>

            {expLoading ? (
              <p className="text-muted-foreground text-center py-8">Yükleniyor...</p>
            ) : fixedExpenses.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Henüz sabit gider eklenmemiş
              </p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ad</TableHead>
                      <TableHead className="text-right">Tutar</TableHead>
                      <TableHead className="text-right w-[80px]">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fixedExpenses.map((exp) => (
                      <TableRow key={exp.id}>
                        <TableCell className="font-medium">{exp.name}</TableCell>
                        <TableCell className="text-right">
                          {editingExpenseId === exp.id ? (
                            <div className="flex items-center justify-end gap-2">
                              <Input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={editingExpenseAmount}
                                onChange={(e) => setEditingExpenseAmount(e.target.value)}
                                className="w-32 h-8 text-right"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSaveExpense(exp.id);
                                  }
                                  if (e.key === 'Escape') {
                                    setEditingExpenseId(null);
                                    setEditingExpenseAmount('');
                                  }
                                }}
                              />
                              <Button
                                size="sm"
                                className="h-8"
                                onClick={() => handleSaveExpense(exp.id)}
                                disabled={updateExpMutation.isPending}
                              >
                                Kaydet
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8"
                                onClick={() => {
                                  setEditingExpenseId(null);
                                  setEditingExpenseAmount('');
                                }}
                              >
                                İptal
                              </Button>
                            </div>
                          ) : (
                            <span
                              className="cursor-pointer hover:underline"
                              onClick={() => {
                                setEditingExpenseId(exp.id);
                                setEditingExpenseAmount(String(exp.amount));
                              }}
                            >
                              {formatCurrency(exp.amount)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm(`"${exp.name}" sabit giderini silmek istediğinize emin misiniz?`)) {
                                deleteExpMutation.mutate(exp.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── Sabit Gelirler Tab ─── */}
      {activeTab === 'fixedRevenues' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sabit Gelirler (Ürün Adetleri)</CardTitle>
            <p className="text-sm text-muted-foreground">
              Yeni simülasyon oluştururken otomatik eklenen ürün ve aylık satış adetleri
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleAddRevenue} className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label htmlFor="rev-product">Ürün</Label>
                <select
                  id="rev-product"
                  className={selectClass}
                  value={revenueProductId}
                  onChange={(e) => setRevenueProductId(e.target.value)}
                >
                  <option value="">Ürün seçin...</option>
                  {menuProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-32 space-y-1">
                <Label htmlFor="rev-quantity">Adet</Label>
                <Input
                  id="rev-quantity"
                  type="number"
                  min="1"
                  value={revenueQuantity}
                  onChange={(e) => setRevenueQuantity(e.target.value)}
                  placeholder="0"
                />
              </div>
              <Button type="submit" disabled={createRevMutation.isPending}>
                {createRevMutation.isPending ? 'Ekleniyor...' : 'Ekle'}
              </Button>
            </form>

            {revLoading ? (
              <p className="text-muted-foreground text-center py-8">Yükleniyor...</p>
            ) : fixedRevenues.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Henüz sabit gelir eklenmemiş
              </p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ürün</TableHead>
                      <TableHead className="text-right">Adet</TableHead>
                      <TableHead className="text-right w-[80px]">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fixedRevenues.map((rev) => (
                      <TableRow key={rev.id}>
                        <TableCell className="font-medium">
                          {rev.product?.name || rev.productName}
                        </TableCell>
                        <TableCell className="text-right">{rev.quantity}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm('Bu sabit geliri silmek istediğinize emin misiniz?')) {
                                deleteRevMutation.mutate(rev.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
