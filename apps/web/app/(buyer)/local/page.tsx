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
import PlaceIcon from '@mui/icons-material/Place';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { api } from '@/lib/api';

interface AreaCode {
  code: string;
  city: string;
  state: string;
  count: number;
}

interface PhoneNumber {
  id: string;
  number: string;
  areaCode: string;
  numberType: string;
  salePrice: number;
  isPremium: boolean;
}

const popularCodes = [
  { code: '212', city: 'New York', state: 'NY', tagline: 'The iconic Manhattan area code' },
  { code: '310', city: 'Los Angeles', state: 'CA', tagline: 'Beverly Hills & West LA' },
  { code: '415', city: 'San Francisco', state: 'CA', tagline: 'Silicon Valley gateway' },
  { code: '305', city: 'Miami', state: 'FL', tagline: 'South Beach & South Florida' },
  { code: '312', city: 'Chicago', state: 'IL', tagline: 'The Windy City downtown' },
  { code: '617', city: 'Boston', state: 'MA', tagline: 'Historic New England hub' },
  { code: '702', city: 'Las Vegas', state: 'NV', tagline: 'Entertainment capital' },
  { code: '512', city: 'Austin', state: 'TX', tagline: 'Texas tech corridor' },
  { code: '206', city: 'Seattle', state: 'WA', tagline: 'Pacific Northwest tech hub' },
  { code: '404', city: 'Atlanta', state: 'GA', tagline: 'Gateway to the South' },
  { code: '303', city: 'Denver', state: 'CO', tagline: 'Mile High City' },
  { code: '619', city: 'San Diego', state: 'CA', tagline: "America's finest city" },
];

export default function LocalNumbersPage() {
  const [areaCodes, setAreaCodes] = useState<AreaCode[]>([]);
  const [featured, setFeatured] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // allSettled, not all: one failing request should not blank out the other.
    Promise.allSettled([
      api.get<AreaCode[]>('/numbers/area-codes'),
      api.get<PhoneNumber[]>('/search?number_type=local&sort=featured&limit=8'),
    ])
      .then(([acRes, numRes]) => {
        if (cancelled) return;
        if (acRes.status === 'fulfilled') {
          setAreaCodes(
            (acRes.value.data || []).filter(
              (ac) => !['800', '888', '877', '866', '855', '844', '833'].includes(ac.code)
            )
          );
        } else {
          console.error('[Local] Failed to load area codes:', acRes.reason);
        }
        if (numRes.status === 'fulfilled') {
          setFeatured(numRes.value.data || []);
        } else {
          console.error('[Local] Failed to load featured numbers:', numRes.reason);
        }
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
      <Box sx={{ background: 'linear-gradient(135deg, #002664 0%, #001a45 100%)', color: '#fff', py: { xs: 6, md: 10 } }}>
        <Container maxWidth="lg">
          <Typography variant="h3" sx={{ fontWeight: 900, mb: 2, color: '#fff' }}>Local Phone Numbers</Typography>
          <Typography variant="h6" sx={{ color: '#fff', maxWidth: 600, mb: 4, fontWeight: 400 }}>
            Establish a local presence anywhere in the US. Choose from hundreds of area codes to connect with customers in any city.
          </Typography>
          <Button component={Link} href="/search?number_type=local" variant="contained" color="secondary" size="large" endIcon={<ArrowForwardIcon />}>
            Browse All Local Numbers
          </Button>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 8 } }}>
        {/* Popular Area Codes */}
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Popular Area Codes</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Choose an area code to find available numbers in that region.
        </Typography>

        <Grid container spacing={2} sx={{ mb: 8 }}>
          {popularCodes.map((ac) => (
            <Grid key={ac.code} size={{ xs: 6, sm: 4, md: 3 }}>
              <Card variant="outlined" sx={{ '&:hover': { borderColor: 'primary.main', boxShadow: 2 }, transition: '0.2s' }}>
                <CardActionArea component={Link} href={`/search?area_code=${ac.code}`} sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <PlaceIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>{ac.code}</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{ac.city}, {ac.state}</Typography>
                  <Typography variant="caption" color="text.secondary">{ac.tagline}</Typography>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* All Area Codes */}
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>All Available Area Codes</Typography>
        {loading ? (
          <Skeleton height={100} />
        ) : (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 8 }}>
            {areaCodes.map((ac) => (
              <Chip
                key={ac.code}
                label={`${ac.code} — ${ac.city}${ac.state ? `, ${ac.state}` : ''}`}
                component={Link}
                href={`/search?area_code=${ac.code}`}
                clickable
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
            ))}
          </Box>
        )}

        {/* Featured Local Numbers */}
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>Featured Local Numbers</Typography>
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
                        <Typography variant="body2" color="text.secondary">Area {num.areaCode}</Typography>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'secondary.main' }}>${num.salePrice}</Typography>
                      </Box>
                      {num.isPremium && <Chip label="Premium" size="small" color="warning" sx={{ mt: 1, fontWeight: 600 }} />}
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
        </Grid>
      </Container>
    </Box>
  );
}
