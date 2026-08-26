'use client';

import Link from 'next/link';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';

export default function Footer() {
  return (
    <Box component="footer" sx={{ bgcolor: '#001a45', color: 'rgba(255,255,255,0.8)', pt: 6, pb: 3 }}>
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          {/* Brand */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ mb: 2 }}>
              <Box
                component="img"
                src="/images/footer-logo.png"
                alt="NumberDepot"
                sx={{ height: 44, width: 'auto' }}
              />
            </Box>
            <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.7, opacity: 0.75 }}>
              The premier marketplace to buy, sell, park, and forward phone numbers.
              Find local, toll-free, and vanity numbers at the best prices.
            </Typography>
          </Grid>

          {/* Quick Links */}
          <Grid size={{ xs: 6, sm: 3, md: 2 }}>
            <Typography variant="subtitle2" sx={{ color: '#fff', mb: 2, fontWeight: 700 }}>Marketplace</Typography>
            {[
              { label: 'Browse Numbers', href: '/search' },
              { label: 'Toll-Free', href: '/search?type=toll_free' },
              { label: 'Vanity Numbers', href: '/search?type=vanity' },
              { label: 'Local Numbers', href: '/search?type=local' },
            ].map((l) => (
              <Typography key={l.href} variant="body2" sx={{ mb: 0.75 }}>
                <Link href={l.href} style={{ color: 'inherit', textDecoration: 'none' }}>{l.label}</Link>
              </Typography>
            ))}
          </Grid>

          {/* Services */}
          <Grid size={{ xs: 6, sm: 3, md: 2 }}>
            <Typography variant="subtitle2" sx={{ color: '#fff', mb: 2, fontWeight: 700 }}>Services</Typography>
            {[
              { label: 'Pricing Plans', href: '/pricing' },
              { label: 'Number Parking', href: '/number-parking' },
              { label: 'Call Forwarding', href: '/call-forwarding' },
              { label: 'Port Numbers', href: '/port-number' },
              { label: 'Business Lines', href: '/business' },
            ].map((l) => (
              <Typography key={l.label} variant="body2" sx={{ mb: 0.75 }}>
                <Link href={l.href} style={{ color: 'inherit', textDecoration: 'none' }}>{l.label}</Link>
              </Typography>
            ))}
          </Grid>

          {/* Company */}
          <Grid size={{ xs: 6, sm: 3, md: 2 }}>
            <Typography variant="subtitle2" sx={{ color: '#fff', mb: 2, fontWeight: 700 }}>Company</Typography>
            {[
              { label: 'About Us', href: '/about' },
              { label: 'FAQ', href: '/faq' },
              { label: 'Blog', href: '/blog' },
              { label: 'Contact Us', href: '/contact' },
              { label: 'Sell Numbers', href: '/seller/apply' },
            ].map((l) => (
              <Typography key={l.label} variant="body2" sx={{ mb: 0.75 }}>
                <Link href={l.href} style={{ color: 'inherit', textDecoration: 'none' }}>{l.label}</Link>
              </Typography>
            ))}
          </Grid>

          {/* Contact */}
          <Grid size={{ xs: 6, sm: 3, md: 2 }}>
            <Typography variant="subtitle2" sx={{ color: '#fff', mb: 2, fontWeight: 700 }}>Contact</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, minWidth: 0 }}>
              <EmailIcon sx={{ fontSize: 16, opacity: 0.7, flexShrink: 0 }} />
              <Typography variant="body2" sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>support@numberdepot.net</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
              <PhoneIcon sx={{ fontSize: 16, opacity: 0.7, flexShrink: 0 }} />
              <Typography variant="body2" sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>(800) 555-NUMS</Typography>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.1)' }} />

        <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 1 }}>
          <Typography variant="caption" sx={{ opacity: 0.5 }}>
            &copy; {new Date().getFullYear()} NumberDepot. All rights reserved.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Link href="/terms" style={{ color: 'inherit', textDecoration: 'none', fontSize: '0.75rem', opacity: 0.5 }}>Terms</Link>
            <Link href="/privacy" style={{ color: 'inherit', textDecoration: 'none', fontSize: '0.75rem', opacity: 0.5 }}>Privacy</Link>
          </Box>
        </Box>

        <Typography variant="caption" sx={{ display: 'block', textAlign: 'right', mt: 2, opacity: 0.3, fontSize: '0.65rem' }}>
          Developed by{' '}
          <a href="https://www.linkedin.com/in/soumyajit-khan-48517a22a/" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
            Soumyajit
          </a>
        </Typography>
      </Container>
    </Box>
  );
}
