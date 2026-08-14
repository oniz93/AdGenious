import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import ThemeProvider from './theme/ThemeProvider';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard/Dashboard';

// Placeholder components for routes
const Campaigns = () => <div>Campaigns</div>;
const Audiences = () => <div>Audiences</div>;
const Reports = () => <div>Reports</div>;
const Settings = () => <div>Settings</div>;

function App() {
  return (
    <ThemeProvider>
      <CssBaseline />
      <Router>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/audiences" element={<Audiences />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
