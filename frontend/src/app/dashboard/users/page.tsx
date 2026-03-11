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
import { useAuthStore } from '@/stores/auth-store';

const ROLES = ['ADMIN', 'ACCOUNTANT', 'HR', 'STOCK_MANAGER', 'MENU_MANAGER'] as const;
const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Yonetici',
  ACCOUNTANT: 'Muhasebe',
  HR: 'Insan Kaynaklari',
  STOCK_MANAGER: 'Depocu',
  MENU_MANAGER: 'Menu Yoneticisi',
};
const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'default',
  ACCOUNTANT: 'secondary',
  HR: 'secondary',
  STOCK_MANAGER: 'secondary',
  MENU_MANAGER: 'secondary',
};

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
}

export default function UsersPage() {
  const currentUser = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<string>('ACCOUNTANT');

  const loadUsers = () => {
    api.get('/users').then(({ data }) => {
      setUsers(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { loadUsers(); }, []);

  const handleCreate = async () => {
    if (!newEmail || !newPassword || !newName) {
      toast.error('Tum alanlari doldurun.');
      return;
    }
    setCreating(true);
    try {
      await api.post('/users', { email: newEmail, password: newPassword, name: newName, role: newRole });
      toast.success('Kullanici olusturuldu.');
      setDialogOpen(false);
      setNewEmail(''); setNewPassword(''); setNewName(''); setNewRole('ACCOUNTANT');
      loadUsers();
    } catch {
      toast.error('Kullanici olusturulurken hata olustu.');
    } finally {
      setCreating(false);
    }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await api.patch(`/users/${userId}/role`, { role });
      toast.success('Rol guncellendi.');
      loadUsers();
    } catch {
      toast.error('Rol guncellenirken hata olustu.');
    }
  };

  const handleDeactivate = async (userId: string, userName: string) => {
    if (!confirm(`${userName} adli kullaniciyi silmek istediginize emin misiniz?`)) return;
    try {
      await api.delete(`/users/${userId}`);
      toast.success('Kullanici silindi.');
      loadUsers();
    } catch {
      toast.error('Kullanici silinirken hata olustu.');
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
          <Plus className="h-4 w-4 mr-2" /> Yeni Kullanici
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
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Henuz kullanici yok.
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    {u.id === currentUser?.id ? (
                      <Badge variant={ROLE_COLORS[u.role] as 'default' | 'secondary'}>{ROLE_LABELS[u.role]}</Badge>
                    ) : (
                      <select
                        className="flex h-8 rounded-md border border-input bg-transparent px-2 py-1 text-sm"
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                        ))}
                      </select>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.isActive ? 'default' : 'secondary'}>
                      {u.isActive ? 'Aktif' : 'Pasif'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {u.id !== currentUser?.id && (
                      <Button variant="ghost" size="icon" onClick={() => handleDeactivate(u.id, u.name)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
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
            <DialogTitle>Yeni Kullanici Ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ad Soyad</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>E-posta</Label>
              <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Sifre</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
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
              <Button onClick={handleCreate} disabled={creating}>
                {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Olustur
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
