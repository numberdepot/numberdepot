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
import IconButton from '@mui/material/IconButton';
import Collapse from '@mui/material/Collapse';
import CircularProgress from '@mui/material/CircularProgress';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import DownloadIcon from '@mui/icons-material/Download';
import Button from '@mui/material/Button';
import { api } from '@/lib/api';
import { useSnackbar } from '@/lib/snackbar';

interface OrderItem {
  id: string;
  number: string;
  price: number;
  type: string;
}

interface Order {
  id: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  status: string;
  totalAmount: number;
  items?: OrderItem[];
  paymentMethod?: string;
  createdAt: string;
  updatedAt?: string;
}

function OrderRow({ order }: { order: Order }) {
  const [open, setOpen] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'processing': return 'info';
      case 'cancelled': return 'error';
      case 'refunded': return 'default';
      default: return 'default';
    }
  };

  return (
    <>
      <TableRow hover>
        <TableCell>
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell sx={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 13 }}>
          {order.id.substring(0, 12)}...
        </TableCell>
        <TableCell>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {order.userName || 'N/A'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {order.userEmail || ''}
            </Typography>
          </Box>
        </TableCell>
        <TableCell sx={{ fontWeight: 600 }}>
          ${order.totalAmount?.toFixed(2)}
        </TableCell>
        <TableCell>
          <Chip label={order.status} size="small" color={getStatusColor(order.status) as any} />
        </TableCell>
        <TableCell sx={{ color: 'text.secondary' }}>
          {order.paymentMethod || 'N/A'}
        </TableCell>
        <TableCell sx={{ color: 'text.secondary' }}>
          {new Date(order.createdAt).toLocaleString()}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ py: 2, px: 3, bgcolor: '#f8f9fb', borderRadius: 2, my: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, color: '#1a1a2e' }}>
                Order Details
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 2 }}>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>Order ID</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{order.id}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>User ID</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{order.userId}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>Created</Typography>
                  <Typography variant="body2">{new Date(order.createdAt).toLocaleString()}</Typography>
                </Box>
                {order.updatedAt && (
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Updated</Typography>
                    <Typography variant="body2">{new Date(order.updatedAt).toLocaleString()}</Typography>
                  </Box>
                )}
              </Box>
              {order.items && order.items.length > 0 && (
                <>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#1a1a2e' }}>
                    Items ({order.items.length})
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>Number</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>Type</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: 12 }} align="right">Price</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {order.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell sx={{ fontFamily: 'monospace' }}>{item.number}</TableCell>
                          <TableCell>{item.type}</TableCell>
                          <TableCell align="right">${item.price?.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { showSnackbar } = useSnackbar();

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page + 1));
      params.set('limit', String(limit));
      if (statusFilter) params.set('status', statusFilter);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const res = await api.get<Order[]>(`/orders/admin/all?${params}`);
      if (res.data) setOrders(res.data);
      if (res.pagination) setTotal(res.pagination.total);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load orders';
      showSnackbar(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, dateFrom, dateTo, showSnackbar]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a1a2e' }}>
            Orders Management
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            All customer purchases appear here. Track order status (pending, processing, completed, failed) and view order details including items, totals, and payment info.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={() => {
            const params = new URLSearchParams();
            if (statusFilter) params.set('status', statusFilter);
            if (dateFrom) params.set('dateFrom', dateFrom);
            if (dateTo) params.set('dateTo', dateTo);
            const token = localStorage.getItem('token');
            fetch(`/api/orders/admin/export?${params}`, {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            })
              .then((res) => res.blob())
              .then((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `orders-export-${new Date().toISOString().split('T')[0]}.csv`;
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
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          select
          label="Status"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          sx={{ minWidth: 180 }}
          size="small"
        >
          <MenuItem value="">All Statuses</MenuItem>
          <MenuItem value="pending">Pending</MenuItem>
          <MenuItem value="processing">Processing</MenuItem>
          <MenuItem value="completed">Completed</MenuItem>
          <MenuItem value="cancelled">Cancelled</MenuItem>
          <MenuItem value="refunded">Refunded</MenuItem>
        </TextField>
        <TextField
          label="From Date"
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
          size="small"
          sx={{ minWidth: 160 }}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          label="To Date"
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
          size="small"
          sx={{ minWidth: 160 }}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        {(dateFrom || dateTo) && (
          <Button
            size="small"
            onClick={() => { setDateFrom(''); setDateTo(''); setPage(0); }}
            sx={{ textTransform: 'none', color: '#E53935', fontWeight: 600 }}
          >
            Clear Dates
          </Button>
        )}
      </Box>

      {/* Table */}
      <Card sx={{ borderRadius: 3, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8f9fb' }}>
                <TableCell sx={{ width: 48 }} />
                <TableCell sx={{ fontWeight: 600 }}>Order ID</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Customer</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Total</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Payment</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} sx={{ color: '#002664' }} />
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    No orders found
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => <OrderRow key={order.id} order={order} />)
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
    </Box>
  );
}
