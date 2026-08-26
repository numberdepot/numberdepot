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
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Link from '@mui/material/Link';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { api } from '@/lib/api';
import { useSnackbar } from '@/lib/snackbar';

interface FulfillmentRow {
  orderId: string;
  orderNumber: string;
  itemIndex: number;
  buyerEmail: string;
  number: string;
  numberbarnTn: string;
  numberType: string;
  planType: string;
  price: number;
  fulfillmentStatus: string;
  paidAt: string;
  numberbarnUrl: string;
}

const statusColor: Record<string, 'warning' | 'success' | 'error' | 'default'> = {
  awaiting_fulfillment: 'warning',
  provisioned: 'success',
  failed: 'error',
};

export default function AdminFulfillmentPage() {
  const [rows, setRows] = useState<FulfillmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState('pending');
  const [working, setWorking] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const { showSnackbar } = useSnackbar();

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('state', state);
      params.set('limit', '100');
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      const res = await api.get<FulfillmentRow[]>(`/admin/fulfillment?${params}`);
      setRows(res.data || []);
    } catch (err) {
      showSnackbar(err instanceof Error ? err.message : 'Failed to load queue', 'error');
    } finally {
      setLoading(false);
    }
  }, [state, dateFrom, dateTo, showSnackbar]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const mark = async (row: FulfillmentRow, status: 'provisioned' | 'failed') => {
    const key = `${row.orderId}-${row.itemIndex}`;
    setWorking(key);
    try {
      await api.put('/admin/fulfillment', {
        orderId: row.orderId,
        itemIndex: row.itemIndex,
        status,
      });
      showSnackbar(
        status === 'provisioned' ? `${row.number} marked as delivered` : `${row.number} marked as failed`,
        status === 'provisioned' ? 'success' : 'warning'
      );
      fetchRows();
    } catch (err) {
      showSnackbar(err instanceof Error ? err.message : 'Update failed', 'error');
    } finally {
      setWorking(null);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a1a2e' }}>
          Fulfillment Queue
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
          Numbers the customer has already paid for that still need to be secured by hand.
        </Typography>
      </Box>

      <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
        NumberBarn&apos;s public API has no purchase endpoint, so these numbers cannot be bought
        automatically. Open the number on NumberBarn, complete the purchase with the company account,
        then mark it delivered here — that activates it in the buyer&apos;s dashboard and emails them.
      </Alert>

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          select
          size="small"
          label="Show"
          value={state}
          onChange={(e) => setState(e.target.value)}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="pending">Awaiting fulfillment</MenuItem>
          <MenuItem value="done">Completed &amp; failed</MenuItem>
          <MenuItem value="all">All</MenuItem>
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

      <Card sx={{ borderRadius: 3, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8f9fb' }}>
                <TableCell sx={{ fontWeight: 600 }}>Number</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Order</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Buyer</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Paid</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    Nothing in the queue.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const key = `${row.orderId}-${row.itemIndex}`;
                  const pending = row.fulfillmentStatus === 'awaiting_fulfillment';
                  return (
                    <TableRow key={key} hover>
                      <TableCell>
                        <Typography sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                          {row.number}
                        </Typography>
                        <Link
                          href={row.numberbarnUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="caption"
                          sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4 }}
                        >
                          Open on NumberBarn <OpenInNewIcon sx={{ fontSize: 12 }} />
                        </Link>
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>
                        {row.orderNumber}
                      </TableCell>
                      <TableCell sx={{ fontSize: 13 }}>{row.buyerEmail}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          ${row.price.toFixed(2)}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {new Date(row.paidAt).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={row.fulfillmentStatus.replace(/_/g, ' ')}
                          size="small"
                          color={statusColor[row.fulfillmentStatus] || 'default'}
                        />
                      </TableCell>
                      <TableCell align="right">
                        {pending && (
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              disabled={working === key}
                              onClick={() => mark(row, 'provisioned')}
                            >
                              Delivered
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              disabled={working === key}
                              onClick={() => mark(row, 'failed')}
                            >
                              Failed
                            </Button>
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
}
