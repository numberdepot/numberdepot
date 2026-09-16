'use client';

import { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import TablePagination from '@mui/material/TablePagination';
import InputAdornment from '@mui/material/InputAdornment';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import SearchIcon from '@mui/icons-material/Search';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import MarkEmailUnreadIcon from '@mui/icons-material/MarkEmailUnread';
import ArchiveIcon from '@mui/icons-material/Archive';
import DeleteOutlineIcon from '@mui/icons-material/Delete';
import ReplyIcon from '@mui/icons-material/Reply';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import { api } from '@/lib/api';
import { useSnackbar } from '@/lib/snackbar';

interface Suggestion {
  id: string;
  name: string;
  email: string;
  message: string;
  userId: string | null;
  source: string;
  status: 'new' | 'read' | 'archived';
  createdAt: string;
  readAt: string | null;
}

const statusColor: Record<Suggestion['status'], 'error' | 'default' | 'success'> = {
  new: 'error',
  read: 'success',
  archived: 'default',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function AdminSuggestionsPage() {
  const [rows, setRows] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<Suggestion | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(0); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page + 1));
      params.set('limit', String(limit));
      if (status !== 'all') params.set('status', status);
      if (debounced) params.set('q', debounced);
      const res = await api.get<Suggestion[]>(`/admin/suggestions?${params}`);
      setRows(res.data || []);
      if (res.pagination) setTotal(res.pagination.total);
      const extra = res as unknown as { unread?: number };
      if (typeof extra.unread === 'number') setUnread(extra.unread);
    } catch (err) {
      showSnackbar(err instanceof Error ? err.message : 'Failed to load suggestions', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, limit, status, debounced, showSnackbar]);

  useEffect(() => { load(); }, [load]);

  const setRowStatus = async (s: Suggestion, next: Suggestion['status']) => {
    setWorking(s.id);
    try {
      await api.put('/admin/suggestions', { id: s.id, status: next });
      setRows((prev) => prev.map((r) => (r.id === s.id ? { ...r, status: next } : r)));
      setUnread((u) => u + (s.status === 'new' ? -1 : 0) + (next === 'new' ? 1 : 0));
    } catch (err) {
      showSnackbar(err instanceof Error ? err.message : 'Update failed', 'error');
    } finally {
      setWorking(null);
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    const s = confirmDelete;
    setWorking(s.id);
    try {
      await api.delete(`/admin/suggestions?id=${s.id}`);
      setRows((prev) => prev.filter((r) => r.id !== s.id));
      setTotal((t) => Math.max(0, t - 1));
      if (s.status === 'new') setUnread((u) => Math.max(0, u - 1));
      showSnackbar('Suggestion deleted', 'info');
    } catch (err) {
      showSnackbar(err instanceof Error ? err.message : 'Delete failed', 'error');
    } finally {
      setWorking(null);
      setConfirmDelete(null);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1, minWidth: 260 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a1a2e', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <LightbulbIcon sx={{ color: '#E53935', fontSize: 32 }} />
            Suggestions
            {unread > 0 && (
              <Chip label={`${unread} new`} color="error" size="small" sx={{ fontWeight: 700, ml: 0.5 }} />
            )}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Ideas and feedback submitted through the &ldquo;Any suggestions?&rdquo; box on the homepage and the /suggestions page.
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField select size="small" label="Status" value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(0); }} sx={{ minWidth: 160 }}>
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="new">New</MenuItem>
          <MenuItem value="read">Read</MenuItem>
          <MenuItem value="archived">Archived</MenuItem>
        </TextField>
        <TextField size="small" placeholder="Search name, email or text…" value={search}
          onChange={(e) => setSearch(e.target.value)} sx={{ minWidth: 300, flex: 1 }}
          slotProps={{ input: { startAdornment: (
            <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
          ) } }} />
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : rows.length === 0 ? (
        <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <CardContent sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>
            <LightbulbIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography>No suggestions yet.</Typography>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {rows.map((s) => (
            <Card key={s.id} sx={{
              borderRadius: 3,
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              borderLeft: '4px solid',
              borderLeftColor: s.status === 'new' ? '#E53935' : s.status === 'read' ? '#84BD00' : '#cfd3da',
              opacity: s.status === 'archived' ? 0.7 : 1,
            }}>
              <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: 1, minWidth: 240 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75, flexWrap: 'wrap' }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {s.name || 'Anonymous'}
                      </Typography>
                      {s.email && (
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          &lt;{s.email}&gt;
                        </Typography>
                      )}
                      <Chip label={s.status} size="small" color={statusColor[s.status]} sx={{ fontSize: 11, height: 20 }} />
                      {s.userId && <Chip label="account" size="small" variant="outlined" sx={{ fontSize: 11, height: 20 }} />}
                      {s.source && <Chip label={s.source} size="small" variant="outlined" sx={{ fontSize: 11, height: 20 }} />}
                    </Box>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.65, color: '#1a1a2e' }}>
                      {s.message}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
                      {timeAgo(s.createdAt)} · {new Date(s.createdAt).toLocaleString()}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                    {s.email && (
                      <Tooltip title="Reply by email">
                        <IconButton size="small" component="a" href={`mailto:${s.email}?subject=Re: your suggestion to NumberDepot`}>
                          <ReplyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {s.status === 'new' ? (
                      <Tooltip title="Mark as read">
                        <IconButton size="small" disabled={working === s.id} onClick={() => setRowStatus(s, 'read')}>
                          <MarkEmailReadIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Tooltip title="Mark as new">
                        <IconButton size="small" disabled={working === s.id} onClick={() => setRowStatus(s, 'new')}>
                          <MarkEmailUnreadIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {s.status !== 'archived' && (
                      <Tooltip title="Archive">
                        <IconButton size="small" disabled={working === s.id} onClick={() => setRowStatus(s, 'archived')}>
                          <ArchiveIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" disabled={working === s.id} onClick={() => setConfirmDelete(s)}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {total > 0 && (
        <TablePagination component="div" count={total} page={page}
          onPageChange={(_, p) => setPage(p)} rowsPerPage={limit}
          onRowsPerPageChange={(e) => { setLimit(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[10, 25, 50, 100]} sx={{ mt: 1 }} />
      )}

      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete this suggestion?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            This cannot be undone. Archive it instead if you might want it later.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={remove} disabled={!!working}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
