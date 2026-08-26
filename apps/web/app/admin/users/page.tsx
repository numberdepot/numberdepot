'use client';

import { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import CircularProgress from '@mui/material/CircularProgress';
import SearchIcon from '@mui/icons-material/Search';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/Block';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import LockResetIcon from '@mui/icons-material/LockReset';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { api } from '@/lib/api';
import { useSnackbar } from '@/lib/snackbar';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  createdAt: string;
  phone?: string;
  companyName?: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [resetDialog, setResetDialog] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  // Create Admin dialog state
  const [createAdminOpen, setCreateAdminOpen] = useState(false);
  const [adminForm, setAdminForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  const { showSnackbar } = useSnackbar();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page + 1));
      params.set('limit', String(limit));
      if (roleFilter) params.set('role', roleFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);

      const res = await api.get<User[]>(`/users?${params}`);
      if (res.data) setUsers(res.data);
      if (res.pagination) setTotal(res.pagination.total);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load users';
      showSnackbar(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [page, limit, roleFilter, statusFilter, search, showSnackbar]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(0);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleStatusUpdate = async (userId: string, newStatus: string) => {
    try {
      await api.put(`/users/${userId}/status`, { status: newStatus });
      showSnackbar(`User ${newStatus} successfully`, 'success');
      setAnchorEl(null);
      setSelectedUser(null);
      fetchUsers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update user status';
      showSnackbar(message, 'error');
    }
  };

  const handleResetPassword = async () => {
    if (!resetDialog || !newPassword) return;
    setResetting(true);
    try {
      await api.put(`/users/${resetDialog.id}/reset-password`, { newPassword });
      showSnackbar(`Password reset for ${resetDialog.email}`, 'success');
      setResetDialog(null);
      setNewPassword('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reset password';
      showSnackbar(message, 'error');
    } finally {
      setResetting(false);
    }
  };

  const handleCreateAdmin = async () => {
    const { firstName, lastName, email, password } = adminForm;
    if (!firstName || !lastName || !email || !password) {
      showSnackbar('All fields are required', 'error');
      return;
    }
    if (password.length < 6) {
      showSnackbar('Password must be at least 6 characters', 'error');
      return;
    }
    setCreatingAdmin(true);
    try {
      await api.post('/admin/create-admin', { firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), password });
      showSnackbar('Admin account created successfully', 'success');
      setCreateAdminOpen(false);
      setAdminForm({ firstName: '', lastName: '', email: '', password: '' });
      fetchUsers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create admin';
      showSnackbar(message, 'error');
    } finally {
      setCreatingAdmin(false);
    }
  };

  const openMenu = (event: React.MouseEvent<HTMLElement>, user: User) => {
    setAnchorEl(event.currentTarget);
    setSelectedUser(user);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
      case 'super_admin': return { bgcolor: '#00266414', color: '#002664' };
      case 'seller': return { bgcolor: '#84BD0014', color: '#84BD00' };
      case 'buyer': return { bgcolor: '#4BA0A114', color: '#4BA0A1' };
      default: return { bgcolor: '#eee', color: '#666' };
    }
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'active': return <Chip label="Active" size="small" color="success" />;
      case 'suspended': return <Chip label="Suspended" size="small" color="warning" />;
      case 'banned': return <Chip label="Banned" size="small" color="error" />;
      case 'pending': return <Chip label="Pending" size="small" color="info" />;
      default: return <Chip label={status} size="small" />;
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a1a2e' }}>
            Users Management
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            All registered users (buyers, sellers, admins). View profiles, change roles, activate/deactivate accounts.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={() => setCreateAdminOpen(true)}
          sx={{
            bgcolor: '#002664',
            '&:hover': { bgcolor: '#001a45' },
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 2,
            px: 3,
          }}
        >
          Create Admin
        </Button>
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Search by name or email..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          size="small"
          sx={{ minWidth: 280 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                </InputAdornment>
              ),
              endAdornment: searchInput ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={handleSearch}>
                    <SearchIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            },
          }}
        />
        <TextField
          select
          label="Role"
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(0); }}
          sx={{ minWidth: 150 }}
          size="small"
        >
          <MenuItem value="">All Roles</MenuItem>
          <MenuItem value="buyer">Buyer</MenuItem>
          <MenuItem value="seller">Seller</MenuItem>
          <MenuItem value="admin">Admin</MenuItem>
        </TextField>
        <TextField
          select
          label="Status"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          sx={{ minWidth: 150 }}
          size="small"
        >
          <MenuItem value="">All Statuses</MenuItem>
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="suspended">Suspended</MenuItem>
          <MenuItem value="banned">Banned</MenuItem>
          <MenuItem value="pending">Pending</MenuItem>
        </TextField>
      </Box>

      {/* Table */}
      <Card sx={{ borderRadius: 3, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8f9fb' }}>
                <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Joined</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} sx={{ color: '#002664' }} />
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            bgcolor: '#002664',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: 13,
                            flexShrink: 0,
                          }}
                        >
                          {u.firstName?.[0]}{u.lastName?.[0]}
                        </Box>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {u.firstName} {u.lastName}
                          </Typography>
                          {u.companyName && (
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              {u.companyName}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary' }}>{u.email}</TableCell>
                    <TableCell>
                      <Chip
                        label={u.role.replace('_', ' ')}
                        size="small"
                        sx={{ ...getRoleColor(u.role), fontWeight: 600, textTransform: 'capitalize' }}
                      />
                    </TableCell>
                    <TableCell>{getStatusChip(u.status)}</TableCell>
                    <TableCell sx={{ color: 'text.secondary' }}>
                      {new Date(u.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={(e) => openMenu(e, u)}>
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={limit}
          onRowsPerPageChange={(e) => { setLimit(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </Card>

      {/* Status Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => { setAnchorEl(null); setSelectedUser(null); }}
        slotProps={{ paper: { sx: { minWidth: 180, borderRadius: 2 } } }}
      >
        {selectedUser && selectedUser.status !== 'active' && (
          <MenuItem
            onClick={() => selectedUser && handleStatusUpdate(selectedUser.id, 'active')}
            sx={{ gap: 1.5, color: '#84BD00' }}
          >
            <CheckCircleIcon fontSize="small" /> Activate
          </MenuItem>
        )}
        {selectedUser && selectedUser.status !== 'suspended' && (
          <MenuItem
            onClick={() => selectedUser && handleStatusUpdate(selectedUser.id, 'suspended')}
            sx={{ gap: 1.5, color: '#F39C12' }}
          >
            <RemoveCircleIcon fontSize="small" /> Suspend
          </MenuItem>
        )}
        {selectedUser && selectedUser.status !== 'banned' && (
          <MenuItem
            onClick={() => selectedUser && handleStatusUpdate(selectedUser.id, 'banned')}
            sx={{ gap: 1.5, color: '#E74C3C' }}
          >
            <BlockIcon fontSize="small" /> Ban
          </MenuItem>
        )}
        <MenuItem
          onClick={() => {
            setResetDialog(selectedUser);
            setAnchorEl(null);
          }}
          sx={{ gap: 1.5, color: '#7B68EE' }}
        >
          <LockResetIcon fontSize="small" /> Reset Password
        </MenuItem>
      </Menu>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetDialog} onClose={() => { setResetDialog(null); setNewPassword(''); }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Reset Password</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Set a new password for <strong>{resetDialog?.email}</strong>
          </Typography>
          <TextField
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            fullWidth
            autoFocus
            helperText="Minimum 6 characters"
            error={newPassword.length > 0 && newPassword.length < 6}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setResetDialog(null); setNewPassword(''); }} disabled={resetting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleResetPassword}
            disabled={resetting || newPassword.length < 6}
            sx={{ bgcolor: '#002664', '&:hover': { bgcolor: '#001a45' } }}
          >
            {resetting ? 'Resetting...' : 'Reset Password'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Admin Dialog */}
      <Dialog open={createAdminOpen} onClose={() => { if (!creatingAdmin) { setCreateAdminOpen(false); setAdminForm({ firstName: '', lastName: '', email: '', password: '' }); } }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Create Admin Account</DialogTitle>
        <DialogContent sx={{ pt: '16px !important' }}>
          <Typography variant="body2" sx={{ mb: 2.5, color: 'text.secondary' }}>
            Create a new admin account. The admin will be able to log in immediately with the credentials you set.
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="First Name"
                value={adminForm.firstName}
                onChange={(e) => setAdminForm({ ...adminForm, firstName: e.target.value })}
                fullWidth
                autoFocus
              />
              <TextField
                label="Last Name"
                value={adminForm.lastName}
                onChange={(e) => setAdminForm({ ...adminForm, lastName: e.target.value })}
                fullWidth
              />
            </Box>
            <TextField
              label="Email"
              type="email"
              value={adminForm.email}
              onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
              fullWidth
            />
            <TextField
              label="Password"
              type="password"
              value={adminForm.password}
              onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
              fullWidth
              helperText="Minimum 6 characters"
              error={adminForm.password.length > 0 && adminForm.password.length < 6}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => { setCreateAdminOpen(false); setAdminForm({ firstName: '', lastName: '', email: '', password: '' }); }}
            disabled={creatingAdmin}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateAdmin}
            disabled={creatingAdmin || !adminForm.firstName || !adminForm.lastName || !adminForm.email || adminForm.password.length < 6}
            sx={{
              bgcolor: '#002664',
              '&:hover': { bgcolor: '#001a45' },
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            {creatingAdmin ? 'Creating...' : 'Create Admin'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
