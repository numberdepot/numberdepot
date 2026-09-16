'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SendIcon from '@mui/icons-material/Send';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const MIN = 10;
const MAX = 2000;

function SuggestionForm() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const source = searchParams.get('from') || '';

  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Pre-fill from the account when signed in; the user can still edit.
  useEffect(() => {
    if (!user) return;
    setForm((f) => ({
      ...f,
      name: f.name || [user.firstName, user.lastName].filter(Boolean).join(' '),
      email: f.email || user.email || '',
    }));
  }, [user]);

  const messageLen = form.message.trim().length;
  const tooShort = messageLen < MIN;
  const tooLong = messageLen > MAX;
  const emailBad = !!form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
  const valid = !tooShort && !tooLong && !emailBad;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/suggestions', {
        name: form.name.trim(),
        email: form.email.trim(),
        message: form.message.trim(),
        source,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <Card sx={{ borderRadius: 3 }}>
        <CardContent sx={{ py: 7, textAlign: 'center' }}>
          <CheckCircleIcon sx={{ fontSize: 64, color: '#84BD00', mb: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
            Thank you!
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 420, mx: 'auto' }}>
            Your suggestion is with our team. Every idea gets read — we really do act on these.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button variant="outlined" onClick={() => { setDone(false); setForm((f) => ({ ...f, message: '' })); setTouched(false); }}>
              Send another
            </Button>
            <Button component={Link} href="/" variant="contained" color="primary">
              Back to home
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ borderRadius: 3 }}>
      <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
        <form onSubmit={submit} noValidate>
          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Your name"
                fullWidth
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                helperText="Optional"
                slotProps={{ htmlInput: { maxLength: 100 } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Email"
                type="email"
                fullWidth
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                error={touched && emailBad}
                helperText={touched && emailBad ? 'That does not look like an email address' : 'Optional — only if you would like a reply'}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label="Your suggestion"
                multiline
                minRows={6}
                fullWidth
                required
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                onBlur={() => setTouched(true)}
                error={touched && (tooShort || tooLong)}
                helperText={
                  touched && tooShort
                    ? `Please write at least ${MIN} characters`
                    : tooLong
                      ? `Please keep it under ${MAX} characters`
                      : `${messageLen} / ${MAX}`
                }
                placeholder="A feature you wish we had, something that confused you, a number type we should stock — anything at all."
              />
            </Grid>
          </Grid>

          <Button
            type="submit"
            variant="contained"
            color="secondary"
            size="large"
            endIcon={<SendIcon />}
            disabled={submitting}
            sx={{ mt: 3, px: 4, py: 1.4, fontWeight: 700 }}
          >
            {submitting ? 'Sending…' : 'Send suggestion'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function SuggestionsPage() {
  return (
    <Box>
      <Box sx={{ background: 'linear-gradient(135deg, #002664 0%, #001a45 100%)', color: '#fff', py: { xs: 5, md: 8 } }}>
        <Container maxWidth="md">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Box sx={{
              width: 56, height: 56, borderRadius: 2, bgcolor: '#E53935',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 24px rgba(229,57,53,0.45)',
            }}>
              <LightbulbIcon sx={{ fontSize: 32, color: '#fff' }} />
            </Box>
            <Typography variant="h3" sx={{ fontWeight: 900, color: '#fff' }}>Any suggestions?</Typography>
          </Box>
          <Typography variant="h6" sx={{ color: '#fff', opacity: 0.85, fontWeight: 400, maxWidth: 600 }}>
            Ellie is all ears. Tell us what would make NumberDepot better — features, pricing,
            number types, anything.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        <Suspense fallback={null}>
          <SuggestionForm />
        </Suspense>
      </Container>
    </Box>
  );
}
