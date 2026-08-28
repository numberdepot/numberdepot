'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import SearchIcon from '@mui/icons-material/Search';
import PhoneIcon from '@mui/icons-material/Phone';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import LocalParkingIcon from '@mui/icons-material/LocalParking';
import PhoneForwardedIcon from '@mui/icons-material/PhoneForwarded';
import AllInclusiveIcon from '@mui/icons-material/AllInclusive';
import BusinessIcon from '@mui/icons-material/Business';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import StarIcon from '@mui/icons-material/Star';
import SecurityIcon from '@mui/icons-material/Security';
import SpeedIcon from '@mui/icons-material/Speed';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import GroupsIcon from '@mui/icons-material/Groups';
import { api } from '@/lib/api';
import { useReveal } from '@/lib/useReveal';

interface PhoneNumber {
  id: string;
  number: string;
  numberType: string;
  areaCode: string;
  salePrice?: number;
  licensePrice?: number;
  vanityText?: string;
  isPremium?: boolean;
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

function getTypeColor(type: string): string {
  switch (type?.toLowerCase()) {
    case 'toll-free': return '#4BA0A1';
    case 'vanity': return '#E53935';
    case 'local': return '#84BD00';
    default: return '#002664';
  }
}

const plans = [
  {
    title: 'Park',
    price: '$2.99',
    period: '/mo',
    icon: <LocalParkingIcon sx={{ fontSize: 40 }} />,
    color: '#4BA0A1',
    features: ['Reserve your number', 'Custom voicemail greeting', 'Email notifications', 'Number protection'],
  },
  {
    title: 'Forward',
    price: '$6.99',
    period: '/mo',
    icon: <PhoneForwardedIcon sx={{ fontSize: 40 }} />,
    color: '#84BD00',
    features: ['Forward to any phone', 'Caller ID passthrough', 'Scheduled forwarding', 'All Park features'],
  },
  {
    title: 'Unlimited',
    price: '$19.99',
    period: '/mo',
    icon: <AllInclusiveIcon sx={{ fontSize: 40 }} />,
    color: '#E53935',
    features: ['Unlimited calling', 'SMS messaging', 'Voicemail to email', 'All Forward features'],
    popular: true,
  },
  {
    title: 'Business',
    price: '$9.99',
    period: '/mo',
    icon: <BusinessIcon sx={{ fontSize: 40 }} />,
    color: '#002664',
    features: ['Auto-attendant', 'Business hours routing', 'Call analytics', 'Professional greeting'],
  },
];

const steps = [
  {
    icon: <SearchIcon sx={{ fontSize: 48, color: '#002664' }} />,
    title: 'Search',
    description: 'Browse thousands of local, toll-free, and vanity phone numbers. Filter by area code, type, or search for specific patterns.',
  },
  {
    icon: <ShoppingCartIcon sx={{ fontSize: 48, color: '#E53935' }} />,
    title: 'Choose a Plan',
    description: 'Select the perfect service plan for your needs. Park it, forward calls, or get full unlimited calling and messaging.',
  },
  {
    icon: <RocketLaunchIcon sx={{ fontSize: 48, color: '#84BD00' }} />,
    title: 'Activate',
    description: 'Complete your purchase and your number is active within minutes. Start receiving calls right away.',
  },
];

const stats = [
  { value: '50K+', label: 'Numbers Available', icon: <PhoneIcon /> },
  { value: '10K+', label: 'Happy Customers', icon: <GroupsIcon /> },
  { value: '99.9%', label: 'Uptime Guaranteed', icon: <SpeedIcon /> },
  { value: '24/7', label: 'Customer Support', icon: <SupportAgentIcon /> },
];

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [featured, setFeatured] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const revealRef = useReveal();

  useEffect(() => {
    api.get<PhoneNumber[]>('/numbers?limit=8&sort=featured')
      .then((res) => setFeatured(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  return (
    <Box ref={revealRef}>
      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #002664 0%, #001a45 30%, #1a4a8a 60%, #4BA0A1 100%)',
          color: '#fff',
          pt: { xs: 6, md: 10, lg: 12 },
          pb: { xs: 8, md: 12, lg: 14 },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Animated background pattern */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.06,
            backgroundImage: 'radial-gradient(circle at 25% 50%, #fff 1.5px, transparent 1.5px), radial-gradient(circle at 75% 80%, #fff 1px, transparent 1px)',
            backgroundSize: '50px 50px, 30px 30px',
          }}
        />
        {/* Decorative gradient orbs */}
        <Box
          sx={{
            position: 'absolute',
            top: '-20%',
            right: '-10%',
            width: '500px',
            height: '500px',
            background: 'radial-gradient(circle, rgba(229,57,53,0.15) 0%, transparent 70%)',
            borderRadius: '50%',
            pointerEvents: 'none',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: '-30%',
            left: '-10%',
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(75,160,161,0.2) 0%, transparent 70%)',
            borderRadius: '50%',
            pointerEvents: 'none',
          }}
        />

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Grid container spacing={4} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Typography
                variant="h1"
                sx={{
                  fontSize: { xs: '2.25rem', sm: '3rem', md: '3.75rem', lg: '4.25rem' },
                  fontWeight: 800,
                  mb: 2.5,
                  lineHeight: 1.1,
                  letterSpacing: '-0.03em',
                  color: '#fff',
                }}
              >
                Find Your Perfect{' '}
                <Box component="span" className="gradient-text">
                  Phone Number
                </Box>
              </Typography>
              <Typography
                variant="h5"
                sx={{
                  mb: 4,
                  fontWeight: 400,
                  opacity: 0.9,
                  fontSize: { xs: '1.05rem', md: '1.3rem', lg: '1.4rem' },
                  lineHeight: 1.7,
                  maxWidth: 560,
                  color: '#fff',
                }}
              >
                Browse thousands of local, toll-free, and vanity numbers.
                Get set up in minutes with flexible plans starting at just $2.99/mo.
              </Typography>
              <Box
                component="form"
                onSubmit={handleSearch}
                sx={{
                  display: 'flex',
                  gap: 1.5,
                  maxWidth: 540,
                  flexDirection: { xs: 'column', sm: 'row' },
                }}
              >
                <TextField
                  fullWidth
                  placeholder="Search by number, area code, or keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{
                    bgcolor: '#fff',
                    borderRadius: 2.5,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2.5,
                      fontSize: '1.05rem',
                      '& fieldset': { border: 'none' },
                    },
                  }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  color="secondary"
                  size="large"
                  sx={{
                    px: 4.5,
                    whiteSpace: 'nowrap',
                    minWidth: 150,
                    fontSize: '1.05rem',
                    borderRadius: 2.5,
                    boxShadow: '0 4px 20px rgba(229,57,53,0.4)',
                    '&:hover': {
                      boxShadow: '0 6px 28px rgba(229,57,53,0.5)',
                    },
                  }}
                >
                  Search
                </Button>
              </Box>
              <Box sx={{ mt: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {['Local', 'Toll-Free', 'Vanity', '800 Numbers'].map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    component={Link}
                    href={`/search?q=${tag.toLowerCase()}`}
                    clickable
                    size="small"
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.12)',
                      color: '#fff',
                      fontWeight: 600,
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' },
                    }}
                  />
                ))}
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }} sx={{ display: 'flex', justifyContent: 'center' }}>
              <Box
                component="img"
                src="/images/elephant-01.png"
                alt="NumberDepot elephant mascot"
                className="animate-float"
                sx={{
                  maxWidth: { xs: 340, md: 520, lg: 600 },
                  width: '100%',
                  height: 'auto',
                  filter: 'drop-shadow(0 20px 50px rgba(0,0,0,0.35))',
                }}
              />
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Trust Stats Bar */}
      <Box
        sx={{
          bgcolor: '#fff',
          py: { xs: 3, md: 4 },
          borderBottom: '1px solid',
          borderColor: 'divider',
          position: 'relative',
          zIndex: 2,
          mt: { xs: -3, md: -5 },
          mx: { xs: 2, md: 'auto' },
          maxWidth: { md: '90%', lg: 1100 },
          borderRadius: { xs: 3, md: 4 },
          boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={3} className="stagger-children">
            {stats.map((stat) => (
              <Grid key={stat.label} size={{ xs: 6, md: 3 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Box sx={{ color: '#E53935', mb: 0.5 }}>{stat.icon}</Box>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: '#002664', fontSize: { xs: '1.5rem', md: '1.75rem' } }}>
                    {stat.value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                    {stat.label}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Telco Cellular Promo Card — matches Trust Stats card style */}
      <Box
        sx={{
          mx: { xs: 2, md: 'auto' },
          maxWidth: { md: '90%', lg: 1100 },
          mt: { xs: 2, md: 3 },
        }}
      >
        <Card
          sx={{
            borderRadius: { xs: 3, md: 4 },
            overflow: 'hidden',
            boxShadow: '0 8px 40px rgba(10,79,104,0.12)',
            border: '1px solid rgba(10,79,104,0.08)',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 16px 56px rgba(10,79,104,0.18)',
            },
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, minHeight: { md: 160 } }}>
            {/* Left — dark branding strip */}
            <Box
              sx={{
                background: 'linear-gradient(160deg, #0A4F68 0%, #083d54 100%)',
                px: { xs: 3, md: 4 },
                py: { xs: 3, md: 0 },
                display: 'flex',
                flexDirection: { xs: 'row', md: 'column' },
                alignItems: 'center',
                justifyContent: 'center',
                gap: { xs: 2, md: 1.5 },
                minWidth: { md: 150 },
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Subtle pattern */}
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  opacity: 0.06,
                  backgroundImage: 'radial-gradient(circle at 30% 50%, #fff 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                  pointerEvents: 'none',
                }}
              />
              <Box
                component="img"
                src="/images/telco-logo.png"
                alt="Telco Cellular"
                sx={{
                  height: { xs: 40, md: 52 },
                  width: 'auto',
                  filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))',
                  position: 'relative',
                  zIndex: 1,
                }}
              />
              <Typography
                sx={{
                  color: '#4dd9ff',
                  fontWeight: 800,
                  fontSize: '0.7rem',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                Telco Cellular
              </Typography>
            </Box>

            {/* Right — white content area */}
            <Box sx={{ flex: 1, p: { xs: 3, sm: 3.5, md: 4 }, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'center' }, gap: { xs: 2.5, md: 4 } }}>
              {/* Info */}
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 800,
                      color: '#1a1a2e',
                      fontSize: { xs: '1.15rem', sm: '1.3rem', md: '1.4rem' },
                      lineHeight: 1.25,
                    }}
                  >
                    Turn Your Number Into{' '}
                    <Box component="span" sx={{ color: '#0A4F68' }}>Cellular Service</Box>
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, mb: 1.5 }}>
                  <Typography sx={{ fontWeight: 900, fontSize: { xs: '2rem', md: '2.4rem' }, color: '#0A4F68', lineHeight: 1 }}>
                    $19
                  </Typography>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.95rem', fontWeight: 500 }}>
                    /month
                  </Typography>
                  <Chip
                    label="NOT A PENNY MORE"
                    size="small"
                    sx={{
                      ml: 1,
                      bgcolor: '#E5393510',
                      color: '#E53935',
                      fontWeight: 800,
                      fontSize: '0.6rem',
                      letterSpacing: '0.06em',
                      height: 22,
                    }}
                  />
                </Box>
                <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap' }}>
                  {[
                    { icon: <PhoneIcon sx={{ fontSize: 16 }} />, text: 'Unlimited Talk' },
                    { icon: <CheckCircleIcon sx={{ fontSize: 16 }} />, text: 'Unlimited Text' },
                    { icon: <SpeedIcon sx={{ fontSize: 16 }} />, text: 'Unlimited Data' },
                  ].map((item) => (
                    <Box key={item.text} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box sx={{ color: '#0A4F68' }}>{item.icon}</Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.82rem' }}>
                        {item.text}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>

              {/* CTA */}
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
                <Button
                  href="https://telcocellular.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForwardIcon />}
                  sx={{
                    bgcolor: '#0A4F68',
                    color: '#fff',
                    fontWeight: 700,
                    px: 4,
                    py: 1.4,
                    fontSize: '0.95rem',
                    borderRadius: 3,
                    whiteSpace: 'nowrap',
                    textTransform: 'none',
                    boxShadow: '0 4px 16px rgba(10,79,104,0.25)',
                    '&:hover': {
                      bgcolor: '#083d54',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 28px rgba(10,79,104,0.3)',
                    },
                    transition: 'all 0.25s ease',
                  }}
                >
                  Learn More
                </Button>
                <Typography sx={{ color: 'text.disabled', fontSize: '0.7rem' }}>
                  telcocellular.com
                </Typography>
              </Box>
            </Box>
          </Box>
        </Card>
      </Box>

      {/* Featured Numbers Section */}
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
        <Box sx={{ textAlign: 'center', mb: 6 }} className="reveal">
          <Chip
            label="Featured"
            size="small"
            sx={{
              bgcolor: '#E5393518',
              color: '#E53935',
              fontWeight: 700,
              mb: 2,
              fontSize: '0.8rem',
            }}
          />
          <Typography variant="h2" sx={{ mb: 1.5, fontSize: { xs: '1.75rem', md: '2.25rem', lg: '2.5rem' } }}>
            Featured Numbers
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 560, mx: 'auto', fontSize: { md: '1.1rem' } }}>
            Hand-picked phone numbers available right now. Grab one before it is gone.
          </Typography>
        </Box>
        <Grid container spacing={2.5} className="stagger-children">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
                <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
                  <Card>
                    <CardContent>
                      <Skeleton width={60} height={24} sx={{ mb: 1 }} />
                      <Skeleton width="100%" height={32} />
                      <Skeleton width={80} height={28} sx={{ mt: 1 }} />
                    </CardContent>
                  </Card>
                </Grid>
              ))
            : featured.map((num) => (
                <Grid key={num.id} size={{ xs: 12, sm: 6, md: 3 }}>
                  <Card className="card-lift" sx={{ borderRadius: 3 }}>
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
                      {num.isPremium && (
                        <Chip
                          icon={<StarIcon sx={{ fontSize: 14 }} />}
                          label="Premium"
                          size="small"
                          sx={{
                            bgcolor: '#E5393518',
                            color: '#E53935',
                            fontWeight: 700,
                            fontSize: '0.7rem',
                            mb: 1.5,
                            ml: 0.5,
                          }}
                        />
                      )}
                      <Typography
                        variant="h5"
                        className="number-pop"
                        sx={{
                          fontWeight: 800,
                          color: 'primary.main',
                          letterSpacing: '-0.02em',
                          fontSize: { xs: '1.15rem', lg: '1.25rem' },
                          cursor: 'default',
                        }}
                      >
                        {formatPhone(num.number)}
                      </Typography>
                      {num.vanityText && (
                        <Typography variant="caption" color="text.secondary">
                          {num.vanityText}
                        </Typography>
                      )}
                      <Typography
                        variant="h6"
                        sx={{ mt: 1, color: '#84BD00', fontWeight: 700 }}
                      >
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
                        sx={{ fontWeight: 600, borderRadius: 2 }}
                      >
                        View Details
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
        </Grid>
        {!loading && featured.length > 0 && (
          <Box sx={{ textAlign: 'center', mt: 5 }} className="reveal">
            <Button
              component={Link}
              href="/search"
              variant="outlined"
              size="large"
              endIcon={<ArrowForwardIcon />}
              sx={{ px: 5, py: 1.5, borderRadius: 3, fontSize: '1rem' }}
            >
              Browse All Numbers
            </Button>
          </Box>
        )}
      </Container>

      {/* How It Works Section */}
      <Box sx={{ bgcolor: '#F5F7FA', py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 7 }} className="reveal">
            <Chip
              label="Simple Process"
              size="small"
              sx={{
                bgcolor: '#00266418',
                color: '#002664',
                fontWeight: 700,
                mb: 2,
                fontSize: '0.8rem',
              }}
            />
            <Typography variant="h2" sx={{ mb: 1.5, fontSize: { xs: '1.75rem', md: '2.25rem', lg: '2.5rem' } }}>
              How It Works
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 500, mx: 'auto', fontSize: { md: '1.1rem' } }}>
              Getting your perfect phone number is easy. Three simple steps and you are up and running.
            </Typography>
          </Box>
          <Grid container spacing={4} className="stagger-children">
            {steps.map((step, i) => (
              <Grid key={step.title} size={{ xs: 12, md: 4 }}>
                <Box
                  sx={{
                    textAlign: 'center',
                    px: 3,
                    py: 4,
                    bgcolor: '#fff',
                    borderRadius: 4,
                    boxShadow: '0 2px 16px rgba(0,0,0,0.04)',
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-6px)',
                      boxShadow: '0 12px 40px rgba(0,0,0,0.08)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 100,
                      height: 100,
                      borderRadius: '50%',
                      bgcolor: i === 0 ? '#00266410' : i === 1 ? '#E5393510' : '#84BD0010',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 3,
                      position: 'relative',
                    }}
                  >
                    {step.icon}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: -4,
                        right: -4,
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        bgcolor: 'primary.main',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        boxShadow: '0 2px 8px rgba(0,38,100,0.3)',
                      }}
                    >
                      {i + 1}
                    </Box>
                  </Box>
                  <Typography variant="h4" sx={{ mt: 1, mb: 1.5, fontSize: { xs: '1.25rem', md: '1.4rem' } }}>
                    {step.title}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7, fontSize: { md: '1.05rem' } }}>
                    {step.description}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Why Choose Us Section */}
      <Box sx={{ py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={6} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, md: 5 }} className="reveal-left">
              <Chip
                label="Why NumberDepot"
                size="small"
                sx={{
                  bgcolor: '#4BA0A118',
                  color: '#4BA0A1',
                  fontWeight: 700,
                  mb: 2,
                  fontSize: '0.8rem',
                }}
              />
              <Typography variant="h2" sx={{ mb: 2, fontSize: { xs: '1.75rem', md: '2.25rem' } }}>
                The Trusted Phone Number Marketplace
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.8, fontSize: { md: '1.1rem' } }}>
                NumberDepot makes it easy to find and purchase the perfect phone number for your
                business or personal use. With thousands of numbers and transparent pricing,
                you will find exactly what you need.
              </Typography>
              <Button
                component={Link}
                href="/about"
                variant="outlined"
                endIcon={<ArrowForwardIcon />}
                sx={{ borderRadius: 3 }}
              >
                Learn More About Us
              </Button>
              <Box
                component="img"
                src="/images/elephant-02.png"
                alt="NumberDepot elephant"
                className="animate-float"
                sx={{
                  display: { xs: 'none', md: 'block' },
                  maxWidth: 280,
                  width: '100%',
                  height: 'auto',
                  mt: 4,
                  filter: 'drop-shadow(0 12px 32px rgba(0,0,0,0.15))',
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 7 }} className="reveal-right">
              <Grid container spacing={2.5}>
                {[
                  { icon: <SecurityIcon sx={{ fontSize: 32, color: '#002664' }} />, title: 'Secure Transactions', desc: 'Every purchase is protected with bank-level encryption and Stripe payments.' },
                  { icon: <SpeedIcon sx={{ fontSize: 32, color: '#E53935' }} />, title: 'Instant Activation', desc: 'Your number is active within minutes of purchase. No waiting around.' },
                  { icon: <SupportAgentIcon sx={{ fontSize: 32, color: '#4BA0A1' }} />, title: '24/7 Support', desc: 'Our team is here to help whenever you need assistance with your number.' },
                  { icon: <CheckCircleIcon sx={{ fontSize: 32, color: '#84BD00' }} />, title: 'No Hidden Fees', desc: 'Transparent pricing with no surprise charges. What you see is what you pay.' },
                ].map((item) => (
                  <Grid key={item.title} size={{ xs: 12, sm: 6 }}>
                    <Box
                      sx={{
                        p: 3,
                        borderRadius: 3,
                        border: '1px solid',
                        borderColor: 'divider',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          borderColor: '#00266440',
                          boxShadow: '0 8px 30px rgba(0,38,100,0.08)',
                        },
                      }}
                    >
                      <Box sx={{ mb: 1.5 }}>{item.icon}</Box>
                      <Typography variant="h6" sx={{ mb: 0.5, fontWeight: 700, fontSize: '1rem' }}>
                        {item.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                        {item.desc}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Pricing Plans Section */}
      <Box sx={{ bgcolor: '#F5F7FA', py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 7 }} className="reveal">
            <Chip
              label="Pricing"
              size="small"
              sx={{
                bgcolor: '#84BD0018',
                color: '#84BD00',
                fontWeight: 700,
                mb: 2,
                fontSize: '0.8rem',
              }}
            />
            <Typography variant="h2" sx={{ mb: 1.5, fontSize: { xs: '1.75rem', md: '2.25rem', lg: '2.5rem' } }}>
              Simple, Transparent Pricing
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 520, mx: 'auto', fontSize: { md: '1.1rem' } }}>
              Choose the plan that fits your needs. All plans include a one-time $5.00 setup fee.
            </Typography>
          </Box>
          <Grid container spacing={3} className="stagger-children">
            {plans.map((plan) => (
              <Grid key={plan.title} size={{ xs: 12, sm: 6, md: 3 }}>
                <Card
                  className="card-lift"
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    borderRadius: 4,
                    border: plan.popular ? `2px solid ${plan.color}` : '1px solid transparent',
                    overflow: 'visible',
                  }}
                >
                  {plan.popular && (
                    <Chip
                      label="Most Popular"
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: -14,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        bgcolor: plan.color,
                        color: '#fff',
                        fontWeight: 700,
                        boxShadow: '0 4px 12px rgba(229,57,53,0.3)',
                      }}
                    />
                  )}
                  <CardContent sx={{ flex: 1, textAlign: 'center', pt: plan.popular ? 4.5 : 3.5, px: 3 }}>
                    <Box sx={{ color: plan.color, mb: 2 }}>{plan.icon}</Box>
                    <Typography variant="h4" sx={{ mb: 1, fontSize: { xs: '1.25rem', md: '1.35rem' } }}>
                      {plan.title}
                    </Typography>
                    <Box sx={{ mb: 3 }}>
                      <Typography
                        component="span"
                        sx={{ fontSize: { xs: '2.25rem', md: '2.75rem' }, fontWeight: 800, color: 'text.primary' }}
                      >
                        {plan.price}
                      </Typography>
                      <Typography component="span" color="text.secondary" sx={{ fontSize: '1rem' }}>
                        {plan.period}
                      </Typography>
                    </Box>
                    {plan.features.map((feature) => (
                      <Box
                        key={feature}
                        sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}
                      >
                        <CheckCircleIcon sx={{ fontSize: 18, color: plan.color }} />
                        <Typography variant="body2" color="text.secondary">
                          {feature}
                        </Typography>
                      </Box>
                    ))}
                  </CardContent>
                  <CardActions sx={{ p: 3, pt: 0 }}>
                    <Button
                      component={Link}
                      href="/search"
                      variant={plan.popular ? 'contained' : 'outlined'}
                      color={plan.popular ? 'secondary' : 'primary'}
                      fullWidth
                      size="large"
                      sx={{ borderRadius: 2.5, py: 1.2 }}
                    >
                      Get Started
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #002664 0%, #001a45 40%, #4BA0A1 100%)',
          py: { xs: 10, md: 14 },
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative bg element */}
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '600px',
            height: '600px',
            background: 'radial-gradient(circle, rgba(229,57,53,0.1) 0%, transparent 70%)',
            borderRadius: '50%',
            pointerEvents: 'none',
          }}
        />
        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }} className="reveal-scale">
          <Box
            component="img"
            src="/images/elephant-03.png"
            alt="NumberDepot elephant"
            sx={{
              width: { xs: 120, md: 160 },
              height: 'auto',
              mx: 'auto',
              mb: 3,
              filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.3))',
            }}
          />
          <Typography
            variant="h2"
            sx={{ color: '#fff', mb: 2, fontSize: { xs: '1.75rem', md: '2.5rem', lg: '2.75rem' }, fontWeight: 800 }}
          >
            Ready to Get Your Number?
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: 'rgba(255,255,255,0.85)',
              fontWeight: 400,
              mb: 5,
              maxWidth: 500,
              mx: 'auto',
              lineHeight: 1.7,
              fontSize: { xs: '1rem', md: '1.15rem' },
            }}
          >
            Join thousands of customers who found their perfect phone number on NumberDepot.
            Start browsing today.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2.5, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              component={Link}
              href="/search"
              variant="contained"
              color="secondary"
              size="large"
              sx={{
                px: 5,
                py: 1.5,
                fontSize: '1.1rem',
                borderRadius: 3,
                boxShadow: '0 4px 24px rgba(229,57,53,0.4)',
                '&:hover': {
                  boxShadow: '0 8px 32px rgba(229,57,53,0.5)',
                },
              }}
            >
              Browse Numbers
            </Button>
            <Button
              component={Link}
              href="/pricing"
              variant="outlined"
              size="large"
              sx={{
                px: 5,
                py: 1.5,
                fontSize: '1.1rem',
                borderRadius: 3,
                color: '#fff',
                borderColor: 'rgba(255,255,255,0.35)',
                '&:hover': {
                  borderColor: '#fff',
                  bgcolor: 'rgba(255,255,255,0.08)',
                },
              }}
            >
              View Pricing
            </Button>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
