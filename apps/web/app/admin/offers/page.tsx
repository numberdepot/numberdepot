'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Divider from '@mui/material/Divider';
import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import PhoneIcon from '@mui/icons-material/Phone';
import PersonIcon from '@mui/icons-material/Person';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import { api } from '@/lib/api';
import { useSnackbar } from '@/lib/snackbar';

interface Offer {
  id: string;
  numberId: string;
  number: string;
  listingPrice: number;
  offerAmount: number;
  counterAmount: number | null;
  buyerName: string;
  buyerEmail: string;
  sellerName: string;
  sellerEmail: string;
  buyerMessage: string;
  sellerResponse: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface NumberGroup {
  numberId: string;
  number: string;
  offers: Offer[];
  pendingCount: number;
  highestOffer: number;
  latestDate: string;
}

const statusColor = (s: string) => {
  switch (s) {
    case 'accepted': return 'success';
    case 'pending': return 'warning';
    case 'countered': return 'info';
    case 'declined': case 'expired': case 'cancelled': return 'error';
    default: return 'default';
  }
};

const statusLabel: Record<string, string> = {
  pending: 'Pending',
  countered: 'Countered',
  accepted: 'Accepted',
  declined: 'Declined',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

function OfferCard({ offer, onAction }: { offer: Offer; onAction: (id: string, action: string) => void }) {
  const canAct = offer.status === 'pending' || offer.status === 'countered';

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 2,
        p: 2,
        borderRadius: 2,
        bgcolor: '#fff',
        border: '1px solid',
        borderColor: canAct ? '#e3e8ef' : '#f0f0f0',
        opacity: canAct ? 1 : 0.7,
        '&:hover': canAct ? { borderColor: '#002664', bgcolor: '#fafbff' } : {},
        transition: 'all 0.15s',
      }}
    >
      {/* Buyer avatar */}
      <Avatar sx={{ bgcolor: canAct ? '#002664' : '#ccc', width: 36, height: 36, fontSize: 14 }}>
        <PersonIcon sx={{ fontSize: 18 }} />
      </Avatar>

      {/* Offer info */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>{offer.buyerName}</Typography>
          <Typography variant="caption" color="text.secondary">{offer.buyerEmail}</Typography>
          <Chip
            label={statusLabel[offer.status] || offer.status}
            size="small"
            color={statusColor(offer.status) as any}
            sx={{ fontSize: '0.65rem', height: 20 }}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 0.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#84BD00', fontSize: '1rem' }}>
            ${offer.offerAmount.toFixed(2)}
          </Typography>
          {offer.counterAmount != null && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <SwapHorizIcon sx={{ fontSize: 14, color: 'info.main' }} />
              <Typography variant="body2" sx={{ fontWeight: 700, color: 'info.main' }}>
                Counter: ${offer.counterAmount.toFixed(2)}
              </Typography>
            </Box>
          )}
        </Box>

        {offer.buyerMessage && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontStyle: 'italic' }}>
            &ldquo;{offer.buyerMessage}&rdquo;
          </Typography>
        )}
        {offer.sellerResponse && (
          <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'info.main' }}>
            Response: &ldquo;{offer.sellerResponse}&rdquo;
          </Typography>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <AccessTimeIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
          <Typography variant="caption" color="text.secondary">
            {new Date(offer.createdAt).toLocaleDateString()} {new Date(offer.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Typography>
        </Box>
      </Box>

      {/* Actions */}
      {canAct && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flexShrink: 0 }}>
          <Button
            size="small"
            variant="contained"
            color="success"
            startIcon={<CheckCircleIcon sx={{ fontSize: 14 }} />}
            onClick={() => onAction(offer.id, 'accept')}
            sx={{ minWidth: 90, fontSize: '0.7rem', py: 0.4 }}
          >
            Accept
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="info"
            startIcon={<SwapHorizIcon sx={{ fontSize: 14 }} />}
            onClick={() => onAction(offer.id, 'counter')}
            sx={{ minWidth: 90, fontSize: '0.7rem', py: 0.4 }}
          >
            Counter
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="error"
            startIcon={<CancelIcon sx={{ fontSize: 14 }} />}
            onClick={() => onAction(offer.id, 'decline')}
            sx={{ minWidth: 90, fontSize: '0.7rem', py: 0.4 }}
          >
            Decline
          </Button>
        </Box>
      )}
    </Box>
  );
}

function NumberGroupCard({ group, onAction }: { group: NumberGroup; onAction: (id: string, action: string) => void }) {
  const [open, setOpen] = useState(group.pendingCount > 0);

  return (
    <Card sx={{ borderRadius: 3, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'visible' }}>
      {/* Group header — click to expand */}
      <Box
        onClick={() => setOpen(!open)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          p: 2,
          px: 3,
          cursor: 'pointer',
          '&:hover': { bgcolor: '#f8f9fb' },
          transition: 'background 0.15s',
        }}
      >
        <IconButton size="small" sx={{ p: 0 }}>
          {open ? <KeyboardArrowDownIcon /> : <KeyboardArrowRightIcon />}
        </IconButton>

        <Badge
          badgeContent={group.offers.length}
          color={group.pendingCount > 0 ? 'warning' : 'default'}
          sx={{ '& .MuiBadge-badge': { fontWeight: 700, fontSize: '0.7rem' } }}
        >
          <Avatar sx={{ bgcolor: group.pendingCount > 0 ? '#002664' : '#ccc', width: 40, height: 40 }}>
            <PhoneIcon sx={{ fontSize: 20 }} />
          </Avatar>
        </Badge>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, fontFamily: 'monospace', color: '#002664' }}>
            {group.number}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="caption" color="text.secondary">
              {group.offers.length} offer{group.offers.length !== 1 ? 's' : ''}
            </Typography>
            {group.pendingCount > 0 && (
              <Chip
                label={`${group.pendingCount} awaiting review`}
                size="small"
                color="warning"
                sx={{ fontSize: '0.65rem', height: 20, fontWeight: 600 }}
              />
            )}
          </Box>
        </Box>

        <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            Highest Offer
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#84BD00' }}>
            ${group.highestOffer.toFixed(2)}
          </Typography>
        </Box>
      </Box>

      {/* Expanded: individual offers */}
      <Collapse in={open} timeout="auto" unmountOnExit>
        <Divider />
        <Box sx={{ p: 2, px: 3, display: 'flex', flexDirection: 'column', gap: 1.5, bgcolor: '#f8f9fb' }}>
          {group.offers.map((offer) => (
            <OfferCard key={offer.id} offer={offer} onAction={onAction} />
          ))}
        </Box>
      </Collapse>
    </Card>
  );
}

export default function AdminOffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(100);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Counter dialog state
  const [counterDialogOfferId, setCounterDialogOfferId] = useState<string | null>(null);
  const [counterAmount, setCounterAmount] = useState('');
  const [counterMessage, setCounterMessage] = useState('');

  const { showSnackbar } = useSnackbar();

  const fetchOffers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page + 1));
      params.set('limit', String(limit));
      if (statusFilter) params.set('status', statusFilter);

      const res = await api.get<Offer[]>(`/offers/admin?${params}`);
      if (res.data) setOffers(res.data);
      if (res.pagination) setTotal(res.pagination.total);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load offers';
      showSnackbar(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, showSnackbar]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  // Group offers by numberId
  const groups: NumberGroup[] = useMemo(() => {
    const map = new Map<string, NumberGroup>();
    for (const offer of offers) {
      let group = map.get(offer.numberId);
      if (!group) {
        group = {
          numberId: offer.numberId,
          number: offer.number,
          offers: [],
          pendingCount: 0,
          highestOffer: 0,
          latestDate: offer.createdAt,
        };
        map.set(offer.numberId, group);
      }
      group.offers.push(offer);
      if (offer.status === 'pending' || offer.status === 'countered') group.pendingCount++;
      if (offer.offerAmount > group.highestOffer) group.highestOffer = offer.offerAmount;
      if (offer.createdAt > group.latestDate) group.latestDate = offer.createdAt;
    }
    // Sort: groups with pending offers first, then by latest date
    return [...map.values()].sort((a, b) => {
      if (a.pendingCount > 0 && b.pendingCount === 0) return -1;
      if (a.pendingCount === 0 && b.pendingCount > 0) return 1;
      return b.latestDate.localeCompare(a.latestDate);
    });
  }, [offers]);

  const handleAction = async (offerId: string, action: string) => {
    if (action === 'counter') {
      setCounterDialogOfferId(offerId);
      setCounterAmount('');
      setCounterMessage('');
      return;
    }

    setActionLoading(true);
    try {
      if (action === 'accept') {
        await api.put(`/offers/${offerId}/accept`);
        showSnackbar('Offer accepted. Competing offers have been declined.', 'success');
      } else if (action === 'decline') {
        await api.put(`/offers/${offerId}/decline`);
        showSnackbar('Offer declined', 'success');
      }
      fetchOffers();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Action failed';
      showSnackbar(msg, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCounterSubmit = async () => {
    if (!counterDialogOfferId || !counterAmount) return;
    setActionLoading(true);
    try {
      await api.put(`/offers/${counterDialogOfferId}/counter`, {
        counterAmount: parseFloat(counterAmount),
        sellerResponse: counterMessage || '',
      });
      showSnackbar('Counter offer sent', 'success');
      setCounterDialogOfferId(null);
      fetchOffers();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send counter offer';
      showSnackbar(msg, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const totalPending = offers.filter((o) => o.status === 'pending' || o.status === 'countered').length;

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 0.5 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a1a2e' }}>
            Offers Management
          </Typography>
          {totalPending > 0 && (
            <Chip
              icon={<LocalOfferIcon sx={{ fontSize: 14 }} />}
              label={`${totalPending} awaiting review`}
              color="warning"
              size="small"
              sx={{ fontWeight: 700 }}
            />
          )}
        </Box>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Offers grouped by number. Expand a number to see all offers and take action.
          {total > 0 && !loading && ` ${total} total offer${total !== 1 ? 's' : ''} across ${groups.length} number${groups.length !== 1 ? 's' : ''}.`}
        </Typography>
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
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
          <MenuItem value="countered">Countered</MenuItem>
          <MenuItem value="accepted">Accepted</MenuItem>
          <MenuItem value="declined">Declined</MenuItem>
          <MenuItem value="expired">Expired</MenuItem>
          <MenuItem value="cancelled">Cancelled</MenuItem>
        </TextField>
      </Box>

      {/* Grouped list */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={32} sx={{ color: '#002664' }} />
        </Box>
      ) : groups.length === 0 ? (
        <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <CardContent sx={{ py: 6, textAlign: 'center' }}>
            <LocalOfferIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">No offers found</Typography>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {groups.map((group) => (
            <NumberGroupCard key={group.numberId} group={group} onAction={handleAction} />
          ))}
        </Box>
      )}

      {/* Counter Offer Dialog */}
      <Dialog open={!!counterDialogOfferId} onClose={() => setCounterDialogOfferId(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Send Counter Offer</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Counter Amount"
            type="number"
            value={counterAmount}
            onChange={(e) => setCounterAmount(e.target.value)}
            slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            fullWidth
            label="Message to Buyer (optional)"
            multiline
            rows={3}
            value={counterMessage}
            onChange={(e) => setCounterMessage(e.target.value)}
            placeholder="Explain your counter offer..."
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCounterDialogOfferId(null)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCounterSubmit}
            disabled={actionLoading || !counterAmount}
          >
            {actionLoading ? 'Sending...' : 'Send Counter Offer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
