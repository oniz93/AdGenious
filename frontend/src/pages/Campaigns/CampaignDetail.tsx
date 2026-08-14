import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Edit as EditIcon, RocketLaunch as RocketLaunchIcon } from '@mui/icons-material';
import api, { getErrorMessage } from '../../api/client';
import { AdSet, CampaignDetail as CampaignDetailType } from '../../types/campaign';

const CampaignDetail: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<CampaignDetailType | null>(null);
  const [adSets, setAdSets] = useState<AdSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const [launchMessage, setLaunchMessage] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/api/campaigns/${campaignId}`);
      setCampaign(data.campaign);
      setAdSets(data.adSets);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  const handleLaunch = async () => {
    setLaunching(true);
    setError(null);
    setLaunchMessage(null);
    try {
      await api.post(`/api/campaigns/${campaignId}/launch`);
      setLaunchMessage('Campaign launched to Meta successfully.');
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLaunching(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!campaign) {
    return <Alert severity="error">{error ?? 'Campaign not found'}</Alert>;
  }

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/campaigns')} sx={{ mb: 2 }}>
        Back to campaigns
      </Button>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {launchMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {launchMessage}
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4">{campaign.name}</Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <Chip label={campaign.status} size="small" color="info" />
            <Chip label={campaign.objective.replace('OUTCOME_', '')} size="small" variant="outlined" />
            {campaign.metaCampaignId && <Chip label={`Meta: ${campaign.metaCampaignId}`} size="small" variant="outlined" />}
          </Stack>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<EditIcon />} onClick={() => navigate(`/campaigns/${campaign.id}/wizard`)}>
            Configure
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<RocketLaunchIcon />}
            onClick={handleLaunch}
            disabled={launching || campaign.status === 'active' || campaign.status === 'launching'}
          >
            {launching ? 'Launching…' : 'Launch to Meta'}
          </Button>
        </Stack>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Budget
              </Typography>
              <Typography variant="h6">
                {campaign.dailyBudgetCents
                  ? `$${(campaign.dailyBudgetCents / 100).toFixed(2)} / day`
                  : campaign.lifetimeBudgetCents
                    ? `$${(campaign.lifetimeBudgetCents / 100).toFixed(2)} lifetime`
                    : 'Not set'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Schedule
              </Typography>
              <Typography variant="h6">
                {campaign.startTime ? new Date(campaign.startTime).toLocaleDateString() : 'Starts immediately'}
                {campaign.endTime ? ` → ${new Date(campaign.endTime).toLocaleDateString()}` : ''}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Ad sets
              </Typography>
              <Typography variant="h6">{adSets.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Typography variant="h5" sx={{ mb: 2 }}>
        Ad sets
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Audience</TableCell>
              <TableCell align="right">Est. reach</TableCell>
              <TableCell>Ads</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {adSets.map((adSet) => {
              const targeting = adSet.targeting as Record<string, unknown>;
              const ages = `${targeting.age_min ?? '?'}–${targeting.age_max ?? '?'}`;
              const countries = (targeting.geo_locations as { countries?: string[] } | undefined)?.countries?.join(', ') ?? '';
              return (
                <TableRow key={adSet.id} hover>
                  <TableCell>{adSet.name}</TableCell>
                  <TableCell>
                    <Chip label={adSet.status} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    {ages}
                    {countries ? ` · ${countries}` : ''}
                  </TableCell>
                  <TableCell align="right">
                    {adSet.reachEstimate ? adSet.reachEstimate.toLocaleString() : '—'}
                  </TableCell>
                  <TableCell>{adSet.ads.length}</TableCell>
                </TableRow>
              );
            })}
            {adSets.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  No ad sets yet. Use the campaign wizard to define audiences and creatives.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Divider sx={{ my: 3 }} />

      {adSets.flatMap((adSet) => adSet.ads).length > 0 && (
        <>
          <Typography variant="h5" sx={{ mb: 2 }}>
            Ads
          </Typography>
          <Grid container spacing={2}>
            {adSets.flatMap((adSet) =>
              adSet.ads.map((ad) => (
                <Grid item xs={12} md={6} key={ad.id}>
                  <Card>
                    <CardContent>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                        <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                          {ad.name}
                        </Typography>
                        <Chip label={ad.status} size="small" variant="outlined" />
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {ad.creative.message}
                      </Typography>
                      {ad.creative.imageUrl && (
                        <img
                          src={ad.creative.imageUrl}
                          alt={ad.name}
                          style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 6 }}
                        />
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))
            )}
          </Grid>
        </>
      )}
    </Box>
  );
};

export default CampaignDetail;
