'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Divider from '@mui/material/Divider';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Alert from '@mui/material/Alert';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import { api } from '@/lib/api';
import { useSnackbar } from '@/lib/snackbar';

interface NumberForm {
  number: string;
  areaCode: string;
  numberType: string;
  vanityText: string;
  basePrice: string;
  monthlyPrice: string;
  isVanity: boolean;
  isTollFree: boolean;
  isPremium: boolean;
  minimumOffer: string;
  listingTitle: string;
  listingDescription: string;
  category: string;
  tags: string;
}

const initialForm: NumberForm = {
  number: '',
  areaCode: '',
  numberType: 'local',
  vanityText: '',
  basePrice: '',
  monthlyPrice: '',
  isVanity: false,
  isTollFree: false,
  isPremium: false,
  minimumOffer: '',
  listingTitle: '',
  listingDescription: '',
  category: '',
  tags: '',
};

export default function AdminAddNumberPage() {
  const [form, setForm] = useState<NumberForm>(initialForm);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof NumberForm, string>>>({});

  const { showSnackbar } = useSnackbar();
  const router = useRouter();

  const handleChange = (field: keyof NumberForm) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [field]: e.target.value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: undefined });
    }
  };

  const handleSwitch = (field: keyof NumberForm) => (
    _: React.ChangeEvent<HTMLInputElement>,
    checked: boolean
  ) => {
    setForm({ ...form, [field]: checked });
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof NumberForm, string>> = {};
    if (!form.number.trim()) newErrors.number = 'Phone number is required';
    if (!form.areaCode.trim()) newErrors.areaCode = 'Area code is required';
    if (form.basePrice && parseFloat(form.basePrice) < 0) newErrors.basePrice = 'Price cannot be negative';
    if (form.monthlyPrice && parseFloat(form.monthlyPrice) < 0) newErrors.monthlyPrice = 'Price cannot be negative';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        number: form.number.trim(),
        areaCode: form.areaCode.trim(),
        numberType: form.numberType,
        vanityText: form.vanityText.trim() || undefined,
        basePrice: form.basePrice ? parseFloat(form.basePrice) : 0,
        monthlyPrice: form.monthlyPrice ? parseFloat(form.monthlyPrice) : 0,
        flags: {
          isVanity: form.isVanity,
          isTollFree: form.isTollFree,
          isPremium: form.isPremium,
        },
        allowOffers: true,
        minimumOffer: form.minimumOffer ? parseFloat(form.minimumOffer) : undefined,
        listing: {
          title: form.listingTitle.trim() || undefined,
          description: form.listingDescription.trim() || undefined,
          category: form.category.trim() || undefined,
          tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
        },
      };

      await api.post('/numbers/admin', payload);
      showSnackbar('Number added successfully', 'success');
      router.push('/admin/numbers');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add number';
      showSnackbar(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/admin/numbers')}
          sx={{ color: '#002664', textTransform: 'none' }}
        >
          Back to Numbers
        </Button>
      </Box>

      <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a1a2e', mb: 0.5 }}>
        Add Platform Number
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        Add a new phone number to the platform inventory
      </Typography>

      <Card sx={{ borderRadius: 3, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <CardContent sx={{ p: 4 }}>
          {/* Number Details */}
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a1a2e', mb: 2 }}>
            Number Details
          </Typography>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Phone Number"
                placeholder="e.g. (800) 555-1234"
                value={form.number}
                onChange={handleChange('number')}
                error={!!errors.number}
                helperText={errors.number}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Area Code"
                placeholder="e.g. 800"
                value={form.areaCode}
                onChange={handleChange('areaCode')}
                error={!!errors.areaCode}
                helperText={errors.areaCode}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                label="Number Type"
                value={form.numberType}
                onChange={handleChange('numberType')}
                fullWidth
              >
                <MenuItem value="local">Local</MenuItem>
                <MenuItem value="toll-free">Toll-Free</MenuItem>
                <MenuItem value="vanity">Vanity</MenuItem>
                <MenuItem value="premium">Premium</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Vanity Text"
                placeholder="e.g. 1-800-FLOWERS"
                value={form.vanityText}
                onChange={handleChange('vanityText')}
                fullWidth
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 4 }} />

          {/* Pricing */}
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a1a2e', mb: 2 }}>
            Pricing
          </Typography>
          <Alert severity="info" sx={{ mb: 3 }}>
            All inventory numbers are <strong>Offer Only</strong> — buyers will see &quot;Make an Offer&quot; instead of a fixed price. Prices below are for internal reference only and are not shown to buyers.
          </Alert>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Reference Price ($)"
                type="number"
                placeholder="Optional"
                value={form.basePrice}
                onChange={handleChange('basePrice')}
                error={!!errors.basePrice}
                helperText={errors.basePrice || 'Internal only — not shown to buyers'}
                fullWidth
                slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Monthly Price ($)"
                type="number"
                placeholder="Optional"
                value={form.monthlyPrice}
                onChange={handleChange('monthlyPrice')}
                error={!!errors.monthlyPrice}
                helperText={errors.monthlyPrice || 'Internal only — not shown to buyers'}
                fullWidth
                slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 4 }} />

          {/* Flags */}
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a1a2e', mb: 2 }}>
            Flags
          </Typography>
          <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={form.isVanity}
                  onChange={handleSwitch('isVanity')}
                  sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#E53935' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#E53935' } }}
                />
              }
              label="Vanity Number"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={form.isTollFree}
                  onChange={handleSwitch('isTollFree')}
                  sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#84BD00' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#84BD00' } }}
                />
              }
              label="Toll-Free"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={form.isPremium}
                  onChange={handleSwitch('isPremium')}
                  sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#002664' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#002664' } }}
                />
              }
              label="Premium"
            />
          </Box>

          <Divider sx={{ my: 4 }} />

          {/* Offer Settings */}
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a1a2e', mb: 2 }}>
            Offer Settings
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            All inventory numbers are offer-only. Buyers will submit offers which you can accept, counter, or decline from the admin panel.
          </Typography>
          <Box sx={{ maxWidth: 300 }}>
            <TextField
              label="Minimum Offer ($)"
              type="number"
              placeholder="No minimum"
              value={form.minimumOffer}
              onChange={handleChange('minimumOffer')}
              fullWidth
              size="small"
              slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
              helperText="Minimum amount buyers can offer. Leave empty for no minimum."
            />
          </Box>

          <Divider sx={{ my: 4 }} />

          {/* Listing Details */}
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a1a2e', mb: 2 }}>
            Listing Details (Optional)
          </Typography>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Listing Title"
                placeholder="e.g. Premium Toll-Free Number"
                value={form.listingTitle}
                onChange={handleChange('listingTitle')}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Listing Description"
                placeholder="Describe this number..."
                value={form.listingDescription}
                onChange={handleChange('listingDescription')}
                multiline
                rows={3}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Category"
                placeholder="e.g. Business, Personal"
                value={form.category}
                onChange={handleChange('category')}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Tags (comma-separated)"
                placeholder="e.g. vanity, premium, toll-free"
                value={form.tags}
                onChange={handleChange('tags')}
                fullWidth
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 4 }} />

          {/* Actions */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => router.push('/admin/numbers')}
              sx={{ borderColor: '#ccc', color: '#666', textTransform: 'none' }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSubmit}
              disabled={saving}
              sx={{
                bgcolor: '#002664',
                '&:hover': { bgcolor: '#001a45' },
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 2,
                px: 4,
              }}
            >
              {saving ? 'Adding Number...' : 'Add Number'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
