'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';
import Checkbox from '@mui/material/Checkbox';
import Alert from '@mui/material/Alert';
import InputAdornment from '@mui/material/InputAdornment';
import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import { api } from '@/lib/api';
import { useSnackbar } from '@/lib/snackbar';

interface PhoneNumber {
  id: string;
  number: string;
  areaCode: string;
  numberType: string;
  source: string;
  status: string;
  basePrice: number;
  salePrice: number;
  monthlyPrice: number;
  setupFee: number;
  vanityText?: string;
  description?: string;
  city?: string;
  state?: string;
  isPremium: boolean;
  isVanity: boolean;
  allowOffers: boolean;
  minimumOffer: number;
  createdAt: string;
}

export default function AdminNumbersPage() {
  const [numbers, setNumbers] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [sourceFilter, setSourceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [areaCodeFilter, setAreaCodeFilter] = useState('');
  const [numberTypeFilter, setNumberTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [deleteDialog, setDeleteDialog] = useState<PhoneNumber | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editDialog, setEditDialog] = useState<PhoneNumber | null>(null);
  const [editForm, setEditForm] = useState({ basePrice: '', monthlyPrice: '', setupFee: '', status: '', numberType: '', vanityText: '', isPremium: false, description: '', allowOffers: true, minimumOffer: '' });
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDialog, setBulkDialog] = useState(false);
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);
  const [bulkForm, setBulkForm] = useState({ basePrice: '', monthlyPrice: '', setupFee: '', status: '', numberType: '', isPremium: '', allowOffers: '' });
  const [bulkSaving, setBulkSaving] = useState(false);

  const { showSnackbar } = useSnackbar();
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Debounce search query
  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(0);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery]);

  const fetchNumbers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page + 1));
      params.set('limit', String(limit));
      if (sourceFilter) params.set('source', sourceFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (debouncedQuery) params.set('q', debouncedQuery);
      if (areaCodeFilter) params.set('area_code', areaCodeFilter);
      if (numberTypeFilter) params.set('number_type', numberTypeFilter);
      if (sortBy) params.set('sort', sortBy);

      const res = await api.get<PhoneNumber[]>(`/numbers/admin/all?${params}`);
      if (res.data) setNumbers(res.data);
      if (res.pagination) setTotal(res.pagination.total);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load numbers';
      showSnackbar(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [page, limit, sourceFilter, statusFilter, debouncedQuery, areaCodeFilter, numberTypeFilter, sortBy, showSnackbar]);

  useEffect(() => {
    fetchNumbers();
    clearSelection();
  }, [fetchNumbers]);

  const handleDelete = async () => {
    if (!deleteDialog) return;
    setDeleting(true);
    try {
      await api.delete(`/numbers/admin/${deleteDialog.id}`);
      showSnackbar('Number deleted successfully', 'success');
      setDeleteDialog(null);
      fetchNumbers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete number';
      showSnackbar(message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const openEdit = (num: PhoneNumber) => {
    setEditForm({
      basePrice: String(num.basePrice || num.salePrice || 0),
      monthlyPrice: String(num.monthlyPrice || 0),
      setupFee: String(num.setupFee || 0),
      status: num.status,
      numberType: num.numberType || 'local',
      vanityText: num.vanityText || '',
      isPremium: num.isPremium || false,
      description: num.description || '',
      allowOffers: num.allowOffers ?? true,
      minimumOffer: num.minimumOffer ? String(num.minimumOffer) : '',
    });
    setEditDialog(num);
  };

  const handleEdit = async () => {
    if (!editDialog) return;
    setSaving(true);
    try {
      await api.put(`/numbers/admin/${editDialog.id}`, {
        basePrice: parseFloat(editForm.basePrice) || 0,
        monthlyPrice: parseFloat(editForm.monthlyPrice) || 0,
        setupFee: parseFloat(editForm.setupFee) || 0,
        status: editForm.status,
        numberType: editForm.numberType,
        vanityText: editForm.vanityText || undefined,
        isPremium: editForm.isPremium,
        description: editForm.description || undefined,
        allowOffers: editForm.allowOffers,
        minimumOffer: editForm.minimumOffer ? parseFloat(editForm.minimumOffer) : null,
      });
      showSnackbar('Number updated successfully', 'success');
      setEditDialog(null);
      fetchNumbers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update number';
      showSnackbar(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Selection helpers
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selected.size === numbers.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(numbers.map((n) => n.id)));
    }
  };
  const clearSelection = () => setSelected(new Set());

  // Bulk edit
  const handleBulkEdit = async () => {
    setBulkSaving(true);
    try {
      const updates: Record<string, unknown> = {};
      if (bulkForm.basePrice !== '') updates.basePrice = bulkForm.basePrice;
      if (bulkForm.monthlyPrice !== '') updates.monthlyPrice = bulkForm.monthlyPrice;
      if (bulkForm.setupFee !== '') updates.setupFee = bulkForm.setupFee;
      if (bulkForm.status) updates.status = bulkForm.status;
      if (bulkForm.numberType) updates.numberType = bulkForm.numberType;
      if (bulkForm.isPremium !== '') updates.isPremium = bulkForm.isPremium === 'true';
      if (bulkForm.allowOffers !== '') updates.allowOffers = bulkForm.allowOffers === 'true';

      const res = await api.put<{ matched: number; modified: number }>('/numbers/admin/bulk', {
        ids: Array.from(selected),
        updates,
      });
      showSnackbar(`${res.data?.modified || 0} numbers updated`, 'success');
      setBulkDialog(false);
      setBulkForm({ basePrice: '', monthlyPrice: '', setupFee: '', status: '', numberType: '', isPremium: '', allowOffers: '' });
      clearSelection();
      fetchNumbers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Bulk update failed';
      showSnackbar(message, 'error');
    } finally {
      setBulkSaving(false);
    }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    setBulkSaving(true);
    try {
      const res = await api.post<{ deleted: number; softDeleted: number }>('/numbers/admin/bulk', {
        ids: Array.from(selected),
      });
      const d = res.data;
      showSnackbar(`Deleted ${(d?.deleted || 0) + (d?.softDeleted || 0)} numbers`, 'success');
      setBulkDeleteDialog(false);
      clearSelection();
      fetchNumbers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Bulk delete failed';
      showSnackbar(message, 'error');
    } finally {
      setBulkSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'success';
      case 'sold': return 'default';
      case 'reserved': return 'warning';
      case 'inactive': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a1a2e' }}>
            Numbers Management{total > 0 && !loading ? ` (${total.toLocaleString()})` : ''}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Add, edit, delete, and bulk-manage phone numbers listed on the platform. Search by number or vanity text, filter by source/status/type, and control offer settings per number.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => {
              const params = new URLSearchParams();
              if (sourceFilter) params.set('source', sourceFilter);
              if (statusFilter) params.set('status', statusFilter);
              const token = localStorage.getItem('token');
              fetch(`/api/numbers/admin/export?${params}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
              })
                .then((res) => res.blob())
                .then((blob) => {
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `numbers-export-${new Date().toISOString().split('T')[0]}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                })
                .catch(() => showSnackbar('Export failed', 'error'));
            }}
            sx={{
              borderColor: '#002664',
              color: '#002664',
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            Export CSV
          </Button>
          <Button
            variant="outlined"
            startIcon={<UploadFileIcon />}
            onClick={() => router.push('/admin/numbers/upload')}
            sx={{
              borderColor: '#002664',
              color: '#002664',
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            Bulk Upload
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => router.push('/admin/numbers/new')}
            sx={{
              bgcolor: '#002664',
              '&:hover': { bgcolor: '#001a45' },
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            Add Number
          </Button>
        </Box>
      </Box>

      {/* Search */}
      <TextField
        placeholder="Search by number, vanity text..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        fullWidth
        size="small"
        sx={{ mb: 2 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            ),
          },
        }}
      />

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          select
          label="Source"
          value={sourceFilter}
          onChange={(e) => { setSourceFilter(e.target.value); setPage(0); }}
          sx={{ minWidth: 160 }}
          size="small"
        >
          <MenuItem value="">All Sources</MenuItem>
          <MenuItem value="inventory">Inventory</MenuItem>
          <MenuItem value="numberbarn">NumberBarn</MenuItem>
        </TextField>
        <TextField
          select
          label="Status"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          sx={{ minWidth: 160 }}
          size="small"
        >
          <MenuItem value="">All Statuses</MenuItem>
          <MenuItem value="available">Available</MenuItem>
          <MenuItem value="sold">Sold</MenuItem>
          <MenuItem value="reserved">Reserved</MenuItem>
          <MenuItem value="inactive">Inactive</MenuItem>
        </TextField>
        <TextField
          label="Area Code"
          value={areaCodeFilter}
          onChange={(e) => { setAreaCodeFilter(e.target.value.replace(/\D/g, '').slice(0, 3)); setPage(0); }}
          sx={{ width: 120 }}
          size="small"
          placeholder="e.g. 212"
        />
        <TextField
          select
          label="Number Type"
          value={numberTypeFilter}
          onChange={(e) => { setNumberTypeFilter(e.target.value); setPage(0); }}
          sx={{ minWidth: 160 }}
          size="small"
        >
          <MenuItem value="">All Types</MenuItem>
          <MenuItem value="local">Local</MenuItem>
          <MenuItem value="toll_free">Toll-Free</MenuItem>
          <MenuItem value="vanity">Vanity</MenuItem>
        </TextField>
        <TextField
          select
          label="Sort By"
          value={sortBy}
          onChange={(e) => { setSortBy(e.target.value); setPage(0); }}
          sx={{ minWidth: 160 }}
          size="small"
        >
          <MenuItem value="newest">Newest First</MenuItem>
          <MenuItem value="price_asc">Price: Low to High</MenuItem>
          <MenuItem value="price_desc">Price: High to Low</MenuItem>
          <MenuItem value="area_code">Area Code</MenuItem>
        </TextField>
      </Box>

      {/* Bulk Action Bar */}
      {selected.size > 0 && (
        <Alert
          severity="info"
          sx={{ mb: 2, borderRadius: 2, alignItems: 'center' }}
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button size="small" variant="outlined" onClick={() => setBulkDialog(true)} sx={{ textTransform: 'none', fontWeight: 600 }}>
                Bulk Edit
              </Button>
              <Button size="small" variant="outlined" color="error" onClick={() => setBulkDeleteDialog(true)} sx={{ textTransform: 'none', fontWeight: 600 }}>
                Delete
              </Button>
              <Button size="small" onClick={clearSelection} sx={{ textTransform: 'none' }}>
                Clear
              </Button>
            </Box>
          }
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {selected.size} number{selected.size > 1 ? 's' : ''} selected
          </Typography>
        </Alert>
      )}

      {/* Table */}
      <Card sx={{ borderRadius: 3, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8f9fb' }}>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={numbers.length > 0 && selected.size === numbers.length}
                    indeterminate={selected.size > 0 && selected.size < numbers.length}
                    onChange={toggleSelectAll}
                    size="small"
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Number</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Area Code</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Source</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Price</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Monthly</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} sx={{ color: '#002664' }} />
                  </TableCell>
                </TableRow>
              ) : numbers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    No numbers found
                  </TableCell>
                </TableRow>
              ) : (
                numbers.map((num) => (
                  <TableRow key={num.id} hover selected={selected.has(num.id)}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selected.has(num.id)}
                        onChange={() => toggleSelect(num.id)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, fontFamily: 'monospace' }}>{num.number}</TableCell>
                    <TableCell>{num.areaCode}</TableCell>
                    <TableCell>
                      <Chip label={num.numberType} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={num.source}
                        size="small"
                        sx={{
                          bgcolor: num.source === 'inventory' ? '#00266414' : '#E5393514',
                          color: num.source === 'inventory' ? '#002664' : '#E53935',
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {num.source === 'inventory' && !(num.basePrice || num.salePrice) ? (
                        <Chip label="Offer Only" size="small" sx={{ fontSize: '0.7rem', fontWeight: 600, bgcolor: '#00266414', color: '#002664' }} />
                      ) : (
                        <Typography variant="body2" sx={{ fontWeight: (num.basePrice || num.salePrice) ? 400 : 600, color: (num.basePrice || num.salePrice) ? 'inherit' : 'text.disabled' }}>
                          {(num.basePrice || num.salePrice) ? `$${(num.basePrice || num.salePrice).toFixed(2)}` : '—'}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ color: num.monthlyPrice ? 'inherit' : 'text.disabled' }}>
                      {num.monthlyPrice ? `$${num.monthlyPrice.toFixed(2)}` : '—'}
                    </TableCell>
                    <TableCell>
                      <Chip label={num.status} size="small" color={getStatusColor(num.status) as any} />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => openEdit(num)} sx={{ color: '#002664' }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => setDeleteDialog(num)} sx={{ color: '#E74C3C' }}>
                        <DeleteIcon fontSize="small" />
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteDialog} onClose={() => setDeleteDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Delete Number</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{deleteDialog?.number}</strong>? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteDialog(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Edit Dialog */}
      <Dialog open={bulkDialog} onClose={() => setBulkDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>
          Bulk Edit — {selected.size} Number{selected.size > 1 ? 's' : ''}
          <Typography variant="body2" color="text.secondary">
            Only fill fields you want to change. Empty fields will be left unchanged.
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: '16px !important' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1a1a2e', mt: 1, mb: -1 }}>
              Pricing
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Sale Price ($)"
                type="number"
                value={bulkForm.basePrice}
                onChange={(e) => setBulkForm({ ...bulkForm, basePrice: e.target.value })}
                fullWidth
                placeholder="Leave empty to skip"
                slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
              />
              <TextField
                label="Monthly ($)"
                type="number"
                value={bulkForm.monthlyPrice}
                onChange={(e) => setBulkForm({ ...bulkForm, monthlyPrice: e.target.value })}
                fullWidth
                placeholder="Leave empty to skip"
                slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
              />
            </Box>
            <TextField
              label="Setup Fee ($)"
              type="number"
              value={bulkForm.setupFee}
              onChange={(e) => setBulkForm({ ...bulkForm, setupFee: e.target.value })}
              fullWidth
              placeholder="Leave empty to skip"
              slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
            />

            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1a1a2e', mt: 1, mb: -1 }}>
              Classification
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                select
                label="Status"
                value={bulkForm.status}
                onChange={(e) => setBulkForm({ ...bulkForm, status: e.target.value })}
                fullWidth
              >
                <MenuItem value="">— Don&apos;t change —</MenuItem>
                <MenuItem value="available">Available</MenuItem>
                <MenuItem value="sold">Sold</MenuItem>
                <MenuItem value="reserved">Reserved</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </TextField>
              <TextField
                select
                label="Number Type"
                value={bulkForm.numberType}
                onChange={(e) => setBulkForm({ ...bulkForm, numberType: e.target.value })}
                fullWidth
              >
                <MenuItem value="">— Don&apos;t change —</MenuItem>
                <MenuItem value="local">Local</MenuItem>
                <MenuItem value="toll_free">Toll-Free</MenuItem>
                <MenuItem value="vanity">Vanity</MenuItem>
              </TextField>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                select
                label="Premium"
                value={bulkForm.isPremium}
                onChange={(e) => setBulkForm({ ...bulkForm, isPremium: e.target.value })}
                fullWidth
              >
                <MenuItem value="">— Don&apos;t change —</MenuItem>
                <MenuItem value="true">Yes</MenuItem>
                <MenuItem value="false">No</MenuItem>
              </TextField>
              <TextField
                select
                label="Allow Offers"
                value={bulkForm.allowOffers}
                onChange={(e) => setBulkForm({ ...bulkForm, allowOffers: e.target.value })}
                fullWidth
              >
                <MenuItem value="">— Don&apos;t change —</MenuItem>
                <MenuItem value="true">Yes</MenuItem>
                <MenuItem value="false">No</MenuItem>
              </TextField>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setBulkDialog(false)} disabled={bulkSaving}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleBulkEdit}
            disabled={bulkSaving}
            sx={{ bgcolor: '#002664', '&:hover': { bgcolor: '#001a45' } }}
          >
            {bulkSaving ? 'Updating...' : `Update ${selected.size} Numbers`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Delete Confirmation */}
      <Dialog open={bulkDeleteDialog} onClose={() => setBulkDeleteDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Delete {selected.size} Numbers</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{selected.size} numbers</strong>? Sold numbers will be marked inactive instead.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setBulkDeleteDialog(false)} disabled={bulkSaving}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleBulkDelete} disabled={bulkSaving}>
            {bulkSaving ? 'Deleting...' : `Delete ${selected.size} Numbers`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editDialog} onClose={() => setEditDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>
          Edit Number: {editDialog?.number}
          {editDialog?.city && editDialog?.state && (
            <Typography variant="body2" color="text.secondary">
              {editDialog.city}, {editDialog.state}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent sx={{ pt: '16px !important' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Pricing */}
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1a1a2e', mt: 1, mb: -1 }}>
              Pricing
            </Typography>
            {editDialog?.source === 'inventory' && (
              <Alert severity="info" sx={{ borderRadius: 2, fontSize: '0.8rem' }}>
                Leave price empty for <strong>Offer Only</strong> — buyers will see &quot;Make an Offer&quot;. If you set a price, buyers will see the price with an &quot;Add to Cart&quot; option.
              </Alert>
            )}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Sale Price ($)"
                type="number"
                value={editForm.basePrice}
                onChange={(e) => setEditForm({ ...editForm, basePrice: e.target.value })}
                fullWidth
                slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                placeholder={editDialog?.source === 'inventory' ? 'Leave empty for offer-only' : '0.00'}
              />
              <TextField
                label="Monthly ($)"
                type="number"
                value={editForm.monthlyPrice}
                onChange={(e) => setEditForm({ ...editForm, monthlyPrice: e.target.value })}
                fullWidth
                slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
              />
            </Box>
            <TextField
              label="Setup Fee ($)"
              type="number"
              value={editForm.setupFee}
              onChange={(e) => setEditForm({ ...editForm, setupFee: e.target.value })}
              fullWidth
              slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
            />

            {/* Classification */}
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1a1a2e', mt: 1, mb: -1 }}>
              Classification
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                select
                label="Number Type"
                value={editForm.numberType}
                onChange={(e) => setEditForm({ ...editForm, numberType: e.target.value })}
                fullWidth
              >
                <MenuItem value="local">Local</MenuItem>
                <MenuItem value="toll_free">Toll-Free</MenuItem>
                <MenuItem value="vanity">Vanity</MenuItem>
              </TextField>
              <TextField
                select
                label="Status"
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                fullWidth
              >
                <MenuItem value="available">Available</MenuItem>
                <MenuItem value="sold">Sold</MenuItem>
                <MenuItem value="reserved">Reserved</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </TextField>
            </Box>
            <TextField
              label="Vanity Text"
              value={editForm.vanityText}
              onChange={(e) => setEditForm({ ...editForm, vanityText: e.target.value })}
              fullWidth
              placeholder="e.g. 1-800-FLOWERS"
            />
            <TextField
              label="Description"
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
              placeholder="Location or description..."
            />
            <Box>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={editForm.isPremium}
                  onChange={(e) => setEditForm({ ...editForm, isPremium: e.target.checked })}
                />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>Premium Number</Typography>
              </label>
            </Box>

            {/* Offer Settings */}
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1a1a2e', mt: 1, mb: -1 }}>
              Offer Settings
            </Typography>
            {editDialog?.source === 'inventory' && !editForm.basePrice ? (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                No price set — this number is <strong>Offer Only</strong>. Buyers will submit offers.
              </Typography>
            ) : (
              <Box>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={editForm.allowOffers}
                    onChange={(e) => setEditForm({ ...editForm, allowOffers: e.target.checked })}
                  />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>Allow Offers</Typography>
                </label>
              </Box>
            )}
            {((!editForm.basePrice && editDialog?.source === 'inventory') || editForm.allowOffers) && (
              <TextField
                label="Minimum Offer ($)"
                type="number"
                value={editForm.minimumOffer}
                onChange={(e) => setEditForm({ ...editForm, minimumOffer: e.target.value })}
                fullWidth
                slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                placeholder="No minimum"
                helperText="Minimum amount buyers can offer. Leave empty for no minimum."
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditDialog(null)} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleEdit}
            disabled={saving}
            sx={{ bgcolor: '#002664', '&:hover': { bgcolor: '#001a45' } }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
