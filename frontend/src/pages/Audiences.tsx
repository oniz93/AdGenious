import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Slider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import api, { getErrorMessage } from '../api/client';

interface TargetingInterest {
  id: string;
  name: string;
}

interface AdAccount {
  id: string;
  name: string;
  accountStatus: number;
  currency: string;
}

interface SubAudience {
  targeting: Record<string, unknown>;
  reach: number | null;
}

const Audiences: React.FC = () => {
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [adAccountId, setAdAccountId] = useState('');
  const [ageRange, setAgeRange] = useState<number[]>([18, 65]);
  const [genders, setGenders] = useState<number[]>([1, 2]);
  const [countries, setCountries] = useState('');
  const [interests, setInterests] = useState<TargetingInterest[]>([]);
  const [interestOptions, setInterestOptions] = useState<TargetingInterest[]>([]);
  const [subAudiences, setSubAudiences] = useState<SubAudience[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    api
      .get('/api/meta/me')
      .then(({ data }) => {
        setAdAccounts(data.adAccounts ?? []);
        setAdAccountId(data.selectedAdAccountId ?? data.adAccounts?.[0]?.id ?? '');
      })
      .catch(() => {
        // Facebook not connected yet.
      });
  }, []);

  const handleInterestSearch = (value: string) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      if (value.trim().length < 2) {
        setInterestOptions([]);
        return;
      }
      try {
        const { data } = await api.get('/api/meta/targeting/search', { params: { type: 'adinterest', q: value, limit: 20 } });
        setInterestOptions(data.results ?? []);
      } catch {
        setInterestOptions([]);
      }
    }, 350);
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const audience = {
        ageMin: ageRange[0],
        ageMax: ageRange[1],
        genders,
        countries: countries.split(',').map((c) => c.trim().toUpperCase()).filter(Boolean),
        interests: interests.map((i) => ({ id: i.id, name: i.name })),
        publisherPlatforms: ['facebook', 'instagram'],
        facebookPositions: ['feed'],
        instagramPositions: ['stream'],
      };

      const { data } = await api.post('/api/audiences/sub-audiences', { audience, count: 8 });
      const specs: Record<string, unknown>[] = data.subAudiences;

      let withReach: SubAudience[] = specs.map((targeting) => ({ targeting, reach: null }));
      if (adAccountId) {
        withReach = await Promise.all(
          specs.map(async (targeting) => {
            try {
              const estimate = await api.post('/api/audiences/reach-estimate', { adAccountId, targeting });
              return { targeting, reach: estimate.data.estimate?.users ?? null };
            } catch {
              return { targeting, reach: null };
            }
          })
        );
      }
      setSubAudiences(withReach);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 1 }}>
        Audience Builder
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Define a broad audience and let AdGenious split it into high-signal sub-audiences with reach estimates.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel id="ad-account-audience-label">Ad account</InputLabel>
            <Select labelId="ad-account-audience-label" label="Ad account" value={adAccountId} onChange={(e) => setAdAccountId(e.target.value)}>
              {adAccounts.map((account) => (
                <MenuItem key={account.id} value={account.id}>
                  {account.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Typography variant="body2" sx={{ mb: 1 }}>
            Age range: {ageRange[0]} – {ageRange[1]}
          </Typography>
          <Slider value={ageRange} onChange={(_e, value) => setAgeRange(value as number[])} min={13} max={65} valueLabelDisplay="auto" sx={{ mb: 2 }} />

          <FormControlLabel
            control={<Checkbox checked={genders.includes(1)} onChange={(e) => setGenders((prev) => (e.target.checked ? [...prev, 1] : prev.filter((g) => g !== 1)))} />}
            label="Male"
          />
          <FormControlLabel
            control={<Checkbox checked={genders.includes(2)} onChange={(e) => setGenders((prev) => (e.target.checked ? [...prev, 2] : prev.filter((g) => g !== 2)))} />}
            label="Female"
          />

          <TextField
            label="Countries (comma-separated ISO codes)"
            value={countries}
            onChange={(e) => setCountries(e.target.value)}
            fullWidth
            helperText="e.g. US, GB, CA"
            sx={{ mb: 3 }}
          />

          <Autocomplete
            multiple
            options={interestOptions}
            value={interests}
            onChange={(_e, value) => setInterests(value)}
            onInputChange={(_e, value) => handleInterestSearch(value)}
            getOptionLabel={(option) => option.name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            filterOptions={(x) => x}
            renderInput={(params) => <TextField {...params} label="Interests" placeholder="Start typing to search…" />}
            sx={{ mb: 3 }}
          />

          <Button variant="contained" onClick={handleGenerate} disabled={loading || !adAccountId} startIcon={loading ? <CircularProgress size={18} /> : undefined}>
            {loading ? 'Generating…' : 'Generate sub-audiences'}
          </Button>
          {!adAccountId && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Connect an ad account in Settings to generate reach estimates.
            </Typography>
          )}
        </CardContent>
      </Card>

      {subAudiences.length > 0 && (
        <>
          <Typography variant="h5" sx={{ mb: 2 }}>
            Suggested sub-audiences
          </Typography>
          <Stack spacing={1}>
            {subAudiences.map((sub, index) => {
              const targeting = sub.targeting as Record<string, unknown>;
              const ages = `${targeting.age_min ?? '?'}–${targeting.age_max ?? '?'}`;
              const genderList = targeting.genders as number[] | undefined;
              const genderLabel = genderList?.length === 2 ? 'All genders' : genderList?.[0] === 1 ? 'Male' : 'Female';
              const interestNames = (targeting.interests as Array<{ name?: string }> | undefined)?.map((i) => i.name).join(', ') ?? '';
              const countriesList = (targeting.geo_locations as { countries?: string[] } | undefined)?.countries?.join(', ') ?? '';
              return (
                <Paper key={index} variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" fontWeight={600}>
                      Sub-audience {index + 1}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {ages} · {genderLabel}
                      {countriesList ? ` · ${countriesList}` : ''}
                      {interestNames ? ` · ${interestNames}` : ''}
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    variant="outlined"
                    label={sub.reach !== null ? `Est. reach: ${sub.reach.toLocaleString()}` : 'Reach unavailable'}
                  />
                </Paper>
              );
            })}
          </Stack>
        </>
      )}
    </Box>
  );
};

export default Audiences;
