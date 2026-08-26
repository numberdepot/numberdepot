'use client';

import { useState, useEffect, useCallback } from 'react';
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
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import DeleteOutlineIcon from '@mui/icons-material/Delete';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import TimerIcon from '@mui/icons-material/Timer';
import { useCart } from '@/lib/cart';
import { useAuth } from '@/lib/auth';
import { useSnackbar } from '@/lib/snackbar';
import { api } from '@/lib/api';

interface FeeItem {
  id: string;
  label: string;
  amount: number;
  perItem: boolean;
}

function formatPhone(num: string): string {
  const digits = num.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return num;
}

function getPlanLabel(plan: string): string {
  switch (plan) {
    case 'park': return 'Park';
    case 'forward': return 'Forward';
    case 'unlimited': return 'Unlimited';
    case 'business': return 'Business';
    default: return plan;
  }
}

function getPlanColor(plan: string): string {
  switch (plan) {
    case 'park': return '#4BA0A1';
    case 'forward': return '#84BD00';
    case 'unlimited': return '#E53935';
    case 'business': return '#002664';
    default: return '#002664';
  }
}

function useCountdown(expiresAt: string | null) {
  const [remaining, setRemaining] = useState<number>(0);

  useEffect(() => {
    if (!expiresAt) { setRemaining(0); return; }

    const update = () => {
      const ms = new Date(expiresAt).getTime() - Date.now();
      setRemaining(Math.max(0, Math.floor(ms / 1000)));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const formatted = `${minutes}:${String(seconds).padStart(2, '0')}`;
  const isUrgent = remaining > 0 && remaining < 120;
  const isExpired = expiresAt ? remaining <= 0 : false;

  return { remaining, formatted, isUrgent, isExpired };
}

function ReservationTimer({ expiresAt }: { expiresAt: string | null }) {
  const { formatted, isUrgent, isExpired } = useCountdown(expiresAt);

  if (!expiresAt) return null;

  if (isExpired) {
    return (
      <Chip
        label="Expired"
        size="small"
        color="error"
        sx={{ fontWeight: 700, fontSize: '0.75rem' }}
      />
    );
  }

  return (
    <Chip
      icon={<TimerIcon sx={{ fontSize: 14 }} />}
      label={`Reserved for ${formatted}`}
      size="small"
      sx={{
        fontWeight: 700,
        fontSize: '0.75rem',
        bgcolor: isUrgent ? '#E5393518' : '#4BA0A118',
        color: isUrgent ? '#E53935' : '#4BA0A1',
      }}
    />
  );
}

export default function CartPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { items, removeItem, refreshCart, loading: cartLoading } = useCart();
  const { showSnackbar } = useSnackbar();
  const [removing, setRemoving] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [fees, setFees] = useState<FeeItem[]>([]);
  const [feesLoaded, setFeesLoaded] = useState(false);

  useEffect(() => {
    if (user) {
      refreshCart();
    }
  }, [user, refreshCart]);

  // Fetch checkout fees from admin settings
  useEffect(() => {
    api.get<FeeItem[]>('/admin/fees')
      .then((res) => {
        if (Array.isArray(res.data)) {
          setFees(res.data);
        }
      })
      .catch(() => {})
      .finally(() => setFeesLoaded(true));
  }, []);

  // Watch for expired items
  const checkExpirations = useCart((s) => s.checkExpirations);
  useEffect(() => {
    const id = setInterval(() => {
      const expiredCount = items.filter(
        (i) => i.reservedUntil && new Date(i.reservedUntil).getTime() <= Date.now()
      ).length;
      if (expiredCount > 0) {
        checkExpirations();
        showSnackbar(`${expiredCount} reservation${expiredCount > 1 ? 's' : ''} expired`, 'warning');
      }
    }, 5000);
    return () => clearInterval(id);
  }, [items, checkExpirations, showSnackbar]);

  const handleExtendTime = useCallback(async () => {
    try {
      const inventoryIds = items
        .filter((i) => i.source === 'inventory' && i.reservedUntil)
        .map((i) => i.phoneNumberId);
      if (inventoryIds.length === 0) return;
      await api.post('/cart/refresh', { numberIds: inventoryIds });
      await refreshCart();
      showSnackbar('Reservation time extended', 'success');
    } catch {
      showSnackbar('Failed to extend reservation', 'error');
    }
  }, [items, refreshCart, showSnackbar]);

  if (!user) {
    return (
      <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center' }}>
          <ShoppingCartIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h5" sx={{ mb: 1 }}>Sign in to view your cart</Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>You need to be logged in to manage your cart.</Typography>
          <Button component={Link} href="/login" variant="contained" color="primary">
            Sign In
          </Button>
        </Box>
      </Box>
    );
  }

  const handleRemove = async (itemId: string) => {
    setRemoving(itemId);
    try {
      await removeItem(itemId);
      showSnackbar('Item removed from cart', 'info');
    } catch {
      showSnackbar('Failed to remove item', 'error');
    } finally {
      setRemoving(null);
    }
  };

  // Calculate totals dynamically from fees
  const subtotal = items.reduce((sum, i) => sum + i.price, 0);

  // Calculate each fee's total
  const activeFees = fees.filter((f) => f.amount > 0);
  const feeBreakdown = activeFees.map((fee) => ({
    ...fee,
    total: fee.perItem ? fee.amount * items.length : fee.amount,
  }));
  const totalFees = feeBreakdown.reduce((sum, f) => sum + f.total, 0);
  const totalDueToday = subtotal + totalFees;

  // Check if any fee is recurring (monthly)
  const monthlyFees = feeBreakdown.filter((f) =>
    f.id.includes('month') || f.label.toLowerCase().includes('month') || f.label.toLowerCase().includes('service')
  );
  const totalMonthly = monthlyFees.reduce((sum, f) => sum + f.total, 0);

  // Payment itself happens on /checkout, where the totals are recomputed on the
  // server and the card is tokenised by Accept.js before anything is charged.
  const handleCheckout = () => {
    setCheckingOut(true);
    router.push('/checkout');
  };

  if (cartLoading || !feesLoaded) {
    return (
      <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '80vh' }}>
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        <Typography variant="h3" sx={{ mb: 1 }}>
          Shopping Cart
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          {items.length} item{items.length !== 1 ? 's' : ''} in your cart
        </Typography>

        {items.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 10 }}>
            <ShoppingBagIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h5" sx={{ mb: 1 }}>
              Your cart is empty
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
              Browse our collection of phone numbers and add the ones you like to your cart.
            </Typography>
            <Button
              component={Link}
              href="/search"
              variant="contained"
              color="secondary"
              size="large"
              endIcon={<ArrowForwardIcon />}
            >
              Browse Numbers
            </Button>
          </Box>
        ) : (
          <Grid container spacing={4}>
            {/* Cart Items */}
            <Grid size={{ xs: 12, md: 8 }}>
              {items.map((item) => (
                <Card key={item.id} sx={{ mb: 2 }}>
                  <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        flexDirection: { xs: 'column', sm: 'row' },
                        gap: 2,
                      }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                          <Typography
                            variant="h5"
                            sx={{ fontWeight: 800, color: 'primary.main', fontSize: '1.15rem' }}
                          >
                            {formatPhone(item.number)}
                          </Typography>
                          <Chip
                            label={item.numberType}
                            size="small"
                            sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                          />
                          {item.source === 'numberbarn' && (
                            <Chip
                              label="NumberBarn"
                              size="small"
                              variant="outlined"
                              sx={{ fontWeight: 600, fontSize: '0.65rem', color: '#666' }}
                            />
                          )}
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Chip
                            label={`${getPlanLabel(item.planType)} Plan`}
                            size="small"
                            sx={{
                              bgcolor: getPlanColor(item.planType) + '18',
                              color: getPlanColor(item.planType),
                              fontWeight: 700,
                              fontSize: '0.75rem',
                            }}
                          />
                          <ReservationTimer expiresAt={item.reservedUntil} />
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="body1" sx={{ fontWeight: 700, color: '#002664' }}>
                            ${item.price.toFixed(2)}
                          </Typography>
                        </Box>
                        <IconButton
                          onClick={() => handleRemove(item.id)}
                          disabled={removing === item.id}
                          sx={{
                            color: 'text.disabled',
                            '&:hover': { color: 'error.main', bgcolor: 'error.main' + '10' },
                          }}
                        >
                          {removing === item.id ? (
                            <CircularProgress size={20} />
                          ) : (
                            <DeleteOutlineIcon />
                          )}
                        </IconButton>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}

              {/* Extend time button */}
              {items.some((i) => i.reservedUntil) && (
                <Box sx={{ textAlign: 'center', mt: 1 }}>
                  <Button
                    variant="text"
                    size="small"
                    startIcon={<TimerIcon />}
                    onClick={handleExtendTime}
                    sx={{ color: 'text.secondary' }}
                  >
                    Extend Reservation Time
                  </Button>
                </Box>
              )}
            </Grid>

            {/* Order Summary */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Card sx={{ position: { md: 'sticky' }, top: { md: 100 } }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ mb: 3 }}>
                    Order Summary
                  </Typography>

                  {/* Subtotal */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      Subtotal ({items.length} item{items.length !== 1 ? 's' : ''})
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      ${subtotal.toFixed(2)}
                    </Typography>
                  </Box>

                  {/* Dynamic fees from admin settings */}
                  {feeBreakdown.map((fee) => (
                    <Box key={fee.id} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        {fee.label}
                        {fee.perItem && items.length > 1 && (
                          <Typography component="span" variant="caption" color="text.disabled">
                            {' '}(x{items.length})
                          </Typography>
                        )}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        ${fee.total.toFixed(2)}
                      </Typography>
                    </Box>
                  ))}

                  <Divider sx={{ my: 2 }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      Total Due Today
                    </Typography>
                    <Typography variant="h5" color="primary.main" sx={{ fontWeight: 800 }}>
                      ${totalDueToday.toFixed(2)}
                    </Typography>
                  </Box>
                  {totalMonthly > 0 && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3 }}>
                      Then ${totalMonthly.toFixed(2)}/mo for ongoing service
                    </Typography>
                  )}

                  {items.some((i) => i.source === 'numberbarn') && (
                    <Typography variant="caption" color="warning.main" sx={{ display: 'block', mb: 2 }}>
                      NumberBarn numbers: price may change at checkout. Fulfillment may take a few days.
                    </Typography>
                  )}

                  <Button
                    variant="contained"
                    color="secondary"
                    fullWidth
                    size="large"
                    onClick={handleCheckout}
                    disabled={checkingOut}
                    sx={{ py: 1.5, fontSize: '1.05rem', mb: 1.5 }}
                  >
                    {checkingOut ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : (
                      'Proceed to Checkout'
                    )}
                  </Button>

                  <Button
                    component={Link}
                    href="/search"
                    variant="text"
                    fullWidth
                    sx={{ color: 'text.secondary' }}
                  >
                    Continue Shopping
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Container>
    </Box>
  );
}
