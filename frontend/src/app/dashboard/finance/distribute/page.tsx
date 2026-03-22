'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Split, Undo2, Info, AlertTriangle } from 'lucide-react';

// Kategori adı artık doğrudan expense.category'de saklanıyor
const CATEGORY_LABELS: Record<string, string> = {};

const DISTRIBUTION_TYPE_LABELS: Record<string, string> = {
  NONE: 'Dağıtım Yok (Tek Aya Yaz)',
  EQUAL: 'Eşit Dağıtım',
  REVENUE_BASED: 'Ciro Bazlı Dağıtım',
};

export default function DistributePage() {
  const queryClient = useQueryClient();
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  const [distributionType, setDistributionType] = useState<string>('NONE');
  const [distributionMonths, setDistributionMonths] = useState<string>('3');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [error, setError] = useState('');

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses-all'],
    queryFn: async () => {
      const { data } = await api.get('/expenses');
      return data;
    },
  });

  const distributeMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: { distributionType: string; distributionMonths?: number };
    }) => {
      const res = await api.post(`/expenses/${id}/distribute`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses-all'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      setIsDialogOpen(false);
      setSelectedExpenseId(null);
      setError('');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Dağıtım yapılamadı');
    },
  });

  const undistributeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/expenses/${id}/undistribute`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses-all'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Dağıtım iptal edilemedi');
    },
  });

  const openDistributeDialog = (expenseId: string) => {
    setSelectedExpenseId(expenseId);
    setDistributionType('NONE');
    setDistributionMonths('3');
    setError('');
    setIsDialogOpen(true);
  };

  const handleDistribute = () => {
    if (!selectedExpenseId) return;

    const data: { distributionType: string; distributionMonths?: number } = {
      distributionType,
    };

    if (distributionType !== 'NONE') {
      data.distributionMonths = parseInt(distributionMonths, 10);
    }

    distributeMutation.mutate({ id: selectedExpenseId, data });
  };

  const handleUndistribute = (id: string) => {
    if (
      window.confirm(
        'Bu giderin dağıtımını iptal etmek istediğinize emin misiniz? Tüm dağıtım kayıtları silinecektir.',
      )
    ) {
      undistributeMutation.mutate(id);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('tr-TR');
  };

  const undistributedExpenses = expenses.filter((e: any) => !e.isDistributed);
  const distributedExpenses = expenses.filter((e: any) => e.isDistributed);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gider Dağıtımı</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Giderleri aylara dağıtarak daha doğru finansal raporlama yapın
          </p>
        </div>
      </div>

      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800 space-y-2">
              <p>
                <strong>Dağıtım Yok (NONE):</strong> Gider, ödeme tarihindeki aya
                yazılır. Tek seferlik giderler için uygundur.
              </p>
              <p>
                <strong>Eşit Dağıtım (EQUAL):</strong> Gider belirtilen ay sayısına
                eşit bölünür. Örneğin 9.000 TL / 3 ay = her aya 3.000 TL.
              </p>
              <p>
                <strong>Ciro Bazlı Dağıtım (REVENUE_BASED):</strong> Gider
                belirtilen aylara ciro oranında dağıtılır. Örneğin Ocak=100k,
                Şubat=120k, Mart=180k ise dağıtım %25 / %30 / %45 oranında
                yapılır. Dağıtım yapılabilmesi için ilgili aylarda ciro verisi
                girilmiş olmalıdır.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gider Dağıtımı</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {error}
              </div>
            )}

            {selectedExpenseId && (
              <div className="p-3 bg-muted rounded-md text-sm">
                <p className="font-medium">
                  {expenses.find((e: any) => e.id === selectedExpenseId)?.title}
                </p>
                <p className="text-muted-foreground">
                  {formatCurrency(
                    Number(
                      expenses.find((e: any) => e.id === selectedExpenseId)
                        ?.amount,
                    ),
                  )}{' '}
                  -{' '}
                  {formatDate(
                    expenses.find((e: any) => e.id === selectedExpenseId)
                      ?.paymentDate,
                  )}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Dağıtım Tipi</Label>
              <Select
                value={distributionType}
                onValueChange={(value) => value && setDistributionType(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">
                    Dağıtım Yok (Tek Aya Yaz)
                  </SelectItem>
                  <SelectItem value="EQUAL">Eşit Dağıtım</SelectItem>
                  <SelectItem value="REVENUE_BASED">
                    Ciro Bazlı Dağıtım
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {distributionType !== 'NONE' && (
              <div className="space-y-2">
                <Label>Dağıtım Ay Sayısı</Label>
                <Input
                  type="number"
                  min="2"
                  max="24"
                  value={distributionMonths}
                  onChange={(e) => setDistributionMonths(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Ödeme tarihinden itibaren kaç aya dağıtılacağını belirtin (2-24
                  ay)
                </p>
              </div>
            )}

            {distributionType === 'EQUAL' && selectedExpenseId && (
              <div className="p-3 bg-green-50 rounded-md text-sm text-green-800">
                <p>
                  Her aya düşecek tutar:{' '}
                  <strong>
                    {formatCurrency(
                      Number(
                        expenses.find((e: any) => e.id === selectedExpenseId)
                          ?.amount,
                      ) / parseInt(distributionMonths || '1', 10),
                    )}
                  </strong>
                </p>
              </div>
            )}

            {distributionType === 'REVENUE_BASED' && (
              <div className="p-3 bg-amber-50 rounded-md text-sm text-amber-800 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>
                  Ciro bazlı dağıtım için ilgili aylarda ciro verisi girilmiş
                  olmalıdır. Ciro verisi olmayan aylar için dağıtım yapılamaz.
                </p>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                İptal
              </Button>
              <Button
                onClick={handleDistribute}
                disabled={distributeMutation.isPending}
              >
                {distributeMutation.isPending ? 'Dağıtılıyor...' : 'Dağıt'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Yükleniyor...</p>
        </div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Dağıtılmamış Giderler ({undistributedExpenses.length})
              </CardTitle>
              <CardDescription>
                Aşağıdaki giderler henüz aylara dağıtılmamıştır
              </CardDescription>
            </CardHeader>
            <CardContent>
              {undistributedExpenses.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Dağıtılacak gider yok
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Başlık</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead className="text-right">Tutar</TableHead>
                      <TableHead>Ödeme Tarihi</TableHead>
                      <TableHead className="text-right">İşlem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {undistributedExpenses.map((expense: any) => (
                      <TableRow key={expense.id}>
                        <TableCell>{expense.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {CATEGORY_LABELS[expense.category] || expense.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(Number(expense.amount))}
                        </TableCell>
                        <TableCell>{formatDate(expense.paymentDate)}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" className="gap-1" onClick={() => openDistributeDialog(expense.id)}>
                            <Split className="h-3 w-3" />
                            Dağıt
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Dağıtılmış Giderler ({distributedExpenses.length})
              </CardTitle>
              <CardDescription>
                Aylara dağıtılmış giderler ve dağıtım detayları
              </CardDescription>
            </CardHeader>
            <CardContent>
              {distributedExpenses.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Dağıtılmış gider yok
                </p>
              ) : (
                <Accordion type="multiple" className="w-full">
                  {distributedExpenses.map((expense: any) => (
                    <AccordionItem key={expense.id} value={expense.id}>
                      <AccordionTrigger className="no-underline hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex items-center gap-3">
                            <span className="font-medium">
                              {expense.title}
                            </span>
                            <Badge variant="outline">
                              {CATEGORY_LABELS[expense.category] ||
                                expense.category}
                            </Badge>
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                              {DISTRIBUTION_TYPE_LABELS[
                                expense.distributionType
                              ] || expense.distributionType}
                            </Badge>
                          </div>
                          <span className="font-medium text-right mr-2">
                            {formatCurrency(Number(expense.amount))}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pt-2">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Ay</TableHead>
                                <TableHead className="text-right">Dağıtılan Tutar</TableHead>
                                <TableHead className="text-right">Oran</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {expense.distributions
                                ?.sort((a: any, b: any) => a.month.localeCompare(b.month))
                                .map((dist: any) => {
                                  const ratio = Number(expense.amount) > 0
                                    ? (Number(dist.amount) / Number(expense.amount)) * 100
                                    : 0;
                                  return (
                                    <TableRow key={dist.id}>
                                      <TableCell>{dist.month}</TableCell>
                                      <TableCell className="text-right font-medium">
                                        {formatCurrency(Number(dist.amount))}
                                      </TableCell>
                                      <TableCell className="text-right text-muted-foreground">
                                        %{ratio.toFixed(1)}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                            </TableBody>
                          </Table>
                          <div className="flex justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 text-red-600 hover:text-red-700"
                              onClick={() =>
                                handleUndistribute(expense.id)
                              }
                              disabled={undistributeMutation.isPending}
                            >
                              <Undo2 className="h-3 w-3" />
                              Dağıtımı İptal Et
                            </Button>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
