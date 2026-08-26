'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import LockIcon from '@mui/icons-material/Lock';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useCart } from '@/lib/cart';
import { useAuth } from '@/lib/auth';
import { useSnackbar } from '@/lib/snackbar';
import { api, ApiError } from '@/lib/api';
import { loadAcceptJs, tokenizeCard, isAcceptConfigured, isSandbox } from '@/lib/accept-js';

interface QuoteItem {
  numberId: string | null;
  number: string;
  numberType: string;
  source: string;
  planType: string;
  price: number;
  monthlyPrice: number;
  numberbarnTn: string | null;
}

interface QuoteFeeLine {
  id: string;
  label: string;
  perItem: boolean;
  quantity: number;
  unitAmount: number;
  total: number;
}

interface Quote {
  items: QuoteItem[];
  feeLines: QuoteFeeLine[];
  subtotal: number;
  feesTotal: number;
  monthlyTotal: number;
  totalAmount: number;
}

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 15 }, (_, i) => String(CURRENT_YEAR + i));
const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { items, refreshCart, clearCart } = useCart();
  const { showSnackbar } = useSnackbar();

  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(true);
  const [acceptReady, setAcceptReady] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  // Reused across retries so a declined card does not leave a trail of orders.
  const orderIdRef = useRef<string | null>(null);

  const [form, setForm] = useState({
    firstName: '', lastName: '', address: '', city: '', state: '', zip: '', country: 'USA',
    cardNumber: '', month: '', year: '', cardCode: '',
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const setField = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    let value = e.target.value;
    if (key === 'cardNumber') value = value.replace(/[^\d\s]/g, '').slice(0, 23);
    if (key === 'cardCode') value = value.replace(/\D/g, '').slice(0, 4);
    if (key === 'zip') value = value.replace(/[^\d-]/g, '').slice(0, 10);
    setForm((f) => ({ ...f, [key]: value }));
  };

  useEffect(() => { refreshCart(); }, [refreshCart]);

  // Load Accept.js up front so the first Pay click is not waiting on a script.
  useEffect(() => {
    if (!isAcceptConfigured()) {
      setAcceptError('Payments are not configured on this site yet. Please contact support.');
      return;
    }
    loadAcceptJs()
      .then(() => setAcceptReady(true))
      .catch((err) => setAcceptError(err instanceof Error ? err.message : 'Payment library failed to load'));
  }, []);

  // Totals always come from the server, never from adding things up here.
  const fetchQuote = useCallback(async () => {
    if (items.length === 0) { setLoadingQuote(false); return; }
    setLoadingQuote(true);
    setQuoteError(null);
    try {
      const res = await api.post<Quote>('/orders/quote', {
        items: items.map((i) => ({
          phoneNumberId: i.phoneNumberId,
          source: i.source,
          planType: i.planType,
          numberbarnTn: i.numberbarnTn,
          rawNumber: i.rawNumber,
        })),
      });
      setQuote(res.data || null);
    } catch (err) {
      setQuoteError(err instanceof Error ? err.message : 'Could not price your cart');
      setQuote(null);
    } finally {
      setLoadingQuote(false);
    }
  }, [items]);

  useEffect(() => { fetchQuote(); }, [fetchQuote]);

  const cardDigits = form.cardNumber.replace(/\D/g, '');
  const invalid = {
    firstName: !form.firstName.trim(),
    lastName: !form.lastName.trim(),
    address: !form.address.trim(),
    city: !form.city.trim(),
    state: !form.state.trim(),
    zip: !/^\d{5}(-\d{4})?$/.test(form.zip),
    cardNumber: cardDigits.length < 13 || cardDigits.length > 19,
    month: !form.month,
    year: !form.year,
    cardCode: form.cardCode.length < 3,
  };
  const formValid = !Object.values(invalid).some(Boolean);

  const handlePay = async () => {
    setTouched(Object.fromEntries(Object.keys(invalid).map((k) => [k, true])));
    if (!formValid || !quote || submitting) return;

    setSubmitting(true);
    setPayError(null);

    try {
      // 1. Exchange card details for a single-use nonce, in the browser.
      const opaqueData = await tokenizeCard({
        cardNumber: cardDigits,
        month: form.month,
        year: form.year,
        cardCode: form.cardCode,
        zip: form.zip,
        fullName: `${form.firstName} ${form.lastName}`.trim(),
      });

      const billTo = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        zip: form.zip.trim(),
        country: form.country,
      };

      // 2. Create the order (server re-prices everything) unless we already
      //    have a pending one from a previous attempt.
      if (!orderIdRef.current) {
        const orderRes = await api.post<{ id: string }>('/orders', {
          items: items.map((i) => ({
            phoneNumberId: i.phoneNumberId,
            source: i.source,
            planType: i.planType,
            numberbarnTn: i.numberbarnTn,
            rawNumber: i.rawNumber,
          })),
        });
        if (!orderRes.data?.id) throw new Error('Could not create your order');
        orderIdRef.current = orderRes.data.id;
      }

      // 3. Charge.
      const payRes = await api.post<{
        status?: string;
        held?: boolean;
        message?: string;
        transactionId?: string | null;
        orderNumber?: string;
        hasPendingFulfillment?: boolean;
      }>(`/orders/${orderIdRef.current}/pay`, { opaqueData, billTo });

      if (!payRes.success) throw new Error('Payment could not be completed');

      await clearCart();
      orderIdRef.current = null;

      if (payRes.data?.held) {
        showSnackbar(payRes.data.message || 'Your payment is under review.', 'warning');
      } else {
        showSnackbar(
          payRes.data?.hasPendingFulfillment
            ? 'Payment successful! Some numbers are being provisioned and will appear shortly.'
            : 'Payment successful! Your numbers are ready.',
          'success'
        );
      }
      router.push('/account/orders');
    } catch (err) {
      // A stale or already-consumed order must be rebuilt on the next attempt.
      if (err instanceof ApiError && (err.status === 410 || err.status === 409)) {
        orderIdRef.current = null;
        await fetchQuote();
      }
      const message = err instanceof Error ? err.message : 'Payment failed. Please try again.';
      setPayError(message);
      showSnackbar(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center' }}>
          <LockIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h5" sx={{ mb: 1 }}>Sign in to check out</Typography>
          <Button component={Link} href="/login" variant="contained" color="primary" sx={{ mt: 2 }}>
            Sign In
          </Button>
        </Box>
      </Box>
    );
  }

  if (items.length === 0) {
    return (
      <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h5" sx={{ mb: 1 }}>Your cart is empty</Typography>
          <Button component={Link} href="/search" variant="contained" color="secondary" sx={{ mt: 2 }}>
            Browse Numbers
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '80vh' }}>
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        <Button component={Link} href="/cart" startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>
          Back to cart
        </Button>

        <Typography variant="h3" sx={{ mb: 1 }}>Checkout</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Your card details go straight to our payment processor — they never touch our servers.
        </Typography>

        {isSandbox() && (
          <Alert severity="info" sx={{ mb: 3 }}>
            <strong>Test mode.</strong> This site is pointed at the Authorize.Net sandbox — no real money will move.
          </Alert>
        )}
        {acceptError && <Alert severity="error" sx={{ mb: 3 }}>{acceptError}</Alert>}
        {quoteError && (
          <Alert severity="error" sx={{ mb: 3 }} action={
            <Button color="inherit" size="small" onClick={fetchQuote}>Retry</Button>
          }>
            {quoteError}
          </Alert>
        )}
        {payError && <Alert severity="error" sx={{ mb: 3 }}>{payError}</Alert>}

        <Grid container spacing={4}>
          {/* ── Billing + card ── */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Card sx={{ mb: 3 }}>
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2.5 }}>Billing Address</Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="First name" fullWidth value={form.firstName}
                      onChange={setField('firstName')} onBlur={() => setTouched((t) => ({ ...t, firstName: true }))}
                      error={touched.firstName && invalid.firstName} required />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Last name" fullWidth value={form.lastName}
                      onChange={setField('lastName')} onBlur={() => setTouched((t) => ({ ...t, lastName: true }))}
                      error={touched.lastName && invalid.lastName} required />
                  </Grid>
                  <Grid size={12}>
                    <TextField label="Street address" fullWidth value={form.address}
                      onChange={setField('address')} onBlur={() => setTouched((t) => ({ ...t, address: true }))}
                      error={touched.address && invalid.address} required />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 5 }}>
                    <TextField label="City" fullWidth value={form.city}
                      onChange={setField('city')} onBlur={() => setTouched((t) => ({ ...t, city: true }))}
                      error={touched.city && invalid.city} required />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <TextField select label="State" fullWidth value={form.state}
                      onChange={setField('state')} onBlur={() => setTouched((t) => ({ ...t, state: true }))}
                      error={touched.state && invalid.state} required>
                      {US_STATES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 4 }}>
                    <TextField label="ZIP" fullWidth value={form.zip}
                      onChange={setField('zip')} onBlur={() => setTouched((t) => ({ ...t, zip: true }))}
                      error={touched.zip && invalid.zip}
                      helperText={touched.zip && invalid.zip ? '5 digits' : ' '} required />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card>
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                  <CreditCardIcon color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>Card Details</Typography>
                  <Chip icon={<LockIcon sx={{ fontSize: 14 }} />} label="Encrypted" size="small"
                    sx={{ ml: 'auto', fontWeight: 700, fontSize: '0.7rem' }} />
                </Box>
                <Grid container spacing={2}>
                  <Grid size={12}>
                    <TextField label="Card number" fullWidth value={form.cardNumber}
                      onChange={setField('cardNumber')} onBlur={() => setTouched((t) => ({ ...t, cardNumber: true }))}
                      error={touched.cardNumber && invalid.cardNumber}
                      placeholder="4111 1111 1111 1111"
                      slotProps={{ htmlInput: { inputMode: 'numeric', autoComplete: 'cc-number' } }} required />
                  </Grid>
                  <Grid size={{ xs: 4 }}>
                    <TextField select label="Month" fullWidth value={form.month}
                      onChange={setField('month')} onBlur={() => setTouched((t) => ({ ...t, month: true }))}
                      error={touched.month && invalid.month} required>
                      {MONTHS.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 4 }}>
                    <TextField select label="Year" fullWidth value={form.year}
                      onChange={setField('year')} onBlur={() => setTouched((t) => ({ ...t, year: true }))}
                      error={touched.year && invalid.year} required>
                      {YEARS.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 4 }}>
                    <TextField label="CVV" fullWidth value={form.cardCode}
                      onChange={setField('cardCode')} onBlur={() => setTouched((t) => ({ ...t, cardCode: true }))}
                      error={touched.cardCode && invalid.cardCode}
                      slotProps={{ htmlInput: { inputMode: 'numeric', autoComplete: 'cc-csc' } }} required />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* ── Server-computed summary ── */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Card sx={{ position: { md: 'sticky' }, top: { md: 24 } }}>
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Order Summary</Typography>

                {loadingQuote ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress size={28} />
                  </Box>
                ) : quote ? (
                  <>
                    {quote.items.map((item) => (
                      <Box key={`${item.numberId || item.numberbarnTn}`} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, gap: 1 }}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                            {item.number}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.numberType} · {item.planType}
                            {item.source === 'numberbarn' && ' · NumberBarn'}
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {money(item.price)}
                        </Typography>
                      </Box>
                    ))}

                    <Divider sx={{ my: 2 }} />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                      <Typography variant="body2">{money(quote.subtotal)}</Typography>
                    </Box>
                    {quote.feeLines.map((fee) => (
                      <Box key={fee.id} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          {fee.label}{fee.perItem && fee.quantity > 1 ? ` × ${fee.quantity}` : ''}
                        </Typography>
                        <Typography variant="body2">{money(fee.total)}</Typography>
                      </Box>
                    ))}

                    <Divider sx={{ my: 2 }} />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Total Due Today</Typography>
                      <Typography variant="subtitle1" color="primary.main" sx={{ fontWeight: 800 }}>
                        {money(quote.totalAmount)}
                      </Typography>
                    </Box>
                    {quote.monthlyTotal > 0 && (
                      <Typography variant="caption" color="text.secondary">
                        Then {money(quote.monthlyTotal)}/month for your service plans.
                      </Typography>
                    )}

                    {quote.items.some((i) => i.source === 'numberbarn') && (
                      <Alert severity="info" sx={{ mt: 2, fontSize: '0.8rem' }}>
                        Some numbers in this order are sourced from NumberBarn and are provisioned
                        manually — expect them within 1–3 business days.
                      </Alert>
                    )}

                    <Button
                      variant="contained"
                      color="secondary"
                      size="large"
                      fullWidth
                      startIcon={submitting ? undefined : <LockIcon />}
                      onClick={handlePay}
                      disabled={submitting || !acceptReady || !!acceptError || !formValid}
                      sx={{ mt: 3, py: 1.5, fontSize: '1.05rem' }}
                    >
                      {submitting
                        ? 'Processing…'
                        : !acceptReady && !acceptError
                          ? 'Loading payment form…'
                          : `Pay ${money(quote.totalAmount)}`}
                    </Button>

                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1.5 }}>
                      Secured by Authorize.Net. You will not be charged more than the total above.
                    </Typography>
                  </>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    We could not price your cart. Please go back and try again.
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
