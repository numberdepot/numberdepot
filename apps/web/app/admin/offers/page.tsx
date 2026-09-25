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
import Alert from '@mui/material/Alert';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import { useSnackbar } from '@/lib/snackbar';
import { timeLeftLabel } from '@/lib/utils/time-left';

interface Offer {
  id: string;
  numberId: string;
  number: string;
  listingPrice: number;
  offerAmount: number;
  counterAmount: number | null;
  buyerCounter: number | null;
  agreedAmount: number | null;
  paymentDueAt: string | null;
  paidAt: string | null;
  paidManually: boolean;
  expiredReason: string | null;
  paymentExtensionCount: number;
  buyerCounterMessage: string;
  /** The figure on the table right now, and whose it is — computed server-side. */
  liveAmount: number;
  liveFrom: 'buyer' | 'seller';
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
  // Admin can act on: new pending offers, or buyer counter-backs (pending + buyerCounter).
  // When status is 'countered', admin already countered — waiting for buyer response, no actions needed.
  const isBuyerCounter = offer.buyerCounter != null && offer.status === 'pending';
  const canAct = offer.status === 'pending';

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 2,
        p: 2,
        borderRadius: 2,
        bgcolor: isBuyerCounter ? '#fff8e1' : '#fff',
        border: '2px solid',
        borderColor: isBuyerCounter ? '#f9a825' : canAct ? '#e3e8ef' : '#f0f0f0',
        opacity: canAct ? 1 : 0.7,
        '&:hover': canAct ? { borderColor: isBuyerCounter ? '#f57f17' : '#002664', bgcolor: isBuyerCounter ? '#fff3cd' : '#fafbff' } : {},
        transition: 'all 0.15s',
      }}
    >
      {/* Buyer avatar */}
      <Avatar sx={{ bgcolor: isBuyerCounter ? '#f9a825' : canAct ? '#002664' : '#ccc', width: 36, height: 36, fontSize: 14 }}>
        {isBuyerCounter ? <SwapHorizIcon sx={{ fontSize: 18 }} /> : <PersonIcon sx={{ fontSize: 18 }} />}
      </Avatar>

      {/* Offer info */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>{offer.buyerName}</Typography>
          <Typography variant="caption" color="text.secondary">{offer.buyerEmail}</Typography>
          {isBuyerCounter ? (
            <Chip
              label="Buyer Countered"
              size="small"
              sx={{ fontSize: '0.65rem', height: 22, fontWeight: 700, bgcolor: '#f9a825', color: '#fff' }}
            />
          ) : (
            <Chip
              label={statusLabel[offer.status] || offer.status}
              size="small"
              color={statusColor(offer.status) as any}
              sx={{ fontSize: '0.65rem', height: 20 }}
            />
          )}
        </Box>

        {/* Negotiation Trail */}
        {isBuyerCounter ? (
          <Box sx={{ mb: 1, p: 1.5, borderRadius: 1.5, bgcolor: '#fff', border: '1px solid #e0e0e0' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#84BD00', flexShrink: 0 }} />
              <Typography variant="caption" color="text.secondary" sx={{ minWidth: 100 }}>Original Offer</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>${offer.offerAmount.toFixed(2)}</Typography>
            </Box>
            {offer.counterAmount != null && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75, pl: 0.25 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#1976d2', flexShrink: 0 }} />
                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 100 }}>Your Counter</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#1976d2' }}>${offer.counterAmount.toFixed(2)}</Typography>
              </Box>
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: 0.25 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#f9a825', flexShrink: 0 }} />
              <Typography variant="caption" sx={{ minWidth: 100, fontWeight: 600, color: '#e65100' }}>Buyer&apos;s Counter</Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#e65100', fontSize: '1rem' }}>${offer.buyerCounter!.toFixed(2)}</Typography>
            </Box>
          </Box>
        ) : (
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
        )}

        {offer.buyerMessage && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontStyle: 'italic' }}>
            &ldquo;{offer.buyerMessage}&rdquo;
          </Typography>
        )}
        {offer.status === 'accepted' && !offer.paidAt && (
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              mb: 0.5,
              fontWeight: 700,
              color: offer.paymentDueAt && new Date(offer.paymentDueAt) < new Date() ? '#E53935' : '#e65100',
            }}
          >
            {offer.paymentDueAt
              ? `Awaiting payment · ${timeLeftLabel(offer.paymentDueAt)}`
              : 'Awaiting payment'}
            {offer.paymentExtensionCount > 0 && ` · extended ${offer.paymentExtensionCount}×`}
          </Typography>
        )}
        {offer.paidAt && (
          <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 700, color: '#84BD00' }}>
            Paid {new Date(offer.paidAt).toLocaleDateString()}{offer.paidManually ? ' · recorded manually' : ''}
          </Typography>
        )}
        {offer.status === 'expired' && offer.expiredReason === 'payment_window' && (
          <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: '#E53935' }}>
            Expired — payment was not completed in time
          </Typography>
        )}

        {offer.buyerCounterMessage && isBuyerCounter && (
          <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: '#e65100', fontStyle: 'italic' }}>
            Buyer&apos;s note: &ldquo;{offer.buyerCounterMessage}&rdquo;
          </Typography>
        )}
        {offer.sellerResponse && !isBuyerCounter && (
          <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'info.main' }}>
            Response: &ldquo;{offer.sellerResponse}&rdquo;
          </Typography>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <AccessTimeIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
          <Typography variant="caption" color="text.secondary">
            {new Date(offer.updatedAt || offer.createdAt).toLocaleDateString()} {new Date(offer.updatedAt || offer.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Typography>
        </Box>
      </Box>

      {/* Actions */}
      {canAct ? (
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
      ) : offer.status === 'accepted' && !offer.paidAt ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, flexShrink: 0, px: 1 }}>
          <AccessTimeIcon sx={{ fontSize: 20, color: '#e65100' }} />
          <Typography variant="caption" sx={{ color: '#e65100', fontWeight: 600, textAlign: 'center', lineHeight: 1.2, mb: 0.5 }}>
            Awaiting<br />payment
          </Typography>
          <Button
            size="small"
            variant="contained"
            color="success"
            onClick={() => onAction(offer.id, 'approve-payment')}
            sx={{ minWidth: 90, fontSize: '0.7rem', py: 0.4 }}
          >
            Mark as paid
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="warning"
            onClick={() => onAction(offer.id, 'extend')}
            sx={{ minWidth: 90, fontSize: '0.7rem', py: 0.4 }}
          >
            Give more time
          </Button>
        </Box>
      ) : offer.status === 'expired' && offer.expiredReason === 'payment_window' ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, flexShrink: 0, px: 1 }}>
          <Button
            size="small"
            variant="contained"
            color="success"
            onClick={() => onAction(offer.id, 'approve-payment')}
            sx={{ minWidth: 90, fontSize: '0.7rem', py: 0.4, mb: 0.5 }}
          >
            Mark as paid
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="warning"
            onClick={() => onAction(offer.id, 'extend')}
            sx={{ minWidth: 90, fontSize: '0.7rem', py: 0.4 }}
          >
            Reopen &amp; allow payment
          </Button>
        </Box>
      ) : offer.status === 'countered' ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, flexShrink: 0, px: 1 }}>
          <AccessTimeIcon sx={{ fontSize: 20, color: '#4BA0A1' }} />
          <Typography variant="caption" sx={{ color: '#4BA0A1', fontWeight: 600, textAlign: 'center', lineHeight: 1.2 }}>
            Waiting for<br />buyer response
          </Typography>
        </Box>
      ) : null}
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
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Counter dialog state
  const [acceptDialogOffer, setAcceptDialogOffer] = useState<Offer | null>(null);
  const [extendDialogOffer, setExtendDialogOffer] = useState<Offer | null>(null);
  const [payDialogOffer, setPayDialogOffer] = useState<Offer | null>(null);
  const [payMethod, setPayMethod] = useState('bank_transfer');
  const [payReference, setPayReference] = useState('');
  const [extendHours, setExtendHours] = useState('24');
  const [counterDialogOfferId, setCounterDialogOfferId] = useState<string | null>(null);
  const [counterAmount, setCounterAmount] = useState('');
  const [counterMessage, setCounterMessage] = useState('');

  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search.trim()); setPage(0); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchOffers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page + 1));
      params.set('limit', String(limit));
      if (statusFilter) params.set('status', statusFilter);
      if (debouncedSearch) params.set('q', debouncedSearch);

      const res = await api.get<Offer[]>(`/offers/admin?${params}`);
      if (res.data) setOffers(res.data);
      if (res.pagination) setTotal(res.pagination.total);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load offers';
      showSnackbar(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, debouncedSearch, showSnackbar]);

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
      const latestAmount = offer.buyerCounter || offer.offerAmount;
      if (latestAmount > group.highestOffer) group.highestOffer = latestAmount;
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

    if (action === 'approve-payment') {
      const target = offers.find((o) => o.id === offerId);
      if (target) {
        setPayDialogOffer(target);
        setPayMethod('bank_transfer');
        setPayReference('');
        return;
      }
    }

    if (action === 'extend') {
      const target = offers.find((o) => o.id === offerId);
      if (target) {
        setExtendDialogOffer(target);
        setExtendHours('24');
        return;
      }
    }

    if (action === 'accept') {
      // Never accept blind — the admin must see the exact figure they are
      // agreeing to, since accepting is what sets the price the buyer pays.
      const target = offers.find((o) => o.id === offerId);
      if (target) {
        setAcceptDialogOffer(target);
        return;
      }
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
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="Search by number or buyer name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 300, flex: 1 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearch('')} aria-label="Clear search">
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            },
          }}
        />
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

      {/* Accept Confirmation — shows exactly what is being agreed to */}
      <Dialog open={!!acceptDialogOffer} onClose={() => !actionLoading && setAcceptDialogOffer(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Accept this offer?</DialogTitle>
        <DialogContent>
          {acceptDialogOffer && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {acceptDialogOffer.buyerName} · {acceptDialogOffer.number}
              </Typography>

              <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: '#f8f9fb', border: '1px solid #e0e0e0', mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">Original offer</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>${acceptDialogOffer.offerAmount.toFixed(2)}</Typography>
                </Box>
                {acceptDialogOffer.counterAmount != null && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">Your counter</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#1976d2' }}>${acceptDialogOffer.counterAmount.toFixed(2)}</Typography>
                  </Box>
                )}
                {acceptDialogOffer.buyerCounter != null && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">Buyer&apos;s counter</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#e65100' }}>${acceptDialogOffer.buyerCounter.toFixed(2)}</Typography>
                  </Box>
                )}
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Buyer will pay</Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#84BD00' }}>
                  ${acceptDialogOffer.liveAmount.toFixed(2)}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Other offers on this number will be declined automatically.
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAcceptDialogOffer(null)} disabled={actionLoading}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            disabled={actionLoading}
            onClick={async () => {
              if (!acceptDialogOffer) return;
              setActionLoading(true);
              try {
                await api.put(`/offers/${acceptDialogOffer.id}/accept`);
                showSnackbar(`Accepted at $${acceptDialogOffer.liveAmount.toFixed(2)}. Competing offers declined.`, 'success');
                setAcceptDialogOffer(null);
                fetchOffers();
              } catch (err) {
                showSnackbar(err instanceof Error ? err.message : 'Action failed', 'error');
              } finally {
                setActionLoading(false);
              }
            }}
          >
            {actionLoading ? 'Accepting…' : `Accept $${acceptDialogOffer?.liveAmount.toFixed(2) ?? ''}`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Record a payment taken outside the gateway */}
      <Dialog open={!!payDialogOffer} onClose={() => !actionLoading && setPayDialogOffer(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Record payment received</DialogTitle>
        <DialogContent>
          {payDialogOffer && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {payDialogOffer.buyerName} · {payDialogOffer.number}
              </Typography>
              <Alert severity="warning" sx={{ mb: 2 }}>
                This does not charge anyone. Use it only when the money has already
                reached you outside the site. It transfers the number to the buyer
                and completes the sale immediately.
              </Alert>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Amount agreed</Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#84BD00' }}>
                  ${(payDialogOffer.agreedAmount ?? payDialogOffer.liveAmount).toFixed(2)}
                </Typography>
              </Box>
              <TextField
                select fullWidth label="How was it paid?" value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)} sx={{ mb: 2 }}
              >
                <MenuItem value="bank_transfer">Bank transfer</MenuItem>
                <MenuItem value="cash">Cash</MenuItem>
                <MenuItem value="cheque">Cheque</MenuItem>
                <MenuItem value="card_in_person">Card in person</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </TextField>
              <TextField
                fullWidth required label="Reference" value={payReference}
                onChange={(e) => setPayReference(e.target.value)}
                placeholder="Transfer ID, cheque no., receipt no."
                helperText="Required — there is no gateway transaction to trace this to later."
                slotProps={{ htmlInput: { maxLength: 200 } }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPayDialogOffer(null)} disabled={actionLoading}>Cancel</Button>
          <Button
            variant="contained" color="success"
            disabled={actionLoading || !payReference.trim()}
            onClick={async () => {
              if (!payDialogOffer) return;
              setActionLoading(true);
              try {
                const res = await api.post<{ message: string }>(
                  `/offers/${payDialogOffer.id}/approve-payment`,
                  { method: payMethod, reference: payReference.trim() }
                );
                showSnackbar(res.data?.message || 'Payment recorded', 'success');
                setPayDialogOffer(null);
                fetchOffers();
              } catch (err) {
                showSnackbar(err instanceof Error ? err.message : 'Could not record the payment', 'error');
              } finally {
                setActionLoading(false);
              }
            }}
          >
            {actionLoading ? 'Recording…' : 'Confirm payment received'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Give the buyer more time, or reopen a lapsed offer */}
      <Dialog open={!!extendDialogOffer} onClose={() => !actionLoading && setExtendDialogOffer(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {extendDialogOffer?.status === 'expired' ? 'Reopen this offer?' : 'Give more time to pay'}
        </DialogTitle>
        <DialogContent>
          {extendDialogOffer && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {extendDialogOffer.buyerName} · {extendDialogOffer.number} · ${(extendDialogOffer.agreedAmount ?? extendDialogOffer.liveAmount).toFixed(2)}
              </Typography>
              {extendDialogOffer.status === 'expired' && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  This offer expired because payment was not completed. Reopening it lets the buyer pay again — only possible while the number is still unsold.
                </Alert>
              )}
              <TextField
                autoFocus
                fullWidth
                type="number"
                label="Hours to allow"
                value={extendHours}
                onChange={(e) => setExtendHours(e.target.value)}
                helperText="Counted from now. The buyer is notified by email."
                slotProps={{ htmlInput: { min: 1, max: 720 } }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExtendDialogOffer(null)} disabled={actionLoading}>Cancel</Button>
          <Button
            variant="contained"
            color="warning"
            disabled={actionLoading || !extendHours}
            onClick={async () => {
              if (!extendDialogOffer) return;
              setActionLoading(true);
              try {
                const res = await api.put<{ message: string }>(
                  `/offers/${extendDialogOffer.id}/extend-payment`,
                  { hours: parseFloat(extendHours) }
                );
                showSnackbar(res.data?.message || 'Buyer notified', 'success');
                setExtendDialogOffer(null);
                fetchOffers();
              } catch (err) {
                showSnackbar(err instanceof Error ? err.message : 'Action failed', 'error');
              } finally {
                setActionLoading(false);
              }
            }}
          >
            {actionLoading ? 'Saving…' : extendDialogOffer?.status === 'expired' ? 'Reopen' : 'Extend'}
          </Button>
        </DialogActions>
      </Dialog>

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
