import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import { CreditCard as CreditCardIcon, Facebook as FacebookIcon } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loadCurrentUser } from '../store/slices/authSlice';

const Settings: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    dispatch(loadCurrentUser());
  }, [dispatch]);

  const checkoutStatus = searchParams.get('checkout');

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Settings
      </Typography>

      {checkoutStatus === 'success' && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Payment successful! Your credits have been added.
        </Alert>
      )}
      {checkoutStatus === 'cancelled' && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Checkout was cancelled. No charges were made.
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h5" sx={{ mb: 2 }}>
                Profile
              </Typography>
              <Stack spacing={1}>
                <Typography variant="body1">
                  <strong>Email:</strong> {user?.email}
                </Typography>
                <Typography variant="body1">
                  <strong>Name:</strong> {user?.name ?? '—'}
                </Typography>
                <Typography variant="body1">
                  <strong>Credits:</strong> {user?.credits ?? 0}
                </Typography>
                <Typography variant="body1">
                  <strong>Facebook connected:</strong>{' '}
                  {user?.facebookConnected ? (
                    <FacebookIcon fontSize="small" sx={{ verticalAlign: 'middle', color: '#1877F2' }} />
                  ) : (
                    'No'
                  )}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h5" sx={{ mb: 2 }}>
                Billing
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Manage your credits and view purchase history.
              </Typography>
              <Button variant="contained" startIcon={<CreditCardIcon />} onClick={() => navigate('/billing')}>
                Manage billing
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />
      <Typography variant="body2" color="text.secondary">
        Ad account connection and Meta integration settings are available from the campaign and audience views.
      </Typography>
    </Box>
  );
};

export default Settings;
