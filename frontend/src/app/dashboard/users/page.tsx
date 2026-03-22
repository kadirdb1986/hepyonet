'use client';

import { useEffect, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ROLES = ['ADMIN', 'ACCOUNTANT', 'HR', 'STOCK_MANAGER', 'MENU_MANAGER', 'WAITER'] as const;
const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Sahip',
  ADMIN: 'Yönetici',
  ACCOUNTANT: 'Muhasebe',
  HR: 'İnsan Kaynakları',
  STOCK_MANAGER: 'Depocu',
  MENU_MANAGER: 'Menü Yöneticisi',
  WAITER: 'Garson',
};

interface Member {
  id: string;
  userId: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
}

export default function UsersPage() {
  const { user, activeMembership } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<string>('ACCOUNTANT');

  const isOwner = activeMembership?.role === 'OWNER';

  const loadMembers = () => {
    api.get('/restaurants/current/members').then(({ data }) => {
      setMembers(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { loadMembers(); }, []);

  const handleAdd = async () => {
    if (!newEmail) {
      toast.error('E-posta adresini girin.');
      return;
    }
    setCreating(true);
    try {
      await api.post('/restaurants/current/members', { email: newEmail, role: newRole });
      toast.success('Kullanıcı eklendi.');
      setDialogOpen(false);
      setNewEmail('');
      setNewRole('ACCOUNTANT');
      loadMembers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Kullanıcı eklenirken hata oluştu.');
    } finally {
      setCreating(false);
    }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await api.patch(`/restaurants/current/members/${userId}/role`, { role });
      toast.success('Rol güncellendi.');
      loadMembers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Rol güncellenirken hata oluştu.');
    }
  };

  const handleDeactivate = async (userId: string, userName: string) => {
    if (!confirm(`${userName} adlı kullanıcıyı çıkarmak istediğinize emin misiniz?`)) return;
    try {
      await api.delete(`/restaurants/current/members/${userId}`);
      toast.success('Kullanıcı çıkarıldı.');
      loadMembers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Kullanıcı çıkarılırken hata oluştu.');
    }
  };

  const handleReactivate = async (userId: string) => {
    try {
      await api.post('/restaurants/current/members', { email: members.find(m => m.userId === userId)?.email, role: 'ADMIN' });
      toast.success('Kullanıcı tekrar aktif edildi.');
      loadMembers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Kullanıcı aktif edilirken hata oluştu.');
    }
  };

  const handleRemove = async (userId: string, userName: string) => {
    if (!confirm(`${userName} adlı kullanıcıyı kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) return;
    try {
      await api.delete(`/restaurants/current/members/${userId}/permanent`);
      toast.success('Kullanıcı kalıcı olarak silindi.');
      loadMembers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Kullanıcı silinirken hata oluştu.');
    }
  };

  const handleTransferOwnership = async (userId: string, userName: string) => {
    if (!confirm(`Sahipliği ${userName} adlı kullanıcıya devretmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) return;
    try {
      await api.post('/restaurants/current/transfer-ownership', { targetUserId: userId });
      toast.success('Sahiplik devredildi.');
      window.location.reload();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Sahiplik devredilirken hata oluştu.');
    }
  };

  const columns: ColumnDef<Member>[] = [
    {
      id: 'name',
      accessorKey: 'name',
      meta: { label: 'Ad Soyad' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Ad Soyad" />
      ),
      cell: ({ row }) => (
        <span className={`font-medium${!row.original.isActive ? ' opacity-50' : ''}`}>
          {row.original.name}
        </span>
      ),
    },
    {
      accessorKey: 'email',
      meta: { label: 'E-posta' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="E-posta" />
      ),
      cell: ({ row }) => (
        <span className={!row.original.isActive ? 'opacity-50' : ''}>
          {row.original.email}
        </span>
      ),
    },
    {
      id: 'role',
      accessorKey: 'role',
      meta: { label: 'Rol' },
      header: 'Rol',
      cell: ({ row }) => {
        const m = row.original;
        const inactive = !m.isActive;
        if (m.role === 'OWNER' || m.userId === user?.id) {
          return (
            <span className={inactive ? 'opacity-50' : ''}>
              <Badge variant={m.role === 'OWNER' ? 'default' : 'secondary'}>
                {ROLE_LABELS[m.role]}
              </Badge>
            </span>
          );
        }
        return (
          <span className={inactive ? 'opacity-50' : ''}>
            <Select
              value={m.role}
              onValueChange={(value) => handleRoleChange(m.userId, value)}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </span>
        );
      },
    },
    {
      id: 'status',
      meta: { label: 'Durum' },
      header: 'Durum',
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? 'default' : 'secondary'}>
          {row.original.isActive ? 'Aktif' : 'Pasif'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const m = row.original;
        const canAct = m.role !== 'OWNER' && m.userId !== user?.id;
        if (!canAct) return null;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <span className="sr-only">Menüyü aç</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {m.isActive ? (
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => handleDeactivate(m.userId, m.name)}
                >
                  Pasife Al
                </DropdownMenuItem>
              ) : (
                <>
                  <DropdownMenuItem onClick={() => handleReactivate(m.userId)}>
                    Aktife Al
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => handleRemove(m.userId, m.name)}
                  >
                    Sil
                  </DropdownMenuItem>
                </>
              )}
              {isOwner && m.isActive && (
                <DropdownMenuItem onClick={() => handleTransferOwnership(m.userId, m.name)}>
                  Sahipliği Devret
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Kullanıcılar</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Kullanıcı Ekle
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Kullanıcı Listesi</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={members}
            showToolbar={false}
            emptyMessage="Henüz kullanıcı yok."
          />
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kullanıcı Ekle</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Eklemek istediğiniz kişinin sistemde kayıtlı e-posta adresini girin.
          </p>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>E-posta</Label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="kullanici@ornek.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={newRole} onValueChange={(value) => setNewRole(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>İptal</Button>
              <Button onClick={handleAdd} disabled={creating}>
                {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Ekle
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
