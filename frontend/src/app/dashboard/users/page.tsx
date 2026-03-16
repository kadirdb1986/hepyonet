'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';

const ROLES = ['ADMIN', 'ACCOUNTANT', 'HR', 'STOCK_MANAGER', 'MENU_MANAGER', 'WAITER'] as const;
const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Sahip',
  ADMIN: 'Yonetici',
  ACCOUNTANT: 'Muhasebe',
  HR: 'Insan Kaynaklari',
  STOCK_MANAGER: 'Depocu',
  MENU_MANAGER: 'Menu Yoneticisi',
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
      toast.success('Kullanici eklendi.');
      setDialogOpen(false);
      setNewEmail('');
      setNewRole('ACCOUNTANT');
      loadMembers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Kullanici eklenirken hata olustu.');
    } finally {
      setCreating(false);
    }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await api.patch(`/restaurants/current/members/${userId}/role`, { role });
      toast.success('Rol guncellendi.');
      loadMembers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Rol guncellenirken hata olustu.');
    }
  };

  const handleDeactivate = async (userId: string, userName: string) => {
    if (!confirm(`${userName} adli kullaniciyi cikarmak istediginize emin misiniz?`)) return;
    try {
      await api.delete(`/restaurants/current/members/${userId}`);
      toast.success('Kullanici cikarildi.');
      loadMembers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Kullanici cikarilirken hata olustu.');
    }
  };

  const handleTransferOwnership = async (userId: string, userName: string) => {
    if (!confirm(`Sahipligi ${userName} adli kullaniciya devretmek istediginize emin misiniz? Bu islem geri alinamaz.`)) return;
    try {
      await api.post('/restaurants/current/transfer-ownership', { targetUserId: userId });
      toast.success('Sahiplik devredildi.');
      // Refresh auth to get updated membership
      window.location.reload();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Sahiplik devredilirken hata olustu.');
    }
  };

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
        <h1 className="text-2xl font-bold">Kullanicilar</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Kullanici Ekle
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ad Soyad</TableHead>
              <TableHead>E-posta</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead>Islemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Henuz kullanici yok.
                </TableCell>
              </TableRow>
            ) : (
              members.map((m) => (
                <TableRow key={m.id} className={!m.isActive ? 'opacity-50' : ''}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell>{m.email}</TableCell>
                  <TableCell>
                    {m.role === 'OWNER' || m.userId === user?.id ? (
                      <Badge variant={m.role === 'OWNER' ? 'default' : 'secondary'}>
                        {ROLE_LABELS[m.role]}
                      </Badge>
                    ) : (
                      <select
                        className="flex h-8 rounded-md border border-input bg-transparent px-2 py-1 text-sm"
                        value={m.role}
                        onChange={(e) => handleRoleChange(m.userId, e.target.value)}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                        ))}
                      </select>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={m.isActive ? 'default' : 'secondary'}>
                      {m.isActive ? 'Aktif' : 'Pasif'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {m.role !== 'OWNER' && m.userId !== user?.id && m.isActive && (
                        <Button variant="ghost" size="icon" onClick={() => handleDeactivate(m.userId, m.name)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                      {isOwner && m.role !== 'OWNER' && m.userId !== user?.id && m.isActive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          onClick={() => handleTransferOwnership(m.userId, m.name)}
                        >
                          Sahiplik Devret
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kullanici Ekle</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Eklemek istediginiz kisinin sistemde kayitli e-posta adresini girin.
          </p>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>E-posta</Label>
              <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="kullanici@ornek.com" />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Iptal</Button>
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
