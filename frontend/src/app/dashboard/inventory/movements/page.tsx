'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { toast } from 'sonner';

interface RawMaterial {
  id: string;
  name: string;
  unit: string;
}

interface StockMovement {
  id: string;
  rawMaterialId: string;
  quantity: number;
  unitPrice: number;
  type: 'IN' | 'OUT';
  supplier: string | null;
  invoiceNo: string | null;
  date: string;
  createdAt: string;
  rawMaterial: {
    id: string;
    name: string;
    unit: string;
  };
}

export default function StockMovementsPage() {
  const t = useTranslations('inventory');
  const tc = useTranslations('common');
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    rawMaterialId: '',
    quantity: '' as string | number,
    unitPrice: '' as string | number,
    type: 'IN' as 'IN' | 'OUT',
    supplier: '',
    invoiceNo: '',
    date: new Date().toISOString().split('T')[0],
  });

  const { data: movements = [], isLoading } = useQuery<StockMovement[]>({
    queryKey: ['stock-movements'],
    queryFn: () => api.get('/stock-movements').then((r) => r.data),
  });

  const { data: materials = [] } = useQuery<RawMaterial[]>({
    queryKey: ['raw-materials'],
    queryFn: () => api.get('/raw-materials').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      api.post('/stock-movements', {
        ...data,
        quantity: data.quantity === '' ? 0 : data.quantity,
        unitPrice: data.unitPrice === '' ? 0 : data.unitPrice,
        supplier: data.supplier || undefined,
        invoiceNo: data.invoiceNo || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['raw-materials'] });
      resetForm();
      toast.success(tc('save') + ' - OK');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      const message = err?.response?.data?.message || 'Hata olustu';
      toast.error(message);
    },
  });

  function resetForm() {
    setForm({
      rawMaterialId: '',
      quantity: '' as string | number,
      unitPrice: '' as string | number,
      type: 'IN',
      supplier: '',
      invoiceNo: '',
      date: new Date().toISOString().split('T')[0],
    });
    setDialogOpen(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate(form);
  }

  if (isLoading) {
    return <div className="p-6">{tc('loading')}</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('movements')}</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => setDialogOpen(open)}>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('addMovement')}
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('addMovement')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>{t('rawMaterials')}</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={form.rawMaterialId}
                  onChange={(e) => setForm({ ...form, rawMaterialId: e.target.value })}
                  required
                >
                  <option value="">Stok Kalemi Secin</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.unit})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>{t('movementType')}</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as 'IN' | 'OUT' })}
                >
                  <option value="IN">{t('in')}</option>
                  <option value="OUT">{t('out')}</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('quantity')}</Label>
                  <Input
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <Label>{t('unitPrice')} (TL)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.unitPrice}
                    onChange={(e) => setForm({ ...form, unitPrice: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                    required
                  />
                </div>
              </div>
              <div>
                <Label>{t('supplier')}</Label>
                <Input
                  value={form.supplier}
                  onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('invoiceNo')}</Label>
                <Input
                  value={form.invoiceNo}
                  onChange={(e) => setForm({ ...form, invoiceNo: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('date')}</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  {tc('cancel')}
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {tc('save')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('movements')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('date')}</TableHead>
                <TableHead>{t('name')}</TableHead>
                <TableHead className="text-center">{t('movementType')}</TableHead>
                <TableHead className="text-right">{t('quantity')}</TableHead>
                <TableHead className="text-right">{t('unitPrice')}</TableHead>
                <TableHead className="text-right">{t('totalValue')}</TableHead>
                <TableHead>{t('supplier')}</TableHead>
                <TableHead>{t('invoiceNo')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.map((movement) => (
                <TableRow key={movement.id}>
                  <TableCell>
                    {new Date(movement.date).toLocaleDateString('tr-TR')}
                  </TableCell>
                  <TableCell className="font-medium">
                    {movement.rawMaterial.name}
                  </TableCell>
                  <TableCell className="text-center">
                    {movement.type === 'IN' ? (
                      <Badge className="bg-green-100 text-green-800">
                        <ArrowDownCircle className="mr-1 h-3 w-3" />
                        {t('in')}
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800">
                        <ArrowUpCircle className="mr-1 h-3 w-3" />
                        {t('out')}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {Number(movement.quantity).toFixed(2)} {movement.rawMaterial.unit}
                  </TableCell>
                  <TableCell className="text-right">
                    {Number(movement.unitPrice).toFixed(2)} TL
                  </TableCell>
                  <TableCell className="text-right">
                    {(Number(movement.quantity) * Number(movement.unitPrice)).toFixed(2)} TL
                  </TableCell>
                  <TableCell>{movement.supplier || '-'}</TableCell>
                  <TableCell>{movement.invoiceNo || '-'}</TableCell>
                </TableRow>
              ))}
              {movements.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Henuz stok hareketi bulunmuyor
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
