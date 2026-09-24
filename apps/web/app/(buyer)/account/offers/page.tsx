'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import PaymentIcon from '@mui/icons-material/Payment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { api } from '@/lib/api';
import { useSnackbar } from '@/lib/snackbar';
import { timeLeftLabel } from '@/lib/utils/time-left';

/** "3h 12m left to pay", turning red inside the last two hours. */
function PayDeadline({ dueAt }: { dueAt?: string | null }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!dueAt) return null;
  const msLeft = new Date(dueAt).getTime() - Date.now();
  const overdue = msLeft <= 0;
  const urgent = !overdue && msLeft < 2 * 60 * 60 * 1000;

  return (
    <Typography
      variant="caption"
      sx={{
        display: 'block',
        fontWeight: 700,
        color: overdue ? '#E53935' : urgent ? '#E65100' : 'text.secondary',
      }}
    >
      {overdue ? 'Payment overdue' : `${timeLeftLabel(dueAt)} to pay`}
    </Typography>
  );
}

interface Offer {
  id: string;
  amount: number;
  status: string;
  buyerMessage?: string;
  counterAmount?: number;
  sellerResponse?: string;
  paymentDueAt?: string | null;
  paidAt?: string | null;
  expiredReason?: string | null;
  createdAt: string;
  updatedAt: string;
  phoneNumber?: {
    formatted: string;
    numberType: string;
  };
  listing?: {
    salePrice?: number;
    licensePrice?: number;
  };
  seller?: {
    firstName?: string;
    companyName?: string;
  };
}

const statusColors: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#E5393520', text: '#C62828' },
  accepted: { bg: '#84BD0020', text: '#6B9A00' },
  declined: { bg: '#E74C3C20', text: '#E74C3C' },
  countered: { bg: '#4BA0A120', text: '#4BA0A1' },
  cancelled: { bg: '#E0E6ED', text: '#535E66' },
  expired: { bg: '#E0E6ED', text: '#535E66' },
};

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function BuyerOffersPage() {
  const router = useRouter();
  const { showSnackbar } = useSnackbar();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelDialogOffer, setCancelDialogOffer] = useState<Offer | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [detailOffer, setDetailOffer] = useState<Offer | null>(null);
  const [payingOffer, setPayingOffer] = useState<string | null>(null);
  const [acceptingOffer, setAcceptingOffer] = useState<string | null>(null);
  const [counterDialogOffer, setCounterDialogOffer] = useState<Offer | null>(null);
  const [counterAmount, setCounterAmount] = useState('');
  const [counterMessage, setCounterMessage] = useState('');
  const [submittingCounter, setSubmittingCounter] = useState(false);

  useEffect(() => {
    api.get<Offer[]>('/offers/sent')
      .then((res) => setOffers(res.data || []))
      .catch(() => showSnackbar('Failed to load offers', 'error'))
      .finally(() => setLoading(false));
  }, [showSnackbar]);

  const handleCancel = async () => {
    if (!cancelDialogOffer) return;
    setCancelling(true);
    try {
      await api.put(`/offers/${cancelDialogOffer.id}/cancel`);
      setOffers((prev) =>
        prev.map((o) => (o.id === cancelDialogOffer.id ? { ...o, status: 'cancelled' } : o))
      );
      showSnackbar('Offer cancelled', 'success');
      setCancelDialogOffer(null);
    } catch {
      showSnackbar('Failed to cancel offer', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const handlePayNow = async (offer: Offer) => {
    setPayingOffer(offer.id);
    try {
      const res = await api.post<{ id: string }>(`/offers/${offer.id}/checkout`);
      if (res.data?.id) {
        router.push(`/checkout?orderId=${res.data.id}&offerId=${offer.id}`);
      } else {
        showSnackbar('Failed to create order', 'error');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start checkout';
      showSnackbar(msg, 'error');
    } finally {
      setPayingOffer(null);
    }
  };

  const handleAcceptCounter = async (offer: Offer) => {
    setAcceptingOffer(offer.id);
    try {
      await api.put(`/offers/${offer.id}/accept`);
      setOffers((prev) =>
        prev.map((o) => (o.id === offer.id ? { ...o, status: 'accepted' } : o))
      );
      showSnackbar('Counter offer accepted! You can now pay for the number.', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to accept counter';
      showSnackbar(msg, 'error');
    } finally {
      setAcceptingOffer(null);
    }
  };

  const handleCounterBack = async () => {
    if (!counterDialogOffer) return;
    const amount = parseFloat(counterAmount);
    if (isNaN(amount) || amount <= 0) {
      showSnackbar('Please enter a valid amount', 'error');
      return;
    }
    setSubmittingCounter(true);
    try {
      await api.put(`/offers/${counterDialogOffer.id}/counter`, {
        counterAmount: amount,
        sellerResponse: counterMessage || '',
      });
      setOffers((prev) =>
        prev.map((o) => (o.id === counterDialogOffer.id ? { ...o, status: 'pending', amount } : o))
      );
      showSnackbar('Your counter offer has been sent!', 'success');
      setCounterDialogOffer(null);
      setCounterAmount('');
      setCounterMessage('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to submit counter';
      showSnackbar(msg, 'error');
    } finally {
      setSubmittingCounter(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
        My Offers
      </Typography>

      {offers.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <LocalOfferIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" sx={{ mb: 1 }}>
              No offers yet
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              When you make offers on phone numbers, they will appear here.
            </Typography>
            <Button component={Link} href="/search" variant="contained" color="secondary">
              Browse Numbers
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop Table */}
          <Card sx={{ display: { xs: 'none', md: 'block' } }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'background.paper' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Number</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>List Price</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Your Offer</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Counter</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {offers.map((offer) => {
                    const sc = statusColors[offer.status] || statusColors.expired;
                    return (
                      <TableRow key={offer.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                            {offer.phoneNumber?.formatted || '--'}
                          </Typography>
                          {offer.seller && (
                            <Typography variant="caption" color="text.secondary">
                              {offer.seller.companyName || offer.seller.firstName || 'Seller'}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary' }}>
                          {offer.listing?.salePrice
                            ? formatCurrency(offer.listing.salePrice)
                            : offer.listing?.licensePrice
                              ? `${formatCurrency(offer.listing.licensePrice)}/mo`
                              : '--'}
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontWeight: 700, color: '#002664' }}>
                            {formatCurrency(offer.amount)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {offer.counterAmount ? (
                            <Typography sx={{ fontWeight: 700, color: '#4BA0A1' }}>
                              {formatCurrency(offer.counterAmount)}
                            </Typography>
                          ) : (
                            <Typography variant="body2" color="text.disabled">--</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={offer.status}
                            size="small"
                            sx={{
                              bgcolor: sc.bg,
                              color: sc.text,
                              fontWeight: 600,
                              textTransform: 'capitalize',
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {formatDate(offer.createdAt)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {offer.status === 'accepted' && (
                              <Button
                                size="small"
                                variant="contained"
                                color="secondary"
                                startIcon={<PaymentIcon sx={{ fontSize: 14 }} />}
                                onClick={() => handlePayNow(offer)}
                                disabled={payingOffer === offer.id}
                              >
                                {payingOffer === offer.id ? 'Loading...' : 'Pay Now'}
                              </Button>
                            )}
                            {offer.status === 'accepted' && <PayDeadline dueAt={offer.paymentDueAt} />}
                            {offer.status === 'countered' && (
                              <>
                                <Button
                                  size="small"
                                  variant="contained"
                                  startIcon={<CheckCircleIcon sx={{ fontSize: 14 }} />}
                                  onClick={() => handleAcceptCounter(offer)}
                                  disabled={acceptingOffer === offer.id}
                                  sx={{ bgcolor: '#84BD00', '&:hover': { bgcolor: '#6B9A00' } }}
                                >
                                  {acceptingOffer === offer.id ? 'Accepting...' : 'Accept'}
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  sx={{ borderColor: '#4BA0A1', color: '#4BA0A1' }}
                                  onClick={() => {
                                    setCounterDialogOffer(offer);
                                    setCounterAmount('');
                                    setCounterMessage('');
                                  }}
                                >
                                  Counter
                                </Button>
                              </>
                            )}
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => setDetailOffer(offer)}
                            >
                              Details
                            </Button>
                            {(offer.status === 'pending' || offer.status === 'countered') && (
                              <Button
                                size="small"
                                color="error"
                                onClick={() => setCancelDialogOffer(offer)}
                              >
                                Cancel
                              </Button>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>

          {/* Mobile Cards */}
          <Box sx={{ display: { xs: 'block', md: 'none' } }}>
            {offers.map((offer) => {
              const sc = statusColors[offer.status] || statusColors.expired;
              return (
                <Card key={offer.id} sx={{ mb: 2 }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                        {offer.phoneNumber?.formatted || '--'}
                      </Typography>
                      <Chip
                        label={offer.status}
                        size="small"
                        sx={{
                          bgcolor: sc.bg,
                          color: sc.text,
                          fontWeight: 600,
                          fontSize: '0.7rem',
                          textTransform: 'capitalize',
                        }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">Your Offer</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {formatCurrency(offer.amount)}
                      </Typography>
                    </Box>
                    {offer.counterAmount && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">Counter</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#4BA0A1' }}>
                          {formatCurrency(offer.counterAmount)}
                        </Typography>
                      </Box>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(offer.createdAt)}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
                      {offer.status === 'accepted' && (
                        <Button
                          size="small"
                          variant="contained"
                          color="secondary"
                          fullWidth
                          startIcon={<PaymentIcon sx={{ fontSize: 14 }} />}
                          onClick={() => handlePayNow(offer)}
                          disabled={payingOffer === offer.id}
                        >
                          {payingOffer === offer.id ? 'Loading...' : 'Pay Now'}
                        </Button>
                      )}
                      {offer.status === 'countered' && (
                        <>
                          <Button
                            size="small"
                            variant="contained"
                            fullWidth
                            startIcon={<CheckCircleIcon sx={{ fontSize: 14 }} />}
                            onClick={() => handleAcceptCounter(offer)}
                            disabled={acceptingOffer === offer.id}
                            sx={{ bgcolor: '#84BD00', '&:hover': { bgcolor: '#6B9A00' } }}
                          >
                            {acceptingOffer === offer.id ? 'Accepting...' : 'Accept Counter'}
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            fullWidth
                            sx={{ borderColor: '#4BA0A1', color: '#4BA0A1' }}
                            onClick={() => {
                              setCounterDialogOffer(offer);
                              setCounterAmount('');
                              setCounterMessage('');
                            }}
                          >
                            Counter Back
                          </Button>
                        </>
                      )}
                      <Button size="small" variant="outlined" fullWidth onClick={() => setDetailOffer(offer)}>
                        Details
                      </Button>
                      {(offer.status === 'pending' || offer.status === 'countered') && (
                        <Button size="small" color="error" variant="outlined" fullWidth onClick={() => setCancelDialogOffer(offer)}>
                          Cancel
                        </Button>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        </>
      )}

      {/* Offer Detail Dialog */}
      <Dialog open={!!detailOffer} onClose={() => setDetailOffer(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Offer Details</DialogTitle>
        {detailOffer && (
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Number</Typography>
                <Typography variant="body1" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                  {detailOffer.phoneNumber?.formatted || '--'}
                </Typography>
              </Box>
              <Divider />
              <Box sx={{ display: 'flex', gap: 4 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Your Offer</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700 }}>
                    {formatCurrency(detailOffer.amount)}
                  </Typography>
                </Box>
                {detailOffer.counterAmount && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Counter Offer</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 700, color: '#4BA0A1' }}>
                      {formatCurrency(detailOffer.counterAmount)}
                    </Typography>
                  </Box>
                )}
              </Box>
              {detailOffer.buyerMessage && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Your Message</Typography>
                    <Typography variant="body2">{detailOffer.buyerMessage}</Typography>
                  </Box>
                </>
              )}
              {detailOffer.sellerResponse && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Seller Response</Typography>
                  <Typography variant="body2">{detailOffer.sellerResponse}</Typography>
                </Box>
              )}
              <Divider />
              <Box sx={{ display: 'flex', gap: 4 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Submitted</Typography>
                  <Typography variant="body2">{formatDate(detailOffer.createdAt)}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Last Updated</Typography>
                  <Typography variant="body2">{formatDate(detailOffer.updatedAt)}</Typography>
                </Box>
              </Box>
            </Box>
          </DialogContent>
        )}
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {detailOffer?.status === 'countered' && (
            <>
              <Button
                variant="contained"
                startIcon={<CheckCircleIcon sx={{ fontSize: 14 }} />}
                onClick={() => {
                  setDetailOffer(null);
                  handleAcceptCounter(detailOffer);
                }}
                sx={{ bgcolor: '#84BD00', '&:hover': { bgcolor: '#6B9A00' } }}
              >
                Accept Counter
              </Button>
              <Button
                variant="outlined"
                sx={{ borderColor: '#4BA0A1', color: '#4BA0A1' }}
                onClick={() => {
                  setDetailOffer(null);
                  setCounterDialogOffer(detailOffer);
                  setCounterAmount('');
                  setCounterMessage('');
                }}
              >
                Counter Back
              </Button>
            </>
          )}
          <Button onClick={() => setDetailOffer(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Counter Back Dialog */}
      <Dialog open={!!counterDialogOffer} onClose={() => setCounterDialogOffer(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Counter Offer</DialogTitle>
        {counterDialogOffer && (
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Their counter: <strong>{formatCurrency(counterDialogOffer.counterAmount || 0)}</strong> for{' '}
              <strong>{counterDialogOffer.phoneNumber?.formatted || 'this number'}</strong>
            </Typography>
            <TextField
              autoFocus
              fullWidth
              label="Your Counter Amount"
              type="number"
              value={counterAmount}
              onChange={(e) => setCounterAmount(e.target.value)}
              slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Message (optional)"
              multiline
              rows={2}
              value={counterMessage}
              onChange={(e) => setCounterMessage(e.target.value)}
              placeholder="Add a message..."
            />
          </DialogContent>
        )}
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCounterDialogOffer(null)} disabled={submittingCounter}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCounterBack}
            disabled={submittingCounter || !counterAmount}
            sx={{ bgcolor: '#4BA0A1', '&:hover': { bgcolor: '#3d8889' } }}
          >
            {submittingCounter ? 'Sending...' : 'Send Counter'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={!!cancelDialogOffer} onClose={() => setCancelDialogOffer(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Cancel Offer</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to cancel your offer of{' '}
            <strong>{cancelDialogOffer && formatCurrency(cancelDialogOffer.amount)}</strong> for{' '}
            <strong>{cancelDialogOffer?.phoneNumber?.formatted || 'this number'}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCancelDialogOffer(null)} disabled={cancelling}>
            Keep Offer
          </Button>
          <Button variant="contained" color="error" onClick={handleCancel} disabled={cancelling}>
            {cancelling ? 'Cancelling...' : 'Yes, Cancel Offer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
