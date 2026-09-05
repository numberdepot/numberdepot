'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocationOnIcon from '@mui/icons-material/LocationOn';

const topics = [
  'General Inquiry',
  'Sales Question',
  'Technical Support',
  'Billing Question',
  'Port Request',
  'Report an Issue',
  'Partnership Inquiry',
];

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', topic: '', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <Box>
      {/* Hero */}
      <Box sx={{ background: 'linear-gradient(135deg, #002664 0%, #001a45 100%)', color: '#fff', py: { xs: 5, md: 8 } }}>
        <Container maxWidth="lg">
          <Typography variant="h3" sx={{ fontWeight: 900, mb: 2 }}>Contact Us</Typography>
          <Typography variant="h6" sx={{ opacity: 0.85, fontWeight: 400 }}>
            Have a question or need help? We&apos;re here for you.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 8 } }}>
        <Grid container spacing={4}>
          {/* Form */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Card variant="outlined" sx={{ p: { xs: 3, md: 5 } }}>
              {submitted ? (
                <Alert severity="success" sx={{ py: 4 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Message Sent!</Typography>
                  <Typography variant="body2">
                    Thank you for reaching out. Our team will get back to you within 1 business day.
                  </Typography>
                </Alert>
              ) : (
                <form onSubmit={handleSubmit}>
                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>Send Us a Message</Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth label="Your Name" required
                        value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth label="Email Address" type="email" required
                        value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        fullWidth select label="Topic" required
                        value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })}
                      >
                        {topics.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        fullWidth multiline rows={5} label="Your Message" required
                        value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
                      />
                    </Grid>
                  </Grid>
                  <Button type="submit" variant="contained" size="large" sx={{ mt: 3 }}>
                    Send Message
                  </Button>
                </form>
              )}
            </Card>
          </Grid>

          {/* Contact Info Sidebar */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card variant="outlined" sx={{ p: 4, mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>Get in Touch</Typography>

              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <EmailIcon sx={{ color: 'primary.main' }} />
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Email</Typography>
                  <Typography variant="body2" color="text.secondary">support@numberdepotinc.com</Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <PhoneIcon sx={{ color: 'primary.main' }} />
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Phone</Typography>
                  <Typography variant="body2" color="text.secondary">(800) 555-NUMS</Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <AccessTimeIcon sx={{ color: 'primary.main' }} />
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Hours</Typography>
                  <Typography variant="body2" color="text.secondary">Mon-Fri: 9am - 6pm ET</Typography>
                  <Typography variant="body2" color="text.secondary">Sat: 10am - 2pm ET</Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <LocationOnIcon sx={{ color: 'primary.main' }} />
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Address</Typography>
                  <Typography variant="body2" color="text.secondary">
                    123 Telecom Way<br />
                    Suite 400<br />
                    New York, NY 10001
                  </Typography>
                </Box>
              </Box>
            </Card>

            <Card sx={{ p: 4, bgcolor: '#E3F2FD' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Need Help Porting?</Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Our porting specialists can walk you through the process from start to finish.
              </Typography>
              <Button variant="outlined" size="small" href="/port-number">
                Learn About Porting
              </Button>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
