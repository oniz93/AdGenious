import React, { useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import theme from '../theme';

interface ThemeProviderProps {
  children: React.ReactNode;
}

// Create a custom ThemeProvider that properly handles the Emotion cache
const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Create a new cache instance inside the component to ensure it's created only once
  const cache = useMemo(() => {
    return createCache({
      key: 'css',
      prepend: true,
    });
  }, []);

  return (
    <CacheProvider value={cache}>
      <MuiThemeProvider theme={theme}>
        {children}
      </MuiThemeProvider>
    </CacheProvider>
  );
};

export default ThemeProvider;
