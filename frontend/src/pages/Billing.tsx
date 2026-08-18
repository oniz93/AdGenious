import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { loadStripe } from '@stripe/stripe-js';
import api, { getErrorMessage } from '../api/client';

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  description: string;
  price: { amountCents: number; currency: string };
}

interface CreditTransaction {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
}

interface Purchase {
  id: string;
  packageId: string;
  credits: number;
  amountCents: number;
  status: string;
  createdAt: string;
}

const stripePromise = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY)
  : null;

const formatCurrency = (cents: number, currency = 'usd') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);

const Billing: React.FC = () => {
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [history, setHistory] = useState<{ transactions: CreditTransaction[]; purchases: Purchase[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get('/api/billing/packages'),
      api.get('/api/billing/history'),
    ])
      .then(([packagesRes, historyRes]) => {
        setPackages(packagesRes.data.packages);
        setHistory(historyRes.data);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const handleBuy = async (packageId: string) => {
    setBuying(packageId);
    setError(null);
    try {
      const { data } = await api.post('/api/billing/create-checkout-session', { packageId });
      if (stripePromise) {
        const stripe = await stripePromise;
        const result = await stripe?.redirectToCheckout({ sessionId: data.sessionId });
        if (result?.error) {
          setError(result.error.message ?? 'Redirect to checkout failed');
        }
      } else if (data.url) {
        window.location.href = data.url;
      } else {
        setError('Stripe is not configured. Set REACT_APP_STRIPE_PUBLISHABLE_KEY.');
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBuying(null);
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
      <Typography variant="h4" sx={{ mb: 1 }}>
        Billing & Credits
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Purchase credits to generate ad copy and creatives with AI.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {packages.map((pkg) => (
          <Grid item xs={12} sm={6} md={4} key={pkg.id}>
            <Card>
              <CardContent>
                <Typography variant="h5" sx={{ mb: 0.5 }}>
                  {pkg.name}
                </Typography>
                <Typography variant="h4" color="primary" sx={{ mb: 1 }}>
                  {formatCurrency(pkg.price.amountCents, pkg.price.currency)}
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  {pkg.credits.toLocaleString()} credits
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {pkg.description}
                </Typography>
                <Button
                  variant="contained"
                  fullWidth
                  disabled={buying === pkg.id}
                  onClick={() => handleBuy(pkg.id)}
                >
                  {buying === pkg.id ? 'Redirecting…' : 'Buy credits'}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Divider sx={{ mb: 3 }} />

      <Typography variant="h5" sx={{ mb: 2 }}>
        Credit history
      </Typography>
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell align="right">Balance</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(history?.transactions ?? []).map((t) => (
              <TableRow key={t.id}>
                <TableCell>{new Date(t.createdAt).toLocaleString()}</TableCell>
                <TableCell>{t.type}</TableCell>
                <TableCell>{t.description}</TableCell>
                <TableCell align="right" sx={{ color: t.amount >= 0 ? 'success.main' : 'error.main' }}>
                  {t.amount >= 0 ? '+' : ''}{t.amount}
                </TableCell>
                <TableCell align="right">{t.balanceAfter}</TableCell>
              </TableRow>
            ))}
            {(history?.transactions ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>No credit transactions yet.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="h5" sx={{ mb: 2 }}>
        Purchase history
      </Typography>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Package</TableCell>
              <TableCell align="right">Credits</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(history?.purchases ?? []).map((p) => (
              <TableRow key={p.id}>
                <TableCell>{new Date(p.createdAt).toLocaleString()}</TableCell>
                <TableCell>{p.packageId}</TableCell>
                <TableCell align="right">{p.credits}</TableCell>
                <TableCell align="right">{formatCurrency(p.amountCents)}</TableCell>
                <TableCell>{p.status}</TableCell>
              </TableRow>
            ))}
            {(history?.purchases ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>No purchases yet.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default Billing;
