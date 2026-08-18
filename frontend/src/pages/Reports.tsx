import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api, { getErrorMessage } from '../api/client';
import { Campaign } from '../types/campaign';

interface Overview {
  impressions: number;
  clicks: number;
  reach: number;
  spend: number;
  ctr: number;
  cpc: number;
  cpm: number;
  activeCampaigns: number;
  activeAds: number;
}

interface DailyRow {
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
}

interface EntityRow {
  id: string;
  name: string;
  impressions: number;
  clicks: number;
  spend: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

const Reports: React.FC = () => {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [adSets, setAdSets] = useState<EntityRow[]>([]);
  const [ads, setAds] = useState<EntityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = async () => {
    const { data } = await api.get('/api/insights/overview');
    setOverview(data.overview);
  };

  const loadCampaigns = async () => {
    const { data } = await api.get('/api/campaigns');
    setCampaigns(data.campaigns);
    if (data.campaigns.length > 0 && !selectedCampaign) {
      setSelectedCampaign(data.campaigns[0].id);
    }
  };

  const loadCampaignInsights = async (campaignId: string) => {
    const { data } = await api.get(`/api/insights/campaigns/${campaignId}`);
    setDaily(data.insights.daily ?? []);
    setAdSets(data.insights.adSets ?? []);
    setAds(data.insights.ads ?? []);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([loadOverview(), loadCampaigns()]);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedCampaign) {
      loadCampaignInsights(selectedCampaign).catch((err) => setError(getErrorMessage(err)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCampaign]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      await api.post('/api/insights/refresh');
      await Promise.all([loadOverview(), loadCampaigns()]);
      if (selectedCampaign) {
        await loadCampaignInsights(selectedCampaign);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Reports</Typography>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? 'Refreshing…' : 'Refresh insights'}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {overview && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {[
            { label: 'Impressions', value: overview.impressions.toLocaleString() },
            { label: 'Clicks', value: overview.clicks.toLocaleString() },
            { label: 'Reach', value: overview.reach.toLocaleString() },
            { label: 'Spend', value: formatCurrency(overview.spend) },
            { label: 'CTR', value: `${overview.ctr.toFixed(2)}%` },
            { label: 'CPC', value: formatCurrency(overview.cpc) },
            { label: 'CPM', value: formatCurrency(overview.cpm) },
            { label: 'Active campaigns', value: String(overview.activeCampaigns) },
          ].map((metric) => (
            <Grid item xs={6} sm={4} md={3} key={metric.label}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    {metric.label}
                  </Typography>
                  <Typography variant="h6">{metric.value}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <FormControl sx={{ mb: 3, minWidth: 280 }}>
        <InputLabel id="campaign-select-label">Campaign</InputLabel>
        <Select labelId="campaign-select-label" label="Campaign" value={selectedCampaign} onChange={(e) => setSelectedCampaign(e.target.value)}>
          {campaigns.map((campaign) => (
            <MenuItem key={campaign.id} value={campaign.id}>
              {campaign.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {daily.length > 0 ? (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Daily performance
          </Typography>
          <Box sx={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="impressions" stroke="#1877F2" name="Impressions" />
                <Line yAxisId="left" type="monotone" dataKey="clicks" stroke="#42B72A" name="Clicks" />
                <Line yAxisId="right" type="monotone" dataKey="spend" stroke="#F02849" name="Spend" />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </Paper>
      ) : (
        <Alert severity="info" sx={{ mb: 4 }}>
          No performance data yet. Launch a campaign and wait for Meta to report impressions, then refresh.
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Ad sets
          </Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell align="right">Impressions</TableCell>
                  <TableCell align="right">Clicks</TableCell>
                  <TableCell align="right">Spend</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {adSets.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell align="right">{row.impressions.toLocaleString()}</TableCell>
                    <TableCell align="right">{row.clicks.toLocaleString()}</TableCell>
                    <TableCell align="right">{formatCurrency(row.spend)}</TableCell>
                  </TableRow>
                ))}
                {adSets.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4}>No ad set data.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Ads
          </Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell align="right">Impressions</TableCell>
                  <TableCell align="right">Clicks</TableCell>
                  <TableCell align="right">Spend</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ads.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell align="right">{row.impressions.toLocaleString()}</TableCell>
                    <TableCell align="right">{row.clicks.toLocaleString()}</TableCell>
                    <TableCell align="right">{formatCurrency(row.spend)}</TableCell>
                  </TableRow>
                ))}
                {ads.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4}>No ad data.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Reports;
