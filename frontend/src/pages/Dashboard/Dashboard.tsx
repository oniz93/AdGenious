import React, { useEffect, useState } from 'react';
import { Alert, Box, Grid, Paper, Skeleton, Typography } from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Campaign as CampaignIcon,
  People as PeopleIcon,
  AttachMoney as AttachMoneyIcon,
  Visibility as VisibilityIcon,
  Mouse as MouseIcon,
} from '@mui/icons-material';
import api, { getErrorMessage } from '../../api/client';

const StatCard = ({ title, value, icon, color }: { title: string; value: string; icon: React.ReactNode; color: string }) => (
  <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', height: 140 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
      <Box
        sx={{
          backgroundColor: `${color}15`,
          borderRadius: '50%',
          p: 1,
          mr: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </Box>
      <Typography variant="h6" color="text.secondary">
        {title}
      </Typography>
    </Box>
    <Typography variant="h4" component="div" sx={{ flexGrow: 1 }}>
      {value}
    </Typography>
  </Paper>
);

interface Overview {
  impressions: number;
  clicks: number;
  reach: number;
  spend: number;
  ctr: number;
  cpc: number;
  activeCampaigns: number;
  activeAds: number;
}

const Dashboard: React.FC = () => {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get('/api/insights/overview')
      .then(({ data }) => setOverview(data.overview))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Box sx={{ flexGrow: 1 }}>
        <Skeleton variant="text" width={200} height={40} sx={{ mb: 4 }} />
        <Grid container spacing={3}>
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <Grid item xs={12} sm={6} md={3} key={item}>
              <Skeleton variant="rounded" height={140} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" sx={{ mb: 4 }}>
        Dashboard
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Campaigns"
            value={String(overview?.activeCampaigns ?? 0)}
            icon={<CampaignIcon sx={{ color: 'primary.main' }} />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Impressions"
            value={(overview?.impressions ?? 0).toLocaleString()}
            icon={<VisibilityIcon sx={{ color: 'info.main' }} />}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Clicks"
            value={(overview?.clicks ?? 0).toLocaleString()}
            icon={<MouseIcon sx={{ color: 'success.main' }} />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Spend"
            value={`$${(overview?.spend ?? 0).toFixed(2)}`}
            icon={<AttachMoneyIcon sx={{ color: 'warning.main' }} />}
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Reach"
            value={(overview?.reach ?? 0).toLocaleString()}
            icon={<PeopleIcon sx={{ color: 'secondary.main' }} />}
            color="secondary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="CTR"
            value={`${(overview?.ctr ?? 0).toFixed(2)}%`}
            icon={<TrendingUpIcon sx={{ color: 'success.main' }} />}
            color="success"
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
