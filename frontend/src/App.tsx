import React, { useEffect } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import { Provider } from 'react-redux';
import ThemeProvider from './theme/ThemeProvider';
import { store } from './store';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { loadCurrentUser } from './store/slices/authSlice';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import FacebookCallback from './pages/FacebookCallback';
import Dashboard from './pages/Dashboard/Dashboard';
import Campaigns from './pages/Campaigns/Campaigns';
import CampaignDetail from './pages/Campaigns/CampaignDetail';
import AIStudio from './pages/AIStudio';
import Billing from './pages/Billing';
import Settings from './pages/Settings';

const Placeholder = ({ title }: { title: string }) => (
  <div>{title}</div>
);

const Audiences = () => <Placeholder title="Audiences" />;
const Reports = () => <Placeholder title="Reports" />;

function AppInner() {
  const dispatch = useAppDispatch();
  const { token, loading } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (token && !loading) {
      dispatch(loadCurrentUser());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, token]);

  return (
    <ThemeProvider>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/auth/facebook/callback" element={<FacebookCallback />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/campaigns" element={<Campaigns />} />
              <Route path="/campaigns/:campaignId" element={<CampaignDetail />} />
              <Route path="/ai" element={<AIStudio />} />
              <Route path="/audiences" element={<Audiences />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/billing" element={<Billing />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

function App() {
  return (
    <Provider store={store}>
      <AppInner />
    </Provider>
  );
}

export default App;
