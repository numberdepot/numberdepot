'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Pagination from '@mui/material/Pagination';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import InputAdornment from '@mui/material/InputAdornment';
import Skeleton from '@mui/material/Skeleton';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Autocomplete from '@mui/material/Autocomplete';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import StarIcon from '@mui/icons-material/Star';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import CloseIcon from '@mui/icons-material/Close';
import { api, ApiResponse } from '@/lib/api';
import { useCart } from '@/lib/cart';
import { useAuth } from '@/lib/auth';
import { useSnackbar } from '@/lib/snackbar';

interface PhoneNumber {
  id: string;
  number: string;
  numberType: string;
  areaCode: string;
  salePrice?: number;
  basePrice?: number;
  licensePrice?: number;
  monthlyPrice?: number;
  setupFee?: number;
  vanityText?: string;
  isPremium?: boolean;
  isPortable?: boolean;
  listingId?: string;
  source?: 'inventory' | 'numberbarn';
  fulfillmentDays?: number;
  rawNumber?: string;
  numberbarnTn?: string;
  offerOnly?: boolean;
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

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { addItem } = useCart();
  const { showSnackbar } = useSnackbar();

  const [numbers, setNumbers] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const hasInitialFilters = !!(searchParams.get('area_code') || searchParams.get('number_type') || searchParams.get('price_min') || searchParams.get('price_max'));
  const [showFilters, setShowFilters] = useState(hasInitialFilters);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  const [areaCodes, setAreaCodes] = useState<{ code: string; count: number }[]>([]);
  const [areaCodesLoaded, setAreaCodesLoaded] = useState(false);

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [areaCode, setAreaCode] = useState(searchParams.get('area_code') || '');
  const [numberType, setNumberType] = useState(searchParams.get('number_type') || '');
  const [priceMin, setPriceMin] = useState(searchParams.get('price_min') || '');
  const [priceMax, setPriceMax] = useState(searchParams.get('price_max') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || '');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);

  // Sync state when URL params change (e.g. navigating from /local area code chips)
  useEffect(() => {
    setQuery(searchParams.get('q') || '');
    setAreaCode(searchParams.get('area_code') || '');
    setNumberType(searchParams.get('number_type') || '');
    setPriceMin(searchParams.get('price_min') || '');
    setPriceMax(searchParams.get('price_max') || '');
    setSort(searchParams.get('sort') || '');
    setPage(Number(searchParams.get('page')) || 1);
  }, [searchParams]);

  const fetchNumbers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (areaCode) params.set('area_code', areaCode);
      if (numberType) params.set('number_type', numberType);
      if (priceMin) params.set('price_min', priceMin);
      if (priceMax) params.set('price_max', priceMax);
      if (sort) params.set('sort', sort);
      params.set('page', String(page));
      params.set('limit', '24');

      const res: ApiResponse<PhoneNumber[]> = await api.get(`/search?${params.toString()}`);
      setNumbers(res.data || []);
      setTotalPages(res.pagination?.totalPages || 1);
      setTotalResults(res.pagination?.total || 0);
    } catch {
      showSnackbar('Failed to load numbers', 'error');
    } finally {
      setLoading(false);
    }
  }, [query, areaCode, numberType, priceMin, priceMax, sort, page, showSnackbar]);

  useEffect(() => {
    fetchNumbers();
  }, [fetchNumbers]);

  const fetchAreaCodes = () => {
    if (areaCodesLoaded) return;
    api.get<{ code: string; count: number }[]>('/numbers/area-codes')
      .then((res) => {
        setAreaCodes(res.data || []);
        setAreaCodesLoaded(true);
      })
      .catch(() => {});
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (areaCode) params.set('area_code', areaCode);
    if (numberType) params.set('number_type', numberType);
    if (priceMin) params.set('price_min', priceMin);
    if (priceMax) params.set('price_max', priceMax);
    if (sort) params.set('sort', sort);
    router.push(`/search?${params.toString()}`);
  };

  const handleAddToCart = async (num: PhoneNumber) => {
    if (!user) {
      showSnackbar('Please log in to add items to your cart', 'warning');
      router.push('/login');
      return;
    }
    if (!num.listingId) {
      showSnackbar('This number is not available for purchase', 'error');
      return;
    }
    setAddingToCart(num.id);
    try {
      await addItem(num.id, num.listingId, 'park', {
        number: num.number,
        numberType: num.numberType,
        price: num.salePrice || num.basePrice || 0,
        setupFee: num.setupFee ?? 9.99,
        monthlyFee: num.monthlyPrice || 0,
        source: num.source || 'inventory',
        numberbarnTn: num.numberbarnTn,
        rawNumber: num.rawNumber,
      });
      showSnackbar(`${formatPhone(num.number)} added to cart!`, 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add to cart';
      showSnackbar(msg === 'Number is no longer available' ? msg : 'Failed to add to cart', 'error');
    } finally {
      setAddingToCart(null);
    }
  };

  const clearFilters = () => {
    setQuery('');
    setAreaCode('');
    setNumberType('');
    setPriceMin('');
    setPriceMax('');
    setSort('');
    setPage(1);
    router.push('/search');
  };

  const hasActiveFilters = areaCode || numberType || priceMin || priceMax;

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '80vh' }}>
      {/* Search Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #002664 0%, #001a45 100%)',
          py: { xs: 2.5, md: 3 },
          pb: { xs: 3, md: 3.5 },
        }}
      >
        <Container maxWidth="lg">
          <Typography
            variant="h4"
            sx={{ color: '#fff', mb: 2, fontWeight: 800, textAlign: 'center', fontSize: { xs: '1.5rem', md: '1.75rem' } }}
          >
            Browse Phone Numbers
          </Typography>
          <Box
            component="form"
            onSubmit={handleSearch}
            sx={{
              display: 'flex',
              gap: 1.5,
              maxWidth: 700,
              mx: 'auto',
              flexDirection: { xs: 'column', sm: 'row' },
            }}
          >
            <TextField
              fullWidth
              placeholder="Search by number, area code, or keyword..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              size="small"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{
                bgcolor: '#fff',
                borderRadius: 2,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '& fieldset': { border: 'none' },
                },
              }}
            />
            <Button
              type="submit"
              variant="contained"
              color="secondary"
              sx={{ px: 3, minWidth: 100, borderRadius: 2 }}
            >
              Search
            </Button>
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outlined"
              size="small"
              startIcon={<FilterListIcon />}
              sx={{
                color: '#fff',
                borderColor: 'rgba(255,255,255,0.4)',
                '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.08)' },
                minWidth: 100,
                borderRadius: 2,
              }}
            >
              Filters {hasActiveFilters ? '(on)' : ''}
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Filters Panel — outside the gradient, on white background */}
      <Collapse in={showFilters}>
        <Box sx={{ bgcolor: '#fff', borderBottom: '1px solid', borderColor: 'divider', boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
          <Container maxWidth="lg" sx={{ py: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FilterListIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Filters</Typography>
              </Box>
              <IconButton size="small" onClick={() => setShowFilters(false)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
            <Grid container spacing={2.5} sx={{ alignItems: 'flex-end' }}>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Autocomplete
                  freeSolo
                  options={areaCodes}
                  getOptionLabel={(option) =>
                    typeof option === 'string'
                      ? option
                      : `${option.code} (${option.count} numbers)`
                  }
                  inputValue={areaCode}
                  onInputChange={(_, value) => setAreaCode(value)}
                  onOpen={fetchAreaCodes}
                  onChange={(_, value) => {
                    if (value && typeof value !== 'string') {
                      setAreaCode(value.code);
                    } else if (typeof value === 'string') {
                      setAreaCode(value);
                    } else {
                      setAreaCode('');
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Area Code"
                      placeholder="e.g. 212"
                      size="small"
                    />
                  )}
                  size="small"
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={numberType}
                    onChange={(e) => setNumberType(e.target.value)}
                    label="Type"
                  >
                    <MenuItem value="">All Types</MenuItem>
                    <MenuItem value="local">Local</MenuItem>
                    <MenuItem value="toll-free">Toll-Free</MenuItem>
                    <MenuItem value="vanity">Vanity</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 6, sm: 2 }}>
                <TextField
                  fullWidth
                  label="Min Price"
                  type="number"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  size="small"
                  slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 2 }}>
                <TextField
                  fullWidth
                  label="Max Price"
                  type="number"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  size="small"
                  slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 2 }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    color="secondary"
                    fullWidth
                    onClick={handleSearch}
                    sx={{ borderRadius: 2 }}
                  >
                    Apply
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={clearFilters}
                    sx={{ minWidth: 'auto', px: 2, borderRadius: 2 }}
                  >
                    Clear
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Container>
        </Box>
      </Collapse>

      {/* Results */}
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Toolbar */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Typography variant="body1" color="text.secondary">
            {loading
              ? 'Searching...'
              : `${totalResults} number${totalResults !== 1 ? 's' : ''} found`}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {hasActiveFilters && (
              <Button size="small" startIcon={<CloseIcon />} onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setPage(1);
                }}
                label="Sort By"
              >
                <MenuItem value="">Relevance</MenuItem>
                <MenuItem value="price_asc">Price: Low to High</MenuItem>
                <MenuItem value="price_desc">Price: High to Low</MenuItem>
                <MenuItem value="newest">Newest First</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>

        {/* Number Grid */}
        <Grid container spacing={2.5}>
          {loading
            ? Array.from({ length: 24 }).map((_, i) => (
                <Grid key={i} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                  <Card>
                    <CardContent>
                      <Skeleton width={60} height={24} sx={{ mb: 1 }} />
                      <Skeleton width="80%" height={32} />
                      <Skeleton width={100} height={28} sx={{ mt: 1 }} />
                    </CardContent>
                    <CardActions sx={{ px: 2, pb: 2 }}>
                      <Skeleton width="100%" height={36} />
                    </CardActions>
                  </Card>
                </Grid>
              ))
            : numbers.map((num) => (
                <Grid key={num.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-3px)',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                      },
                    }}
                  >
                    <CardContent sx={{ flex: 1, pb: 1 }}>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1.5 }}>
                        <Chip
                          label={num.numberType}
                          size="small"
                          sx={{
                            bgcolor: getTypeColor(num.numberType) + '18',
                            color: getTypeColor(num.numberType),
                            fontWeight: 700,
                            fontSize: '0.7rem',
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
                            }}
                          />
                        )}
                        {num.source === 'numberbarn' && (
                          <Chip
                            label="NumberBarn"
                            size="small"
                            variant="outlined"
                            sx={{
                              fontWeight: 600,
                              fontSize: '0.65rem',
                              color: '#666',
                              borderColor: '#ccc',
                            }}
                          />
                        )}
                      </Box>
                      <Typography
                        component={Link}
                        href={`/numbers/${num.id}`}
                        variant="h5"
                        sx={{
                          fontWeight: 800,
                          color: 'primary.main',
                          fontSize: '1.1rem',
                          textDecoration: 'none',
                          '&:hover': { color: 'primary.light' },
                          display: 'block',
                        }}
                      >
                        {formatPhone(num.number)}
                      </Typography>
                      {num.vanityText && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                          {num.vanityText}
                        </Typography>
                      )}
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Area Code: {num.areaCode}
                      </Typography>
                      {num.source === 'numberbarn' && num.fulfillmentDays && (
                        <Typography variant="caption" color="text.secondary">
                          ~{num.fulfillmentDays} day{num.fulfillmentDays !== 1 ? 's' : ''} fulfillment
                        </Typography>
                      )}
                      {!num.offerOnly && (
                        <Typography
                          variant="h6"
                          sx={{ mt: 1.5, color: '#84BD00', fontWeight: 700, fontSize: '1.1rem' }}
                        >
                          {num.salePrice
                            ? `$${num.salePrice.toFixed(2)}`
                            : num.licensePrice
                              ? `$${num.licensePrice.toFixed(2)}/mo`
                              : 'Contact Us'}
                        </Typography>
                      )}
                    </CardContent>
                    <CardActions sx={{ px: 2, pb: 2, gap: 1 }}>
                      {num.offerOnly ? (
                        <Button
                          component={Link}
                          href={`/numbers/${num.id}`}
                          variant="contained"
                          size="small"
                          fullWidth
                          startIcon={<LocalOfferIcon sx={{ fontSize: 16 }} />}
                          sx={{
                            background: 'linear-gradient(135deg, #002664 0%, #003a99 100%)',
                            color: '#fff',
                            fontWeight: 700,
                            py: 0.85,
                            '&:hover': {
                              background: 'linear-gradient(135deg, #003a99 0%, #0050cc 100%)',
                              color: '#fff',
                            },
                          }}
                        >
                          Make an Offer
                        </Button>
                      ) : (
                        <>
                          <Button
                            component={Link}
                            href={`/numbers/${num.id}`}
                            variant="outlined"
                            size="small"
                            sx={{ flex: 1 }}
                          >
                            Details
                          </Button>
                          <Button
                            variant="contained"
                            color="secondary"
                            size="small"
                            onClick={() => handleAddToCart(num)}
                            disabled={addingToCart === num.id}
                            startIcon={<AddShoppingCartIcon sx={{ fontSize: 16 }} />}
                            sx={{ flex: 1 }}
                          >
                            {addingToCart === num.id ? 'Adding...' : 'Add'}
                          </Button>
                        </>
                      )}
                    </CardActions>
                  </Card>
                </Grid>
              ))}
        </Grid>

        {/* Empty State */}
        {!loading && numbers.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 10 }}>
            <SearchIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h5" sx={{ mb: 1 }}>
              No numbers found
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Try adjusting your search or filters to find what you are looking for.
            </Typography>
            <Button variant="outlined" onClick={clearFilters}>
              Clear All Filters
            </Button>
          </Box>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, p) => setPage(p)}
              color="primary"
              size="large"
              showFirstButton
              showLastButton
            />
          </Box>
        )}
      </Container>
    </Box>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchPageContent />
    </Suspense>
  );
}
