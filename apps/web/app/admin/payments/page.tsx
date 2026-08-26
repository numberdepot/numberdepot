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
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import SearchIcon from '@mui/icons-material/Search';
import InputAdornment from '@mui/material/InputAdornment';
import { api } from '@/lib/api';
import { useSnackbar } from '@/lib/snackbar';

interface PaymentItem {
  number: string;
  numberType: string;
  source: string;
  planType: string;
  price: number;
}

interface Payment {
  id: string;
  orderId: string;
  orderNumber: string;
  userName: string;
  userEmail: string;
  amount: number;
  status: string;
  environment: string;
  transactionId: string | null;
  authCode: string | null;
  message: string;
  avsResultCode: string | null;
  cvvResultCode: string | null;
  cardLast4: string | null;
  cardType: string | null;
  billTo: Record<string, string> | null;
  items: PaymentItem[];
  refundedAmount: number;
  refundedAt: string | null;
  voidedAt: string | null;
  createdAt: string;
}

interface Summary {
  grossRevenue: number;
  netRevenue: number;
  refundedAmount: number;
  approvedCount: number;
  totalAttempts: number;
}

const statusColor: Record<string, 'success' | 'error' | 'warning' | 'default' | 'info'> = {
  approved: 'success',
  declined: 'error',
  error: 'error',
  held: 'warning',
  refunded: 'default',
  voided: 'default',
};

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card sx={{ p: 2.5, borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', flex: '1 1 200px' }}>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 800, color: '#1a1a2e', mt: 0.5 }}>
        {value}
      </Typography>
      {hint && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {hint}
        </Typography>
      )}
    </Card>
  );
}

function PaymentRow({ payment, onReversed }: { payment: Payment; onReversed: () => void }) {
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<'refund' | 'void' | null>(null);
  const [working, setWorking] = useState(false);
  const { showSnackbar } = useSnackbar();

  const reversible = payment.status === 'approved' || payment.status === 'held';

  const handleReverse = async () => {
    if (!dialog) return;
    setWorking(true);
    try {
      await api.post(`/payments/admin/${payment.id}/refund`, { action: dialog });
      showSnackbar(dialog === 'void' ? 'Transaction voided' : 'Refund issued', 'success');
      setDialog(null);
      onReversed();
    } catch (err) {
      showSnackbar(err instanceof Error ? err.message : 'Action failed', 'error');
    } finally {
      setWorking(false);
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
          {payment.orderNumber}
        </TableCell>
        <TableCell>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {payment.userName || '—'}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {payment.userEmail}
          </Typography>
        </TableCell>
        <TableCell>
          {payment.items.slice(0, 2).map((i) => (
            <Typography key={i.number} variant="body2" sx={{ fontFamily: 'monospace', fontSize: 13 }}>
              {i.number}
            </Typography>
          ))}
          {payment.items.length > 2 && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              +{payment.items.length - 2} more
            </Typography>
          )}
        </TableCell>
        <TableCell sx={{ fontWeight: 700 }}>
          {money(payment.amount)}
          {payment.refundedAmount > 0 && (
            <Typography variant="caption" sx={{ display: 'block', color: '#E53935' }}>
              −{money(payment.refundedAmount)} refunded
            </Typography>
          )}
        </TableCell>
        <TableCell>
          <Chip label={payment.status} size="small" color={statusColor[payment.status] || 'default'} />
          {payment.environment === 'sandbox' && (
            <Chip label="test" size="small" variant="outlined" sx={{ ml: 0.5, fontSize: 10 }} />
          )}
        </TableCell>
        <TableCell sx={{ color: 'text.secondary', fontSize: 13 }}>
          {payment.cardType ? `${payment.cardType} ••${payment.cardLast4}` : '—'}
        </TableCell>
        <TableCell sx={{ color: 'text.secondary', fontSize: 13 }}>
          {new Date(payment.createdAt).toLocaleString()}
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ py: 2, px: 3, bgcolor: '#f8f9fb', borderRadius: 2, my: 1 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2, mb: 2 }}>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>Transaction ID</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{payment.transactionId || '—'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>Auth Code</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{payment.authCode || '—'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>AVS / CVV</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {payment.avsResultCode || '—'} / {payment.cvvResultCode || '—'}
                  </Typography>
                </Box>
                <Box sx={{ gridColumn: { md: 'span 3' } }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>Gateway Message</Typography>
                  <Typography variant="body2">{payment.message}</Typography>
                </Box>
                {payment.billTo && (
                  <Box sx={{ gridColumn: { md: 'span 3' } }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Billing Address</Typography>
                    <Typography variant="body2">
                      {[
                        [payment.billTo.firstName, payment.billTo.lastName].filter(Boolean).join(' '),
                        payment.billTo.address,
                        [payment.billTo.city, payment.billTo.state, payment.billTo.zip].filter(Boolean).join(', '),
                        payment.billTo.country,
                      ].filter(Boolean).join(' · ')}
                    </Typography>
                  </Box>
                )}
              </Box>

              <Divider sx={{ my: 1.5 }} />

              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Numbers purchased
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Number</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Source</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Plan</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Price</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {payment.items.map((i) => (
                    <TableRow key={i.number}>
                      <TableCell sx={{ fontFamily: 'monospace' }}>{i.number}</TableCell>
                      <TableCell>{i.numberType}</TableCell>
                      <TableCell>
                        <Chip
                          label={i.source === 'numberbarn' ? 'NumberBarn' : 'Inventory'}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: 11 }}
                        />
                      </TableCell>
                      <TableCell>{i.planType}</TableCell>
                      <TableCell align="right">{money(i.price)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {reversible && (
                <Box sx={{ display: 'flex', gap: 1.5, mt: 2 }}>
                  <Button size="small" variant="outlined" color="warning" onClick={() => setDialog('void')}>
                    Void (unsettled)
                  </Button>
                  <Button size="small" variant="outlined" color="error" onClick={() => setDialog('refund')}>
                    Refund {money(payment.amount - payment.refundedAmount)}
                  </Button>
                </Box>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>

      <Dialog open={dialog !== null} onClose={() => !working && setDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{dialog === 'void' ? 'Void transaction' : 'Refund payment'}</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            {dialog === 'void'
              ? 'Voiding cancels the charge before it settles. It only works on the same day the payment was taken.'
              : 'Refunding returns the money to the customer. Use this once the transaction has settled.'}
          </Alert>
          <Typography variant="body2">
            Order <strong>{payment.orderNumber}</strong> — {money(payment.amount)} from {payment.userEmail}.
          </Typography>
          <Typography variant="body2" sx={{ mt: 1.5, color: 'text.secondary' }}>
            The numbers on this order will go back on sale and be removed from the buyer&apos;s account.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)} disabled={working}>Cancel</Button>
          <Button onClick={handleReverse} variant="contained" color="error" disabled={working}>
            {working ? 'Working…' : dialog === 'void' ? 'Void' : 'Refund'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(0); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page + 1));
      params.set('limit', String(limit));
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (debounced) params.set('q', debounced);

      const res = await api.get<Payment[]>(`/payments/admin?${params}`);
      setPayments(res.data || []);
      if (res.pagination) setTotal(res.pagination.total);
      const withSummary = res as unknown as { summary?: Summary };
      if (withSummary.summary) setSummary(withSummary.summary);
    } catch (err) {
      showSnackbar(err instanceof Error ? err.message : 'Failed to load payments', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, debounced, showSnackbar]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a1a2e' }}>
          Payments
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
          Every Authorize.Net transaction — who paid, how much, and for which numbers. Declined attempts are kept too, so you can see failed checkouts.
        </Typography>
      </Box>

      {summary && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <StatCard label="Gross Revenue" value={money(summary.grossRevenue)} hint={`${summary.approvedCount} approved`} />
          <StatCard label="Refunded" value={money(summary.refundedAmount)} />
          <StatCard label="Net Revenue" value={money(summary.netRevenue)} />
          <StatCard label="Total Attempts" value={String(summary.totalAttempts)} hint="incl. declines" />
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          select
          label="Status"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          sx={{ minWidth: 180 }}
          size="small"
        >
          <MenuItem value="all">All Statuses</MenuItem>
          <MenuItem value="approved">Approved</MenuItem>
          <MenuItem value="declined">Declined</MenuItem>
          <MenuItem value="held">Held for Review</MenuItem>
          <MenuItem value="error">Error</MenuItem>
          <MenuItem value="refunded">Refunded</MenuItem>
          <MenuItem value="voided">Voided</MenuItem>
        </TextField>
        <TextField
          size="small"
          placeholder="Email, name, order, number, transaction ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 320, flex: 1 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>

      <Card sx={{ borderRadius: 3, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8f9fb' }}>
                <TableCell sx={{ width: 48 }} />
                <TableCell sx={{ fontWeight: 600 }}>Order</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Customer</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Numbers</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Amount</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Card</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              ) : payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    No payments yet.
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((p) => (
                  <PaymentRow key={p.id} payment={p} onReversed={fetchPayments} />
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
    </Box>
  );
}
