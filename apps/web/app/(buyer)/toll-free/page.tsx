'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { api } from '@/lib/api';

interface PhoneNumber {
  id: string;
  number: string;
  areaCode: string;
  numberType: string;
  salePrice: number;
  isPremium: boolean;
  vanityText: string | null;
}

const prefixes = [
  { code: '800', label: '800 Numbers', desc: 'The original toll-free prefix — highest recognition and trust.' },
  { code: '888', label: '888 Numbers', desc: 'Second-most recognized toll-free prefix. Great availability.' },
  { code: '877', label: '877 Numbers', desc: 'Widely recognized with excellent number selection.' },
  { code: '866', label: '866 Numbers', desc: 'Growing popularity with many memorable options.' },
  { code: '855', label: '855 Numbers', desc: 'Newer prefix with strong availability.' },
  { code: '844', label: '844 Numbers', desc: 'Modern toll-free prefix at competitive prices.' },
  { code: '833', label: '833 Numbers', desc: 'Latest toll-free prefix — best selection and value.' },
];

const benefits = [
  'Customers call you for free — removes barriers to contact',
  'Nationwide presence without revealing your location',
  'Professional image for businesses of any size',
  'Easy to remember, especially with vanity options',
  'Port your existing toll-free number to NumberDepot',
  'Includes call forwarding, voicemail, and analytics',
];

export default function TollFreePage() {
  const [featured, setFeatured] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .get<PhoneNumber[]>('/search?number_type=toll_free&sort=featured&limit=8')
      .then((res) => {
        if (!cancelled) setFeatured(res.data || []);
      })
      .catch((err) => {
        console.error('[TollFree] Failed to load featured numbers:', err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Box>
      {/* Hero */}
      <Box sx={{ background: 'linear-gradient(135deg, #1a6b3c 0%, #0e4526 100%)', color: '#fff', py: { xs: 6, md: 10 } }}>
        <Container maxWidth="lg">
          <Typography variant="h3" sx={{ fontWeight: 900, mb: 2, color: '#fff' }}>Toll-Free Numbers</Typography>
          <Typography variant="h6" sx={{ color: '#fff', maxWidth: 600, mb: 4, fontWeight: 400 }}>
            Let your customers call for free. Toll-free numbers build trust and make your business accessible from anywhere in the country.
          </Typography>
          <Button component={Link} href="/search?number_type=toll_free" variant="contained" color="secondary" size="large" endIcon={<ArrowForwardIcon />}>
            Browse All Toll-Free Numbers
          </Button>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 8 } }}>
        {/* Benefits */}
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 3 }}>Why Toll-Free?</Typography>
        <Grid container spacing={2} sx={{ mb: 8 }}>
          {benefits.map((b) => (
            <Grid key={b} size={{ xs: 12, sm: 6 }}>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <CheckCircleIcon sx={{ color: 'success.main', mt: 0.3 }} />
                <Typography variant="body1">{b}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* Prefix Grid */}
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Browse by Prefix</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          All toll-free prefixes are equally functional. 800 numbers carry the most brand recognition.
        </Typography>

        <Grid container spacing={2} sx={{ mb: 8 }}>
          {prefixes.map((p) => (
            <Grid key={p.code} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card variant="outlined" sx={{ height: '100%', '&:hover': { borderColor: 'primary.main', boxShadow: 2 }, transition: '0.2s' }}>
                <CardActionArea component={Link} href={`/search?number_type=toll_free&area_code=${p.code}`} sx={{ p: 3, height: '100%' }}>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main', mb: 0.5 }}>{p.code}</Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>{p.label}</Typography>
                  <Typography variant="body2" color="text.secondary">{p.desc}</Typography>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Featured */}
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 3 }}>Featured Toll-Free Numbers</Typography>
        <Grid container spacing={2}>
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
                <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
                  <Skeleton height={120} sx={{ borderRadius: 2 }} />
                </Grid>
              ))
            : featured.map((num) => (
                <Grid key={num.id} size={{ xs: 12, sm: 6, md: 3 }}>
                  <Card variant="outlined" sx={{ '&:hover': { borderColor: 'secondary.main', boxShadow: 2 }, transition: '0.2s' }}>
                    <CardActionArea component={Link} href={`/numbers/${num.id}`} sx={{ p: 2.5 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{num.number}</Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                        <Chip label={num.areaCode} size="small" variant="outlined" />
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'secondary.main' }}>${num.salePrice}</Typography>
                      </Box>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
        </Grid>
      </Container>
    </Box>
  );
}
