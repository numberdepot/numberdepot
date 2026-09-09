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
import StarIcon from '@mui/icons-material/Star';
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

export default function VanityPage() {
  const [featured, setFeatured] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // Without the catch, a failed request left `loading` true forever and the
    // page sat on skeletons, plus an unhandled rejection in the console. The
    // rest of the page is static, so an empty list is a fine fallback.
    api
      .get<PhoneNumber[]>('/search?number_type=vanity&sort=price_asc&limit=15')
      .then((res) => {
        if (!cancelled) setFeatured(res.data || []);
      })
      .catch((err) => {
        console.error('[Vanity] Failed to load featured numbers:', err);
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
      <Box sx={{ background: 'linear-gradient(135deg, #8B5E00 0%, #6B4700 100%)', color: '#fff', py: { xs: 6, md: 10 } }}>
        <Container maxWidth="lg">
          <Typography variant="h3" sx={{ fontWeight: 900, mb: 2, color: '#fff' }}>Vanity Numbers</Typography>
          <Typography variant="h6" sx={{ color: '#fff', maxWidth: 600, mb: 4, fontWeight: 400 }}>
            Make your phone number spell your brand. Vanity numbers are proven to increase recall by up to 84% and boost call volume.
          </Typography>
          <Button component={Link} href="/search?number_type=vanity" variant="contained" color="secondary" size="large" endIcon={<ArrowForwardIcon />}>
            Browse All Vanity Numbers
          </Button>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 8 } }}>
        {/* What are vanity numbers */}
        <Grid container spacing={6} sx={{ mb: 8 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 2 }}>What Are Vanity Numbers?</Typography>
            <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.8 }}>
              Vanity numbers are phone numbers that spell out a word or phrase using the letters on a telephone keypad.
              For example, <strong>1-800-FLOWERS</strong> translates to 1-800-356-9377.
            </Typography>
            <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.8 }}>
              These numbers are powerful marketing tools because they&apos;re easy to remember.
              Studies show customers are 84% more likely to remember a vanity number compared to a standard numeric one.
            </Typography>
            <Typography variant="body1" sx={{ lineHeight: 1.8 }}>
              Whether you&apos;re in real estate, legal services, home repair, or any industry,
              a vanity number gives your business instant credibility and memorability.
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ p: 4, bgcolor: '#FFF8E1', border: '2px solid #FFB300' }}>
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 3, color: '#8B5E00' }}>
                <StarIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Why Vanity Numbers Work
              </Typography>
              {[
                { stat: '84%', desc: 'higher recall rate vs. numeric numbers' },
                { stat: '58%', desc: 'more calls generated from advertising' },
                { stat: '3x', desc: 'better ROI on print and radio ads' },
                { stat: '75%', desc: 'of businesses report increased inquiries' },
              ].map((item) => (
                <Box key={item.desc} sx={{ display: 'flex', alignItems: 'baseline', gap: 2, mb: 2 }}>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: '#E53935', minWidth: 60 }}>{item.stat}</Typography>
                  <Typography variant="body1">{item.desc}</Typography>
                </Box>
              ))}
            </Card>
          </Grid>
        </Grid>

        {/* Featured Vanity Numbers */}
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Available Vanity Numbers</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Premium vanity numbers that spell out memorable words and phrases.
        </Typography>

        <Grid container spacing={2}>
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
                  <Skeleton height={150} sx={{ borderRadius: 2 }} />
                </Grid>
              ))
            : featured.map((num) => (
                <Grid key={num.id} size={{ xs: 12, sm: 6, md: 4 }}>
                  <Card variant="outlined" sx={{ '&:hover': { borderColor: '#FFB300', boxShadow: 3 }, transition: '0.2s' }}>
                    <CardActionArea component={Link} href={`/numbers/${num.id}`} sx={{ p: 3 }}>
                      {num.vanityText && (
                        <Typography variant="h5" sx={{ fontWeight: 900, color: '#8B5E00', mb: 0.5 }}>
                          {num.vanityText}
                        </Typography>
                      )}
                      <Typography variant="body1" sx={{ fontFamily: 'monospace', color: 'text.secondary', mb: 1.5 }}>
                        {num.number}
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Chip label={num.areaCode} size="small" variant="outlined" />
                        <Typography variant="h6" sx={{ fontWeight: 800, color: 'secondary.main' }}>
                          ${num.salePrice.toLocaleString()}
                        </Typography>
                      </Box>
                      {num.isPremium && <Chip label="Premium" size="small" color="warning" sx={{ mt: 1.5, fontWeight: 600 }} />}
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
        </Grid>
      </Container>
    </Box>
  );
}
