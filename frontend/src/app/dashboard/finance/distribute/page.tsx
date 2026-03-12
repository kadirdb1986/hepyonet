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
  NONE: 'Dagitim Yok (Tek Aya Yaz)',
  EQUAL: 'Esit Dagitim',
  REVENUE_BASED: 'Ciro Bazli Dagitim',
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
      setError(err.response?.data?.message || 'Dagitim yapilamadi');
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
      setError(err.response?.data?.message || 'Dagitim iptal edilemedi');
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
        'Bu giderin dagitimini iptal etmek istediginize emin misiniz? Tum dagitim kayitlari silinecektir.',
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
          <h1 className="text-2xl font-bold">Gider Dagitimi</h1>
          <p className="text-gray-500 text-sm mt-1">
            Giderleri aylara dagitarak daha dogru finansal raporlama yapin
          </p>
        </div>
      </div>

      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800 space-y-2">
              <p>
                <strong>Dagitim Yok (NONE):</strong> Gider, odeme tarihindeki aya
                yazilir. Tek seferlik giderler icin uygundur.
              </p>
              <p>
                <strong>Esit Dagitim (EQUAL):</strong> Gider belirtilen ay sayisina
                esit bolunur. Ornegin 9.000 TL / 3 ay = her aya 3.000 TL.
              </p>
              <p>
                <strong>Ciro Bazli Dagitim (REVENUE_BASED):</strong> Gider
                belirtilen aylara ciro oraninda dagitilir. Ornegin Ocak=100k,
                Subat=120k, Mart=180k ise dagitim %25 / %30 / %45 oraninda
                yapilir. Dagitim yapilabilmesi icin ilgili aylarda ciro verisi
                girilmis olmalidir.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gider Dagitimi</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                {error}
              </div>
            )}

            {selectedExpenseId && (
              <div className="p-3 bg-gray-50 rounded-md text-sm">
                <p className="font-medium">
                  {expenses.find((e: any) => e.id === selectedExpenseId)?.title}
                </p>
                <p className="text-gray-600">
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
              <Label>Dagitim Tipi</Label>
              <Select
                value={distributionType}
                onValueChange={(value) => value && setDistributionType(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">
                    Dagitim Yok (Tek Aya Yaz)
                  </SelectItem>
                  <SelectItem value="EQUAL">Esit Dagitim</SelectItem>
                  <SelectItem value="REVENUE_BASED">
                    Ciro Bazli Dagitim
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {distributionType !== 'NONE' && (
              <div className="space-y-2">
                <Label>Dagitim Ay Sayisi</Label>
                <Input
                  type="number"
                  min="2"
                  max="24"
                  value={distributionMonths}
                  onChange={(e) => setDistributionMonths(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Odeme tarihinden itibaren kac aya dagitilacagini belirtin (2-24
                  ay)
                </p>
              </div>
            )}

            {distributionType === 'EQUAL' && selectedExpenseId && (
              <div className="p-3 bg-green-50 rounded-md text-sm text-green-800">
                <p>
                  Her aya dusecek tutar:{' '}
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
                  Ciro bazli dagitim icin ilgili aylarda ciro verisi girilmis
                  olmalidir. Ciro verisi olmayan aylar icin dagitim yapilamaz.
                </p>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Iptal
              </Button>
              <Button
                onClick={handleDistribute}
                disabled={distributeMutation.isPending}
              >
                {distributeMutation.isPending ? 'Dagitiliyor...' : 'Dagit'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Yukleniyor...</p>
        </div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Dagitilmamis Giderler ({undistributedExpenses.length})
              </CardTitle>
              <CardDescription>
                Asagidaki giderler henuz aylara dagitilmamistir
              </CardDescription>
            </CardHeader>
            <CardContent>
              {undistributedExpenses.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Dagitilacak gider yok
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 font-medium">
                          Baslik
                        </th>
                        <th className="text-left py-2 px-3 font-medium">
                          Kategori
                        </th>
                        <th className="text-right py-2 px-3 font-medium">
                          Tutar
                        </th>
                        <th className="text-left py-2 px-3 font-medium">
                          Odeme Tarihi
                        </th>
                        <th className="text-right py-2 px-3 font-medium">
                          Islem
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {undistributedExpenses.map((expense: any) => (
                        <tr
                          key={expense.id}
                          className="border-b last:border-0 hover:bg-gray-50"
                        >
                          <td className="py-2 px-3">{expense.title}</td>
                          <td className="py-2 px-3">
                            <Badge variant="outline">
                              {CATEGORY_LABELS[expense.category] ||
                                expense.category}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 text-right font-medium">
                            {formatCurrency(Number(expense.amount))}
                          </td>
                          <td className="py-2 px-3">
                            {formatDate(expense.paymentDate)}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <Button
                              size="sm"
                              className="gap-1"
                              onClick={() =>
                                openDistributeDialog(expense.id)
                              }
                            >
                              <Split className="h-3 w-3" />
                              Dagit
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Dagitilmis Giderler ({distributedExpenses.length})
              </CardTitle>
              <CardDescription>
                Aylara dagitilmis giderler ve dagitim detaylari
              </CardDescription>
            </CardHeader>
            <CardContent>
              {distributedExpenses.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Dagitilmis gider yok
                </p>
              ) : (
                <Accordion className="w-full">
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
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left py-2 px-3 font-medium">
                                    Ay
                                  </th>
                                  <th className="text-right py-2 px-3 font-medium">
                                    Dagitilan Tutar
                                  </th>
                                  <th className="text-right py-2 px-3 font-medium">
                                    Oran
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {expense.distributions
                                  ?.sort(
                                    (a: any, b: any) =>
                                      a.month.localeCompare(b.month),
                                  )
                                  .map((dist: any) => {
                                    const ratio =
                                      Number(expense.amount) > 0
                                        ? (Number(dist.amount) /
                                            Number(expense.amount)) *
                                          100
                                        : 0;
                                    return (
                                      <tr
                                        key={dist.id}
                                        className="border-b last:border-0"
                                      >
                                        <td className="py-2 px-3">
                                          {dist.month}
                                        </td>
                                        <td className="py-2 px-3 text-right font-medium">
                                          {formatCurrency(Number(dist.amount))}
                                        </td>
                                        <td className="py-2 px-3 text-right text-gray-600">
                                          %{ratio.toFixed(1)}
                                        </td>
                                      </tr>
                                    );
                                  })}
                              </tbody>
                            </table>
                          </div>
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
                              Dagitimi Iptal Et
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
