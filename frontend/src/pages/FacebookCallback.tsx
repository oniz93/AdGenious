import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material';
import { setToken } from '../store/slices/authSlice';
import { useAppDispatch } from '../store/hooks';

const FacebookCallback: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const params = useMemo(() => new URLSearchParams(window.location.search), []);

  useEffect(() => {
    const token = params.get('token');
    const error = params.get('error');

    if (token) {
      dispatch(setToken(token));
      navigate('/', { replace: true });
    } else if (!error) {
      navigate('/login', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const error = params.get('error');

  if (error) {
    return (
      <Box sx={{ maxWidth: 480, mx: 'auto', mt: 8, p: 2 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Facebook login failed: {error}
        </Alert>
        <Button variant="contained" onClick={() => navigate('/login')}>
          Back to sign in
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 8, gap: 2 }}>
      <CircularProgress />
      <Typography>Completing Facebook sign in…</Typography>
    </Box>
  );
};

export default FacebookCallback;
