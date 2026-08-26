'use client';

import { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import CircularProgress from '@mui/material/CircularProgress';
import Skeleton from '@mui/material/Skeleton';
import Button from '@mui/material/Button';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import { api } from '@/lib/api';
import { useSnackbar } from '@/lib/snackbar';

interface CommissionSummary {
  totalRevenue: number;
  totalCommissions: number;
  pendingCommissions: number;
  paidCommissions: number;
}

interface Commission {
  id: string;
  orderId: string;
  sellerId?: string;
  sellerName?: string;
  sellerEmail?: string;
  amount: number;
  rate: number;
  status: string;
  createdAt: string;
  paidAt?: string;
}

export default function AdminCommissionsPage() {
  const [summary, setSummary] = useState<CommissionSummary | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { showSnackbar } = useSnackbar();

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await api.get<CommissionSummary>('/commissions/admin/summary');
      if (res.data) setSummary(res.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load summary';
      showSnackbar(message, 'error');
    } finally {
      setSummaryLoading(false);
    }
  }, [showSnackbar]);

  const fetchCommissions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const res = await api.get<Commission[]>(`/commissions/admin?${params}`);
      if (res.data) setCommissions(res.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load commissions';
      showSnackbar(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateFrom, dateTo, showSnackbar]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchCommissions();
  }, [fetchCommissions]);

  const summaryCards = [
    {
      label: 'Total Revenue',
      value: summary?.totalRevenue,
      icon: <AttachMoneyIcon />,
      color: '#84BD00',
    },
    {
      label: 'Total Commissions',
      value: summary?.totalCommissions,
      icon: <TrendingUpIcon />,
      color: '#002664',
    },
    {
      label: 'Pending Payouts',
      value: summary?.pendingCommissions,
      icon: <PendingActionsIcon />,
      color: '#E53935',
    },
    {
      label: 'Paid Out',
      value: summary?.paidCommissions,
      icon: <AccountBalanceIcon />,
      color: '#4BA0A1',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'success';
      case 'pending': return 'warning';
      case 'processing': return 'info';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a1a2e' }}>
          Commissions
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
          When a seller&apos;s number is sold, the platform takes a commission. Track total revenue, pending payouts, and paid commissions here.
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {summaryCards.map((card) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={card.label}>
            <Card sx={{ borderRadius: 3, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: `${card.color}14`,
                      color: card.color,
                    }}
                  >
                    {card.icon}
                  </Box>
                </Box>
                {summaryLoading ? (
                  <>
                    <Skeleton width={90} height={32} />
                    <Skeleton width={70} height={18} />
                  </>
                ) : (
                  <>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#1a1a2e' }}>
                      ${(card.value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                      {card.label}
                    </Typography>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Filter */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          select
          label="Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          sx={{ minWidth: 180 }}
          size="small"
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="pending">Pending</MenuItem>
          <MenuItem value="processing">Processing</MenuItem>
          <MenuItem value="paid">Paid</MenuItem>
          <MenuItem value="cancelled">Cancelled</MenuItem>
        </TextField>
        <TextField
          label="From Date"
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          size="small"
          sx={{ minWidth: 160 }}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          label="To Date"
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          size="small"
          sx={{ minWidth: 160 }}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        {(dateFrom || dateTo) && (
          <Button
            size="small"
            onClick={() => { setDateFrom(''); setDateTo(''); }}
            sx={{ textTransform: 'none', color: '#E53935', fontWeight: 600 }}
          >
            Clear Dates
          </Button>
        )}
      </Box>

      {/* Commissions Table */}
      <Card sx={{ borderRadius: 3, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8f9fb' }}>
                <TableCell sx={{ fontWeight: 600 }}>Commission ID</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Seller</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Order ID</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Amount</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Rate</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
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
              ) : commissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    No commissions found
                  </TableCell>
                </TableRow>
              ) : (
                commissions.map((c) => (
                  <TableRow key={c.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>
                      {c.id.substring(0, 12)}...
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {c.sellerName || 'N/A'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {c.sellerEmail || ''}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>
                      {c.orderId?.substring(0, 12)}...
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#84BD00' }}>
                      ${c.amount?.toFixed(2)}
                    </TableCell>
                    <TableCell>{(c.rate * 100).toFixed(1)}%</TableCell>
                    <TableCell>
                      <Chip label={c.status} size="small" color={getStatusColor(c.status) as any} />
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary' }}>
                      {new Date(c.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
}
