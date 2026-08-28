'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import StorefrontIcon from '@mui/icons-material/Storefront';
import InventoryIcon from '@mui/icons-material/Inventory';
import SyncAltIcon from '@mui/icons-material/SyncAlt';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import SaveIcon from '@mui/icons-material/Save';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import { api } from '@/lib/api';
import { useSnackbar } from '@/lib/snackbar';

interface NbStatus {
  numberbarn: {
    apiStatus: 'connected' | 'error' | 'no_token';
    apiMessage: string;
    hasToken: boolean;
    markup: number;
    sampleCount: number;
  };
  inventory: {
    total: number;
    available: number;
    sold: number;
    reserved: number;
  };
}

interface SearchResult {
  id: string;
  number: string;
  areaCode: string;
  numberType: string;
  salePrice: number;
  source: string;
  description: string;
  fulfillmentDays?: number;
}

export default function AdminNumberBarnPage() {
  const [status, setStatus] = useState<NbStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchAreaCode, setSearchAreaCode] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchDone, setSearchDone] = useState(false);
  const [nbPage, setNbPage] = useState(0);
  const [nbRowsPerPage, setNbRowsPerPage] = useState(25);
  const [nbHasMore, setNbHasMore] = useState(false);
  const [nbTotalFetched, setNbTotalFetched] = useState(0);
  const [apiToken, setApiToken] = useState('');
  const [savingToken, setSavingToken] = useState(false);
  const { showSnackbar } = useSnackbar();
  // Keep track of current search params for pagination
  const searchParamsRef = useRef<{ areaCode?: string; search?: string }>({});

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<NbStatus>('/admin/numberbarn');
      if (res.data) setStatus(res.data);
    } catch {
      showSnackbar('Failed to load NumberBarn status', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const fetchPage = useCallback(async (page: number, rowsPerPage: number) => {
    const params = searchParamsRef.current;
    if (!params.areaCode && !params.search) return;
    setSearching(true);
    try {
      const res = await api.post<{ results: SearchResult[]; count: number; hasMore: boolean }>('/admin/numberbarn', {
        areaCode: params.areaCode,
        search: params.search,
        page: page + 1, // API is 1-based
        rowsPerPage,
      });
      setSearchResults(res.data?.results || []);
      setNbHasMore(res.data?.hasMore ?? false);
      // Track how far we've seen: if this page is full and has more, we know at least (page+1)*rowsPerPage exist
      setNbTotalFetched(prev => {
        const thisPageEnd = (page + 1) * rowsPerPage;
        return Math.max(prev, res.data?.hasMore ? thisPageEnd + 1 : thisPageEnd - rowsPerPage + (res.data?.count || 0));
      });
      setSearchDone(true);
    } catch {
      showSnackbar('Search failed', 'error');
    } finally {
      setSearching(false);
    }
  }, [showSnackbar]);

  const handleTestSearch = async () => {
    if (!searchAreaCode && !searchTerm) {
      showSnackbar('Enter area code or search term', 'warning');
      return;
    }
    searchParamsRef.current = {
      areaCode: searchAreaCode || undefined,
      search: searchTerm || undefined,
    };
    setNbPage(0);
    setNbTotalFetched(0);
    setSearchDone(false);
    await fetchPage(0, nbRowsPerPage);
  };

  const handleSaveToken = async () => {
    if (!apiToken.trim()) {
      showSnackbar('Enter an API token', 'warning');
      return;
    }
    setSavingToken(true);
    try {
      await api.put('/admin/settings', { numberbarnApiToken: apiToken.trim() });
      showSnackbar('API token saved! Refreshing status...', 'success');
      setApiToken('');
      await fetchStatus();
    } catch {
      showSnackbar('Failed to save token', 'error');
    } finally {
      setSavingToken(false);
    }
  };

  const getStatusIcon = (s: string) => {
    switch (s) {
      case 'connected': return <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 28 }} />;
      case 'error': return <ErrorIcon sx={{ color: '#f44336', fontSize: 28 }} />;
      default: return <WarningIcon sx={{ color: '#ff9800', fontSize: 28 }} />;
    }
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'connected': return '#4caf50';
      case 'error': return '#f44336';
      default: return '#ff9800';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
        <CircularProgress sx={{ color: '#002664' }} />
      </Box>
    );
  }

  const nb = status?.numberbarn;
  const inv = status?.inventory;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a1a2e' }}>
            NumberBarn Integration
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            NumberBarn is an external phone number marketplace. When enabled, customer searches show your own inventory first, and fill in with NumberBarn&apos;s 54M+ numbers when needed. Configure API keys and markup % here.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchStatus}
          sx={{ textTransform: 'none', borderColor: '#ccc', color: '#666', borderRadius: 2 }}
        >
          Refresh Status
        </Button>
      </Box>

      {/* How it works */}
      <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>How Hybrid Search Works</Typography>
        <Typography variant="body2">
          When a buyer searches for numbers, we first check <strong>your inventory</strong> (numbers you uploaded).
          If inventory results are less than the page limit, we <strong>automatically fetch more from NumberBarn</strong> to
          fill the results. NumberBarn numbers get your <strong>{nb?.markup || 15}% markup</strong> applied on top of their price.
          At checkout, NumberBarn numbers are purchased via their API and fulfilled in ~3 days.
        </Typography>
      </Alert>

      {/* API Token Configuration */}
      <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <VpnKeyIcon sx={{ color: nb?.hasToken ? '#4caf50' : '#ff9800', fontSize: 22 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              API Token
            </Typography>
            <Chip
              label={nb?.hasToken ? 'Configured' : 'Not Set'}
              size="small"
              sx={{
                fontSize: '0.7rem',
                fontWeight: 700,
                bgcolor: nb?.hasToken ? '#4caf5018' : '#ff980018',
                color: nb?.hasToken ? '#4caf50' : '#ff9800',
              }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {nb?.hasToken
              ? 'Token is configured. Search and purchase APIs are active. You can update the token below.'
              : 'Search works without a token, but to purchase numbers from NumberBarn at checkout, you need an API token.'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <TextField
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              placeholder={nb?.hasToken ? 'Enter new token to replace current...' : 'Paste your NumberBarn API token...'}
              size="small"
              type="password"
              sx={{ flex: 1, maxWidth: 450 }}
            />
            <Button
              variant="contained"
              size="small"
              startIcon={savingToken ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
              onClick={handleSaveToken}
              disabled={savingToken || !apiToken.trim()}
              sx={{
                bgcolor: '#002664',
                '&:hover': { bgcolor: '#001a45' },
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              {savingToken ? 'Saving...' : nb?.hasToken ? 'Update Token' : 'Save Token'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Status Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* API Status */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                {getStatusIcon(nb?.apiStatus || 'no_token')}
                <Typography variant="body2" color="text.secondary">API Status</Typography>
              </Box>
              <Chip
                label={nb?.apiStatus === 'connected' ? 'Connected' : nb?.apiStatus === 'error' ? 'Error' : 'No Token'}
                size="small"
                sx={{
                  bgcolor: getStatusColor(nb?.apiStatus || 'no_token') + '18',
                  color: getStatusColor(nb?.apiStatus || 'no_token'),
                  fontWeight: 700,
                  fontSize: '0.8rem',
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                {nb?.apiMessage}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Markup */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <TrendingUpIcon sx={{ color: '#002664', fontSize: 28 }} />
                <Typography variant="body2" color="text.secondary">Markup</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#002664' }}>
                {nb?.markup || 15}%
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Applied on NumberBarn prices. Edit in Settings.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Inventory Available */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <InventoryIcon sx={{ color: '#4BA0A1', fontSize: 28 }} />
                <Typography variant="body2" color="text.secondary">Your Inventory</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#4BA0A1' }}>
                {(inv?.available || 0).toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                {inv?.sold || 0} sold, {inv?.reserved || 0} reserved, {inv?.total || 0} total
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* NumberBarn Pool */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <StorefrontIcon sx={{ color: '#E53935', fontSize: 28 }} />
                <Typography variant="body2" color="text.secondary">NumberBarn Pool</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#E53935' }}>
                54M+
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Available as overflow when your inventory is low
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search Flow Diagram */}
      <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Search Flow
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[
              { label: 'Buyer Searches', color: '#002664', sub: 'Area code, vanity, etc.' },
              { label: 'Your Inventory', color: '#4BA0A1', sub: `${inv?.available || 0} numbers` },
              { label: 'Results < Limit?', color: '#ff9800', sub: 'Check if enough' },
              { label: 'NumberBarn API', color: '#E53935', sub: '54M+ numbers' },
              { label: 'Merged Results', color: '#84BD00', sub: 'Markup applied' },
            ].map((step, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    textAlign: 'center',
                    px: 2.5,
                    py: 1.5,
                    borderRadius: 2,
                    bgcolor: step.color + '12',
                    border: `2px solid ${step.color}30`,
                    minWidth: 130,
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 700, color: step.color, fontSize: '0.85rem' }}>
                    {step.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {step.sub}
                  </Typography>
                </Box>
                {i < 4 && (
                  <SyncAltIcon sx={{ color: '#ccc', fontSize: 20 }} />
                )}
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* Test Search */}
      <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
            Test NumberBarn Search
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Search NumberBarn&apos;s database directly to see what numbers are available. Results shown with your markup applied.
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <TextField
              label="Area Code"
              placeholder="e.g. 212, 310, 858"
              value={searchAreaCode}
              onChange={(e) => setSearchAreaCode(e.target.value)}
              size="small"
              sx={{ width: 160 }}
            />
            <TextField
              label="Vanity Search"
              placeholder="e.g. ROOF, POOL, TAXI"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              sx={{ width: 200 }}
            />
            <Button
              variant="contained"
              startIcon={searching ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
              onClick={handleTestSearch}
              disabled={searching}
              sx={{
                bgcolor: '#002664',
                '&:hover': { bgcolor: '#001a45' },
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 2,
                px: 3,
              }}
            >
              {searching ? 'Searching...' : 'Test Search'}
            </Button>
          </Box>

          {searchDone && (
            <>
              <Divider sx={{ mb: 2 }} />
              {searchResults.length === 0 && nbPage === 0 ? (
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  No results found. {!status?.numberbarn.hasToken ? 'NumberBarn API token is not configured.' : 'Try a different area code or search term.'}
                </Alert>
              ) : (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Showing {nbPage * nbRowsPerPage + 1}–{nbPage * nbRowsPerPage + searchResults.length} numbers from NumberBarn (markup applied)
                    </Typography>
                    {searching && <CircularProgress size={16} />}
                  </Box>
                  <TableContainer sx={{ maxHeight: 520, opacity: searching ? 0.5 : 1, transition: 'opacity 0.2s' }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Number</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Area Code</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Price (w/ markup)</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Location</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Fulfillment</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {searchResults.map((r) => (
                          <TableRow key={r.id} hover>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 700, color: '#002664' }}>
                                {r.number}
                              </Typography>
                            </TableCell>
                            <TableCell>{r.areaCode}</TableCell>
                            <TableCell>
                              <Chip label={r.numberType} size="small" sx={{ fontSize: '0.7rem' }} />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 700, color: '#4BA0A1' }}>
                                ${r.salePrice?.toFixed(2)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {r.description}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={`~${r.fulfillmentDays || 3} days`}
                                size="small"
                                sx={{ fontSize: '0.7rem', bgcolor: '#ff980018', color: '#ff9800' }}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <TablePagination
                    component="div"
                    count={nbHasMore ? -1 : nbTotalFetched}
                    page={nbPage}
                    onPageChange={(_, p) => {
                      setNbPage(p);
                      fetchPage(p, nbRowsPerPage);
                    }}
                    rowsPerPage={nbRowsPerPage}
                    onRowsPerPageChange={(e) => {
                      const newRows = parseInt(e.target.value, 10);
                      setNbRowsPerPage(newRows);
                      setNbPage(0);
                      setNbTotalFetched(0);
                      fetchPage(0, newRows);
                    }}
                    rowsPerPageOptions={[25, 50, 100]}
                    labelDisplayedRows={({ from, to }) =>
                      nbHasMore ? `${from}–${to}` : `${from}–${to} of ${nbTotalFetched}`
                    }
                    slotProps={{
                      actions: {
                        nextButton: { disabled: searching || !nbHasMore },
                        previousButton: { disabled: searching || nbPage === 0 },
                      },
                    }}
                  />
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
