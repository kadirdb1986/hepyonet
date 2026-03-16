'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Save,
  Plus,
  CheckCircle,
  XCircle,
  Calendar,
  Briefcase,
} from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface LeaveRecord {
  id: string;
  startDate: string;
  endDate: string;
  type: 'ANNUAL' | 'SICK' | 'OTHER';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  notes: string | null;
  createdAt: string;
}

interface PositionConfig {
  id: string;
  name: string;
}

interface PersonnelDetail {
  id: string;
  name: string;
  surname: string;
  phone: string | null;
  tcNo: string | null;
  position: string | null;
  positionConfig?: PositionConfig | null;
  startDate: string;
  salary: string;
  isActive: boolean;
  createdAt: string;
  leaveRecords: LeaveRecord[];
}

interface WorkDaysData {
  personnelId: string;
  month: string;
  totalDaysInMonth: number;
  weekends: number;
  businessDays: number;
  leaveDays: number;
  workDays: number;
  approvedLeaves: {
    id: string;
    startDate: string;
    endDate: string;
    type: string;
  }[];
}

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

const leaveTypeMap = {
  ANNUAL: { label: 'Yillik Izin', variant: 'default' as const },
  SICK: { label: 'Hastalik Izni', variant: 'secondary' as const },
  OTHER: { label: 'Diger', variant: 'outline' as const },
};

const leaveStatusMap = {
  PENDING: { label: 'Beklemede', variant: 'secondary' as const },
  APPROVED: { label: 'Onaylandi', variant: 'default' as const },
  REJECTED: { label: 'Reddedildi', variant: 'destructive' as const },
};

export default function PersonnelDetailPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const id = params.id as string;

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    surname: '',
    phone: '',
    tcNo: '',
    position: '',
    positionId: '',
    startDate: '',
    salary: '',
  });
  const [editError, setEditError] = useState('');

  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    startDate: '',
    endDate: '',
    type: 'ANNUAL' as 'ANNUAL' | 'SICK' | 'OTHER',
    notes: '',
  });
  const [leaveError, setLeaveError] = useState('');

  const now = new Date();
  const [workDaysMonth, setWorkDaysMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
  );

  const { data: personnel, isLoading } = useQuery<PersonnelDetail>({
    queryKey: ['personnel', id],
    queryFn: async () => {
      const { data } = await api.get(`/personnel/${id}`);
      return data;
    },
  });

  const { data: positions = [] } = useQuery<PositionConfig[]>({
    queryKey: ['position-configs'],
    queryFn: () => api.get('/position-configs').then((r) => r.data),
  });

  const { data: workDays } = useQuery<WorkDaysData>({
    queryKey: ['personnel', id, 'work-days', workDaysMonth],
    queryFn: async () => {
      const { data } = await api.get(`/personnel/${id}/work-days`, {
        params: { month: workDaysMonth },
      });
      return data;
    },
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      const { data } = await api.patch(`/personnel/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personnel', id] });
      setIsEditing(false);
      setEditError('');
    },
    onError: (err: any) => {
      setEditError(err.response?.data?.message || 'Guncelleme sirasinda bir hata olustu');
    },
  });

  const createLeaveMutation = useMutation({
    mutationFn: async (payload: typeof leaveForm) => {
      const { data } = await api.post(`/personnel/${id}/leaves`, {
        startDate: payload.startDate,
        endDate: payload.endDate,
        type: payload.type,
        notes: payload.notes || undefined,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personnel', id] });
      queryClient.invalidateQueries({ queryKey: ['personnel', id, 'work-days'] });
      setShowLeaveDialog(false);
      setLeaveForm({ startDate: '', endDate: '', type: 'ANNUAL', notes: '' });
      setLeaveError('');
    },
    onError: (err: any) => {
      setLeaveError(err.response?.data?.message || 'Izin olusturulurken bir hata olustu');
    },
  });

  const updateLeaveStatusMutation = useMutation({
    mutationFn: async ({
      leaveId,
      status,
    }: {
      leaveId: string;
      status: 'APPROVED' | 'REJECTED';
    }) => {
      const { data } = await api.patch(`/personnel/${id}/leaves/${leaveId}`, { status });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personnel', id] });
      queryClient.invalidateQueries({ queryKey: ['personnel', id, 'work-days'] });
    },
  });

  const startEditing = () => {
    if (!personnel) return;
    let initialPositionId = personnel.positionConfig?.id || '';
    if (!initialPositionId && personnel.position) {
      const match = positions.find((p) => p.name === personnel.position);
      if (match) initialPositionId = match.id;
    }
    setEditForm({
      name: personnel.name,
      surname: personnel.surname,
      phone: personnel.phone || '',
      tcNo: personnel.tcNo || '',
      position: personnel.position || '',
      positionId: initialPositionId,
      startDate: new Date(personnel.startDate).toISOString().split('T')[0],
      salary: String(personnel.salary),
    });
    setIsEditing(true);
    setEditError('');
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');

    const payload: Record<string, any> = {};
    if (editForm.name !== personnel?.name) payload.name = editForm.name;
    if (editForm.surname !== personnel?.surname) payload.surname = editForm.surname;
    if (editForm.phone !== (personnel?.phone || ''))
      payload.phone = editForm.phone || undefined;
    if (editForm.tcNo !== (personnel?.tcNo || ''))
      payload.tcNo = editForm.tcNo || undefined;
    if (positions.length > 0) {
      const currentPositionId = personnel?.positionConfig?.id || '';
      if (editForm.positionId !== currentPositionId) {
        payload.positionId = editForm.positionId || null;
      }
    } else if (editForm.position !== (personnel?.position || '')) {
      payload.position = editForm.position || undefined;
    }
    if (
      editForm.startDate !==
      new Date(personnel?.startDate || '').toISOString().split('T')[0]
    )
      payload.startDate = editForm.startDate;
    if (editForm.salary !== String(personnel?.salary))
      payload.salary = Number(editForm.salary);

    if (Object.keys(payload).length === 0) {
      setIsEditing(false);
      return;
    }

    updateMutation.mutate(payload);
  };

  const handleLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLeaveError('');

    if (!leaveForm.startDate || !leaveForm.endDate) {
      setLeaveError('Baslangic ve bitis tarihleri zorunludur');
      return;
    }

    createLeaveMutation.mutate(leaveForm);
  };

  const formatCurrency = (value: string | number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(Number(value));
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('tr-TR');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Yukleniyor...</p>
      </div>
    );
  }

  if (!personnel) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Personel bulunamadi.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard/personnel">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Geri
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">
          {personnel.name} {personnel.surname}
        </h1>
        <Badge variant={personnel.isActive ? 'default' : 'secondary'}>
          {personnel.isActive ? 'Aktif' : 'Pasif'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personnel Info Card */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Personel Bilgileri</CardTitle>
              {!isEditing ? (
                <Button variant="outline" size="sm" onClick={startEditing}>
                  Duzenle
                </Button>
              ) : null}
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <form onSubmit={handleEditSubmit} className="space-y-4">
                  {editError && (
                    <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                      {editError}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-name">Ad</Label>
                      <Input
                        id="edit-name"
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm({ ...editForm, name: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-surname">Soyad</Label>
                      <Input
                        id="edit-surname"
                        value={editForm.surname}
                        onChange={(e) =>
                          setEditForm({ ...editForm, surname: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-phone">Telefon</Label>
                      <Input
                        id="edit-phone"
                        value={editForm.phone}
                        onChange={(e) =>
                          setEditForm({ ...editForm, phone: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-tcNo">TC Kimlik No</Label>
                      <Input
                        id="edit-tcNo"
                        value={editForm.tcNo}
                        onChange={(e) =>
                          setEditForm({ ...editForm, tcNo: e.target.value })
                        }
                        maxLength={11}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-position">Pozisyon</Label>
                    {positions.length > 0 ? (
                      <select
                        id="edit-position"
                        value={editForm.positionId}
                        onChange={(e) =>
                          setEditForm({ ...editForm, positionId: e.target.value })
                        }
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                      >
                        <option value="">Pozisyon Secin</option>
                        {positions.map((pos) => (
                          <option key={pos.id} value={pos.id}>
                            {pos.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        id="edit-position"
                        value={editForm.position}
                        onChange={(e) =>
                          setEditForm({ ...editForm, position: e.target.value })
                        }
                      />
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-startDate">Baslangic Tarihi</Label>
                      <Input
                        id="edit-startDate"
                        type="date"
                        value={editForm.startDate}
                        onChange={(e) =>
                          setEditForm({ ...editForm, startDate: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-salary">Maas (TL)</Label>
                      <Input
                        id="edit-salary"
                        type="number"
                        min="0"
                        step="0.01"
                        value={editForm.salary}
                        onChange={(e) =>
                          setEditForm({ ...editForm, salary: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                    >
                      Iptal
                    </Button>
                    <Button type="submit" disabled={updateMutation.isPending}>
                      <Save className="h-4 w-4 mr-2" />
                      {updateMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-2 gap-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Ad</p>
                    <p className="font-medium">{personnel.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Soyad</p>
                    <p className="font-medium">{personnel.surname}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Telefon</p>
                    <p className="font-medium">{personnel.phone ? formatPhone(personnel.phone) : '\u2014'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">TC Kimlik No</p>
                    <p className="font-medium">{personnel.tcNo || '\u2014'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Pozisyon</p>
                    <p className="font-medium">{personnel.positionConfig?.name || personnel.position || '\u2014'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Baslangic Tarihi</p>
                    <p className="font-medium">{formatDate(personnel.startDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Maas</p>
                    <p className="font-medium">{formatCurrency(personnel.salary)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Kayit Tarihi</p>
                    <p className="font-medium">{formatDate(personnel.createdAt)}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Work Days Card */}
        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg">Calisma Gunleri</CardTitle>
              </div>
              <Input
                type="month"
                value={workDaysMonth}
                onChange={(e) => setWorkDaysMonth(e.target.value)}
                className="mt-2"
              />
            </CardHeader>
            <CardContent>
              {workDays ? (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Toplam Gun</span>
                    <span className="font-medium">{workDays.totalDaysInMonth}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Hafta Sonu</span>
                    <span className="font-medium">{workDays.weekends}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Is Gunu</span>
                    <span className="font-medium">{workDays.businessDays}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Izinli Gun</span>
                    <span className="font-medium text-orange-600">
                      {workDays.leaveDays}
                    </span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Calisilan Gun</span>
                      <span className="font-bold text-green-600">
                        {workDays.workDays}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Yukleniyor...</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Leave Records Section */}
      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-lg">Izin Kayitlari</CardTitle>
          </div>
          <Button size="sm" onClick={() => setShowLeaveDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Yeni Izin Ekle
          </Button>
        </CardHeader>
        <CardContent>
          {personnel.leaveRecords.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Henuz izin kaydi yok.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Baslangic</TableHead>
                    <TableHead>Bitis</TableHead>
                    <TableHead>Izin Turu</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Notlar</TableHead>
                    <TableHead>Islemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {personnel.leaveRecords.map((leave) => (
                    <TableRow key={leave.id}>
                      <TableCell>{formatDate(leave.startDate)}</TableCell>
                      <TableCell>{formatDate(leave.endDate)}</TableCell>
                      <TableCell>
                        <Badge variant={leaveTypeMap[leave.type].variant}>
                          {leaveTypeMap[leave.type].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={leaveStatusMap[leave.status].variant}>
                          {leaveStatusMap[leave.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {leave.notes || '\u2014'}
                      </TableCell>
                      <TableCell>
                        {leave.status === 'PENDING' && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={updateLeaveStatusMutation.isPending}
                              onClick={() =>
                                updateLeaveStatusMutation.mutate({
                                  leaveId: leave.id,
                                  status: 'APPROVED',
                                })
                              }
                            >
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={updateLeaveStatusMutation.isPending}
                              onClick={() =>
                                updateLeaveStatusMutation.mutate({
                                  leaveId: leave.id,
                                  status: 'REJECTED',
                                })
                              }
                            >
                              <XCircle className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Leave Dialog */}
      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Izin Talebi</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLeaveSubmit} className="space-y-4">
            {leaveError && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                {leaveError}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="leave-startDate">Baslangic Tarihi</Label>
                <Input
                  id="leave-startDate"
                  type="date"
                  value={leaveForm.startDate}
                  onChange={(e) =>
                    setLeaveForm({ ...leaveForm, startDate: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="leave-endDate">Bitis Tarihi</Label>
                <Input
                  id="leave-endDate"
                  type="date"
                  value={leaveForm.endDate}
                  onChange={(e) =>
                    setLeaveForm({ ...leaveForm, endDate: e.target.value })
                  }
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="leave-type">Izin Turu</Label>
              <select
                id="leave-type"
                value={leaveForm.type}
                onChange={(e) =>
                  setLeaveForm({
                    ...leaveForm,
                    type: e.target.value as 'ANNUAL' | 'SICK' | 'OTHER',
                  })
                }
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              >
                <option value="ANNUAL">Yillik Izin</option>
                <option value="SICK">Hastalik Izni</option>
                <option value="OTHER">Diger</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="leave-notes">Notlar (opsiyonel)</Label>
              <Input
                id="leave-notes"
                value={leaveForm.notes}
                onChange={(e) =>
                  setLeaveForm({ ...leaveForm, notes: e.target.value })
                }
                placeholder="Izin hakkinda not ekleyebilirsiniz"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowLeaveDialog(false)}
              >
                Iptal
              </Button>
              <Button type="submit" disabled={createLeaveMutation.isPending}>
                {createLeaveMutation.isPending ? 'Olusturuluyor...' : 'Olustur'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
