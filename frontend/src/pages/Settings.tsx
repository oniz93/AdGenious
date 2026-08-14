import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import {
  CreditCard as CreditCardIcon,
  Facebook as FacebookIcon,
  Instagram as InstagramIcon,
} from '@mui/icons-material';
import api, { API_BASE_URL, getErrorMessage } from '../api/client';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loadCurrentUser } from '../store/slices/authSlice';

interface AdAccount {
  id: string;
  name: string;
  accountStatus: number;
  currency: string;
  timezoneName?: string;
}

interface InstagramAccount {
  id: string;
  username?: string;
  name?: string;
  profilePictureUrl?: string;
  followersCount?: number;
}

const Settings: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAppSelector((state) => state.auth);

  const [metaLoading, setMetaLoading] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [instagramAccounts, setInstagramAccounts] = useState<InstagramAccount[]>([]);
  const [selectedAdAccountId, setSelectedAdAccountId] = useState<string>('');

  useEffect(() => {
    dispatch(loadCurrentUser());
  }, [dispatch]);

  const loadMeta = async () => {
    if (!user?.facebookConnected) return;
    setMetaLoading(true);
    setMetaError(null);
    try {
      const { data } = await api.get('/api/meta/me');
      setAdAccounts(data.adAccounts ?? []);
      setInstagramAccounts(data.instagramAccounts ?? []);
      setSelectedAdAccountId(data.selectedAdAccountId ?? '');
    } catch (err) {
      setMetaError(getErrorMessage(err));
    } finally {
      setMetaLoading(false);
    }
  };

  useEffect(() => {
    loadMeta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.facebookConnected]);

  const handleSelectAdAccount = async (adAccountId: string) => {
    setSelectedAdAccountId(adAccountId);
    try {
      await api.post('/api/meta/select-ad-account', { adAccountId });
      dispatch(loadCurrentUser());
    } catch (err) {
      setMetaError(getErrorMessage(err));
    }
  };

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

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h5" sx={{ mb: 2 }}>
                Meta (Facebook & Instagram) connection
              </Typography>

              {!user?.facebookConnected ? (
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Connect your Facebook account to manage ad accounts, build audiences, and launch campaigns.
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<FacebookIcon />}
                    sx={{ bgcolor: '#1877F2' }}
                    onClick={() => {
                      window.location.href = `${API_BASE_URL}/api/auth/facebook`;
                    }}
                  >
                    Connect Facebook
                  </Button>
                </Box>
              ) : (
                <>
                  {metaError && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {metaError}
                    </Alert>
                  )}
                  {metaLoading ? (
                    <CircularProgress size={24} />
                  ) : (
                    <Stack spacing={3}>
                      <FormControl fullWidth>
                        <InputLabel id="ad-account-label">Active ad account</InputLabel>
                        <Select
                          labelId="ad-account-label"
                          label="Active ad account"
                          value={selectedAdAccountId}
                          onChange={(e) => handleSelectAdAccount(e.target.value)}
                        >
                          {adAccounts.map((account) => (
                            <MenuItem key={account.id} value={account.id}>
                              {account.name} ({account.currency})
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      {adAccounts.length === 0 && (
                        <Alert severity="warning">
                          No ad accounts found. Make sure your Facebook account has access to a Meta Ads Manager account.
                        </Alert>
                      )}

                      <Box>
                        <Typography variant="h6" sx={{ mb: 1 }}>
                          Instagram accounts
                        </Typography>
                        <List dense>
                          {instagramAccounts.map((account) => (
                            <ListItem key={account.id}>
                              <ListItemAvatar>
                                <Avatar src={account.profilePictureUrl}>
                                  <InstagramIcon />
                                </Avatar>
                              </ListItemAvatar>
                              <ListItemText
                                primary={account.username || account.name || account.id}
                                secondary={
                                  account.followersCount !== undefined
                                    ? `${account.followersCount.toLocaleString()} followers`
                                    : undefined
                                }
                              />
                              <Chip size="small" label="Connected" color="success" variant="outlined" />
                            </ListItem>
                          ))}
                          {instagramAccounts.length === 0 && (
                            <Typography variant="body2" color="text.secondary">
                              No Instagram business accounts linked to your pages.
                            </Typography>
                          )}
                        </List>
                      </Box>
                    </Stack>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />
      <Typography variant="body2" color="text.secondary">
        Campaign creation, audience building, and reporting are available from the sidebar.
      </Typography>
    </Box>
  );
};

export default Settings;
