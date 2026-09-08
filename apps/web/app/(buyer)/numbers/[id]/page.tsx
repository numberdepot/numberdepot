'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Divider from '@mui/material/Divider';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Skeleton from '@mui/material/Skeleton';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import PhoneIcon from '@mui/icons-material/Phone';
import StarIcon from '@mui/icons-material/Star';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import LocalParkingIcon from '@mui/icons-material/LocalParking';
import PhoneForwardedIcon from '@mui/icons-material/PhoneForwarded';
import AllInclusiveIcon from '@mui/icons-material/AllInclusive';
import BusinessIcon from '@mui/icons-material/Business';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CircularProgress from '@mui/material/CircularProgress';
import { api } from '@/lib/api';
import { useCart } from '@/lib/cart';
import { useAuth } from '@/lib/auth';
import { useSnackbar } from '@/lib/snackbar';

interface FeeItem {
  id: string;
  label: string;
  amount: number;
  perItem: boolean;
}

interface PlanData {
  id: string;
  title: string;
  price: number;
  description: string;
}

interface NumberDetail {
  id: string;
  number: string;
  numberType: string;
  areaCode: string;
  salePrice?: number;
  licensePrice?: number;
  vanityText?: string;
  isPremium?: boolean;
  isPortable?: boolean;
  description?: string;
  listingId?: string;
  offerOnly?: boolean;
  allowOffers?: boolean;
  minimumOffer?: number;
  seller?: {
    firstName?: string;
    lastName?: string;
    companyName?: string;
  };
  features?: string[];
  relatedNumbers?: NumberDetail[];
  isPurchasable?: boolean;
  reservedByOther?: boolean;
}

const planIcons: Record<string, React.ReactNode> = {
  park: <LocalParkingIcon />,
  forward: <PhoneForwardedIcon />,
  unlimited: <AllInclusiveIcon />,
  business: <BusinessIcon />,
};
const planColors: Record<string, string> = {
  park: '#4BA0A1', forward: '#84BD00', unlimited: '#E53935', business: '#002664',
};
const planFeatures: Record<string, string[]> = {
  park: ['Custom voicemail greeting', 'Email notifications', 'Number protection'],
  forward: ['Forward to any phone', 'Caller ID passthrough', 'Scheduled forwarding', 'All Park features'],
  unlimited: ['Unlimited calling', 'SMS messaging', 'Voicemail to email', 'All Forward features'],
  business: ['Auto-attendant', 'Business hours routing', 'Call analytics', 'Professional greeting'],
};
const defaultPlans: PlanData[] = [
  { id: 'park', title: 'Park', price: 2.99, description: 'Reserve the number with voicemail greeting and email notifications.' },
  { id: 'forward', title: 'Forward', price: 6.99, description: 'Forward incoming calls to any phone number of your choice.' },
  { id: 'unlimited', title: 'Unlimited', price: 19.99, description: 'Full calling and SMS capabilities with voicemail to email.' },
  { id: 'business', title: 'Business', price: 9.99, description: 'Professional features including auto-attendant and call analytics.' },
];

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

function getTypeColor(type: string): string {
  switch (type?.toLowerCase()) {
    case 'toll-free': return '#4BA0A1';
    case 'vanity': return '#E53935';
    case 'local': return '#84BD00';
    default: return '#002664';
  }
}

export default function NumberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { addItem } = useCart();
  const { showSnackbar } = useSnackbar();

  const [number, setNumber] = useState<NumberDetail | null>(null);
  const [related, setRelated] = useState<NumberDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState('park');
  const [addingToCart, setAddingToCart] = useState(false);
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [submittingOffer, setSubmittingOffer] = useState(false);
  const [plans, setPlans] = useState<PlanData[]>(defaultPlans);
  const [fees, setFees] = useState<FeeItem[]>([]);

  // Fetch plans and fees from admin settings
  useEffect(() => {
    api.get<PlanData[]>('/admin/plans').then((res) => {
      if (res.data && res.data.length > 0) setPlans(res.data);
    }).catch(() => {});
    api.get<FeeItem[]>('/admin/fees').then((res) => {
      if (Array.isArray(res.data)) setFees(res.data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!params.id) return;
    setLoading(true);
    api.get<NumberDetail>(`/numbers/${params.id}`)
      .then((res) => {
        setNumber(res.data || null);
        if (res.data?.relatedNumbers) {
          setRelated(res.data.relatedNumbers);
        } else if (res.data?.areaCode) {
          api.get<NumberDetail[]>(`/search?area_code=${res.data.areaCode}&limit=4`)
            .then((r) => setRelated((r.data || []).filter((n) => n.id !== params.id)))
            .catch(() => {});
        }
      })
      .catch(() => {
        showSnackbar('Number not found', 'error');
        router.push('/search');
      })
      .finally(() => setLoading(false));
  }, [params.id, router, showSnackbar]);

  const handleAddToCart = async () => {
    if (!user) {
      showSnackbar('Please log in to add items to your cart', 'warning');
      router.push('/login');
      return;
    }
    if (!number?.listingId) {
      showSnackbar('This number is not available for purchase', 'error');
      return;
    }
    if (number.isPurchasable === false) {
      showSnackbar('This number is currently in another shopper\'s cart. Please check back shortly.', 'warning');
      return;
    }
    setAddingToCart(true);
    try {
      await addItem(number.id, number.listingId, selectedPlan);
      showSnackbar(`${formatPhone(number.number)} added to cart!`, 'success');
    } catch {
      showSnackbar('Failed to add to cart', 'error');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleSubmitOffer = async () => {
    if (!user) {
      showSnackbar('Please log in to make an offer', 'warning');
      router.push('/login');
      return;
    }
    const amount = parseFloat(offerAmount);
    if (isNaN(amount) || amount <= 0) {
      showSnackbar('Please enter a valid offer amount', 'error');
      return;
    }
    if (number?.minimumOffer && amount < number.minimumOffer) {
      showSnackbar(`Minimum offer is $${number.minimumOffer.toFixed(2)}`, 'error');
      return;
    }
    setSubmittingOffer(true);
    try {
      await api.post('/offers', {
        listingId: number?.listingId,
        phoneNumberId: number?.id,
        amount,
        buyerMessage: offerMessage || undefined,
      });
      showSnackbar('Offer submitted successfully!', 'success');
      setOfferDialogOpen(false);
      setOfferAmount('');
      setOfferMessage('');
      router.push('/account/offers');
    } catch {
      showSnackbar('Failed to submit offer', 'error');
    } finally {
      setSubmittingOffer(false);
    }
  };

  const activePlanData = plans.find((p) => p.id === selectedPlan) || plans[0];
  const activeFees = fees.filter((f) => f.amount > 0);
  const totalFees = activeFees.reduce((sum, f) => sum + f.amount, 0);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Skeleton width={200} height={20} sx={{ mb: 3 }} />
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Skeleton width="60%" height={60} />
            <Skeleton width="40%" height={30} sx={{ mt: 2 }} />
            <Skeleton width="100%" height={200} sx={{ mt: 3, borderRadius: 2 }} />
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <Skeleton width="100%" height={400} sx={{ borderRadius: 2 }} />
          </Grid>
        </Grid>
      </Container>
    );
  }

  if (!number) return null;

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '80vh' }}>
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        {/* Breadcrumbs */}
        <Breadcrumbs sx={{ mb: 3 }}>
          <Typography
            component={Link}
            href="/"
            color="text.secondary"
            sx={{ textDecoration: 'none', '&:hover': { color: 'primary.main' } }}
          >
            Home
          </Typography>
          <Typography
            component={Link}
            href="/search"
            color="text.secondary"
            sx={{ textDecoration: 'none', '&:hover': { color: 'primary.main' } }}
          >
            Browse
          </Typography>
          <Typography color="text.primary" sx={{ fontWeight: 600 }}>
            {formatPhone(number.number)}
          </Typography>
        </Breadcrumbs>

        <Grid container spacing={4}>
          {/* Left Column - Number Info */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                <Chip
                  label={number.numberType}
                  sx={{
                    bgcolor: getTypeColor(number.numberType) + '18',
                    color: getTypeColor(number.numberType),
                    fontWeight: 700,
                  }}
                />
                {number.isPremium && (
                  <Chip
                    icon={<StarIcon sx={{ fontSize: 16 }} />}
                    label="Premium"
                    sx={{ bgcolor: '#E5393518', color: '#E53935', fontWeight: 700 }}
                  />
                )}
                {number.isPortable && (
                  <Chip
                    icon={<SwapHorizIcon sx={{ fontSize: 16 }} />}
                    label="Portable"
                    sx={{ bgcolor: '#4BA0A118', color: '#4BA0A1', fontWeight: 700 }}
                  />
                )}
              </Box>
              <Typography
                variant="h2"
                sx={{
                  fontWeight: 800,
                  color: 'primary.main',
                  fontSize: { xs: '2rem', md: '2.75rem' },
                  letterSpacing: '-0.03em',
                }}
              >
                {formatPhone(number.number)}
              </Typography>
              {number.vanityText && (
                <Typography variant="h5" color="text.secondary" sx={{ mt: 0.5, fontWeight: 400 }}>
                  {number.vanityText}
                </Typography>
              )}
            </Box>

            {/* Attributes */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Number Details
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Area Code
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {number.areaCode}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Number Type
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {number.numberType}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Premium
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {number.isPremium ? 'Yes' : 'No'}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Portable
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {number.isPortable ? 'Yes' : 'No'}
                    </Typography>
                  </Grid>
                </Grid>
                {number.description && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                      {number.description}
                    </Typography>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Pricing Display */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Pricing
                </Typography>
                {number.offerOnly ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        background: 'linear-gradient(135deg, #002664 0%, #003a99 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <LocalOfferIcon sx={{ color: '#fff', fontSize: 24 }} />
                    </Box>
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight: 800, color: '#002664', lineHeight: 1.2 }}>
                        Offer Only
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        No fixed price — submit your best offer
                      </Typography>
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {number.salePrice != null && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          Purchase Price (one-time)
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 800, color: '#84BD00' }}>
                          ${number.salePrice.toFixed(2)}
                        </Typography>
                      </Box>
                    )}
                    {number.licensePrice != null && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          License Price
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 800, color: '#4BA0A1' }}>
                          ${number.licensePrice.toFixed(2)}/mo
                        </Typography>
                      </Box>
                    )}
                    {activeFees.map((fee) => (
                      <Box key={fee.id}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {fee.label} {fee.perItem ? '(per number)' : '(one-time)'}
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary' }}>
                          ${fee.amount.toFixed(2)}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Right Column - Plan Selection & Cart */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Card sx={{ position: { md: 'sticky' }, top: { md: 100 } }}>
              <CardContent sx={{ p: 3 }}>
                {number.offerOnly ? (
                  <>
                    <Box
                      sx={{
                        textAlign: 'center',
                        mb: 3,
                      }}
                    >
                      <Box
                        sx={{
                          width: 64,
                          height: 64,
                          borderRadius: 3,
                          background: 'linear-gradient(135deg, #002664 0%, #003a99 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mx: 'auto',
                          mb: 2,
                        }}
                      >
                        <LocalOfferIcon sx={{ color: '#fff', fontSize: 32 }} />
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                        Interested in this number?
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Submit your best offer and our team will review it. We typically respond within 24 hours.
                      </Typography>
                    </Box>

                    <Button
                      variant="contained"
                      size="large"
                      fullWidth
                      startIcon={<LocalOfferIcon />}
                      onClick={() => setOfferDialogOpen(true)}
                      sx={{
                        py: 1.5,
                        fontSize: '1.05rem',
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, #002664 0%, #003a99 100%)',
                        color: '#fff',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #003a99 0%, #0050cc 100%)',
                          color: '#fff',
                        },
                      }}
                    >
                      Make an Offer
                    </Button>
                    {number.minimumOffer != null && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
                        Minimum offer: ${number.minimumOffer.toFixed(2)}
                      </Typography>
                    )}

                    <Box sx={{ mt: 3, pt: 2.5, borderTop: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                        <CheckCircleIcon sx={{ fontSize: 14, color: '#84BD00' }} /> Multiple users can offer on the same number
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                        <CheckCircleIcon sx={{ fontSize: 14, color: '#84BD00' }} /> You&apos;ll be notified when we respond
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CheckCircleIcon sx={{ fontSize: 14, color: '#84BD00' }} /> Pay securely online after acceptance
                      </Typography>
                    </Box>
                  </>
                ) : (
                  <>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      Choose Your Plan
                    </Typography>

                    <ToggleButtonGroup
                      value={selectedPlan}
                      exclusive
                      onChange={(_, val) => val && setSelectedPlan(val)}
                      orientation="vertical"
                      fullWidth
                      sx={{ mb: 3 }}
                    >
                      {plans.map((plan) => {
                        const color = planColors[plan.id] || '#002664';
                        const icon = planIcons[plan.id] || <PhoneIcon />;
                        return (
                          <ToggleButton
                            key={plan.id}
                            value={plan.id}
                            sx={{
                              py: 2,
                              px: 2.5,
                              justifyContent: 'flex-start',
                              gap: 2,
                              textAlign: 'left',
                              textTransform: 'none',
                              border: '1px solid',
                              borderColor: selectedPlan === plan.id ? color : 'divider',
                              bgcolor: selectedPlan === plan.id ? color + '08' : 'transparent',
                              '&.Mui-selected': {
                                bgcolor: color + '10',
                                borderColor: color,
                                '&:hover': { bgcolor: color + '15' },
                              },
                            }}
                          >
                            <Box sx={{ color }}>{icon}</Box>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                {plan.title}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {plan.description}
                              </Typography>
                            </Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 800, color }}>
                              ${plan.price.toFixed(2)}/mo
                            </Typography>
                          </ToggleButton>
                        );
                      })}
                    </ToggleButtonGroup>

                    {/* Plan Features */}
                    <Box sx={{ mb: 3, pl: 1 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        {activePlanData?.title || 'Park'} Plan Includes:
                      </Typography>
                      {(planFeatures[selectedPlan] || []).map((feature) => (
                        <Box key={feature} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                          <CheckCircleIcon sx={{ fontSize: 16, color: planColors[selectedPlan] || '#002664' }} />
                          <Typography variant="body2" color="text.secondary">
                            {feature}
                          </Typography>
                        </Box>
                      ))}
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    {/* Price Summary */}
                    <Box sx={{ mb: 3 }}>
                      {number.salePrice != null && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2" color="text.secondary">Number Price</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>${number.salePrice.toFixed(2)}</Typography>
                        </Box>
                      )}
                      {activeFees.map((fee) => (
                        <Box key={fee.id} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2" color="text.secondary">{fee.label}</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>${fee.amount.toFixed(2)}</Typography>
                        </Box>
                      ))}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">Monthly ({activePlanData?.title || 'Park'})</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>${(activePlanData?.price || 0).toFixed(2)}/mo</Typography>
                      </Box>
                      <Divider sx={{ my: 1.5 }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Due Today</Typography>
                        <Typography variant="subtitle1" color="primary.main" sx={{ fontWeight: 800 }}>
                          ${((number.salePrice || 0) + totalFees).toFixed(2)}
                        </Typography>
                      </Box>
                    </Box>

                    <Button
                      variant="contained"
                      color="secondary"
                      size="large"
                      fullWidth
                      startIcon={<AddShoppingCartIcon />}
                      onClick={handleAddToCart}
                      disabled={addingToCart || number.isPurchasable === false}
                      sx={{ py: 1.5, fontSize: '1.05rem' }}
                    >
                      {number.isPurchasable === false
                        ? 'Currently Unavailable'
                        : addingToCart
                          ? 'Adding to Cart...'
                          : 'Add to Cart'}
                    </Button>
                    {number.reservedByOther && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 0.75 }}>
                        Someone else is checking out with this number right now.
                      </Typography>
                    )}

                    {number.allowOffers && (
                      <Button
                        variant="outlined"
                        size="large"
                        fullWidth
                        startIcon={<LocalOfferIcon />}
                        onClick={() => setOfferDialogOpen(true)}
                        sx={{ mt: 1.5, py: 1.5, fontSize: '1.05rem' }}
                      >
                        Make an Offer
                      </Button>
                    )}
                    {number.allowOffers && number.minimumOffer != null && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 0.75 }}>
                        Minimum offer: ${number.minimumOffer.toFixed(2)}
                      </Typography>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Seller Info */}
            {number.seller && (
              <Card sx={{ mt: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Seller
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {number.seller.companyName || `${number.seller.firstName || ''} ${number.seller.lastName || ''}`.trim() || 'Private Seller'}
                  </Typography>
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>

        {/* Offer Dialog */}
        <Dialog open={offerDialogOpen} onClose={() => setOfferDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Make an Offer for {formatPhone(number.number)}</DialogTitle>
          <DialogContent>
            {number.minimumOffer != null && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Minimum offer: ${number.minimumOffer.toFixed(2)}
              </Typography>
            )}
            <TextField
              autoFocus
              fullWidth
              label="Offer Amount"
              type="number"
              value={offerAmount}
              onChange={(e) => setOfferAmount(e.target.value)}
              slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
              sx={{ mb: 2, mt: 1 }}
            />
            <TextField
              fullWidth
              label="Message (optional)"
              multiline
              rows={3}
              value={offerMessage}
              onChange={(e) => setOfferMessage(e.target.value)}
              placeholder="Add a message to the seller..."
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOfferDialogOpen(false)} disabled={submittingOffer}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmitOffer}
              disabled={submittingOffer || !offerAmount}
            >
              {submittingOffer ? 'Submitting...' : 'Submit Offer'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Related Numbers */}
        {related.length > 0 && (
          <Box sx={{ mt: 8 }}>
            <Typography variant="h4" sx={{ mb: 3 }}>
              Related Numbers
            </Typography>
            <Grid container spacing={2.5}>
              {related.slice(0, 4).map((num) => (
                <Grid key={num.id} size={{ xs: 12, sm: 6, md: 3 }}>
                  <Card
                    sx={{
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-3px)',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                      },
                    }}
                  >
                    <CardContent sx={{ pb: 1 }}>
                      <Chip
                        label={num.numberType}
                        size="small"
                        sx={{
                          bgcolor: getTypeColor(num.numberType) + '18',
                          color: getTypeColor(num.numberType),
                          fontWeight: 700,
                          fontSize: '0.7rem',
                          mb: 1.5,
                        }}
                      />
                      <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main' }}>
                        {formatPhone(num.number)}
                      </Typography>
                      <Typography variant="body1" sx={{ mt: 1, color: '#84BD00', fontWeight: 700 }}>
                        {num.salePrice
                          ? `$${num.salePrice.toFixed(2)}`
                          : num.licensePrice
                            ? `$${num.licensePrice.toFixed(2)}/mo`
                            : 'Contact'}
                      </Typography>
                    </CardContent>
                    <CardActions sx={{ px: 2, pb: 2 }}>
                      <Button
                        component={Link}
                        href={`/numbers/${num.id}`}
                        variant="outlined"
                        size="small"
                        fullWidth
                      >
                        View Details
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Container>
    </Box>
  );
}
