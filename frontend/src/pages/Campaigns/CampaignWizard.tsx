import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Slider,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import {
  AutoAwesome as AutoAwesomeIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import api, { getErrorMessage } from '../../api/client';
import { CampaignObjective } from '../../types/campaign';

const steps = ['Objective', 'Audience', 'Creative', 'Budget & Schedule', 'Review'];

const OBJECTIVES: Array<{ value: CampaignObjective; label: string; hint: string }> = [
  { value: 'OUTCOME_AWARENESS', label: 'Awareness', hint: 'Reach the most people' },
  { value: 'OUTCOME_TRAFFIC', label: 'Traffic', hint: 'Send people to your website' },
  { value: 'OUTCOME_ENGAGEMENT', label: 'Engagement', hint: 'Get more likes, comments and shares' },
  { value: 'OUTCOME_LEADS', label: 'Leads', hint: 'Collect contact information' },
  { value: 'OUTCOME_SALES', label: 'Sales', hint: 'Drive purchases and conversions' },
  { value: 'OUTCOME_APP_PROMOTION', label: 'App promotion', hint: 'Get more app installs' },
];

interface TargetingInterest {
  id: string;
  name: string;
  type?: string;
  audienceSize?: number;
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
  included: boolean;
}

const CampaignWizard: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Objective
  const [name, setName] = useState('');
  const [objective, setObjective] = useState<CampaignObjective>('OUTCOME_TRAFFIC');

  // Audience
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [adAccountId, setAdAccountId] = useState('');
  const [ageRange, setAgeRange] = useState<number[]>([18, 65]);
  const [genders, setGenders] = useState<number[]>([1, 2]);
  const [countries, setCountries] = useState('');
  const [interestOptions, setInterestOptions] = useState<TargetingInterest[]>([]);
  const [interests, setInterests] = useState<TargetingInterest[]>([]);
  const [behaviorOptions, setBehaviorOptions] = useState<TargetingInterest[]>([]);
  const [behaviors, setBehaviors] = useState<TargetingInterest[]>([]);
  const [searchingInterests, setSearchingInterests] = useState(false);
  const [searchingBehaviors, setSearchingBehaviors] = useState(false);
  const [subAudiences, setSubAudiences] = useState<SubAudience[]>([]);
  const [generatingAudiences, setGeneratingAudiences] = useState(false);

  // Creative
  const [brandInfo, setBrandInfo] = useState('');
  const [textOptions, setTextOptions] = useState<string[]>([]);
  const [selectedText, setSelectedText] = useState('');
  const [imageOptions, setImageOptions] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [headline, setHeadline] = useState('');
  const [description, setDescription] = useState('');
  const [callToAction, setCallToAction] = useState('LEARN_MORE');
  const [generatingText, setGeneratingText] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);

  // Budget
  const [budgetType, setBudgetType] = useState<'daily' | 'lifetime'>('daily');
  const [budgetAmount, setBudgetAmount] = useState('50');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const interestSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const behaviorSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [campaignResult, metaResult] = await Promise.allSettled([
          api.get(`/api/campaigns/${campaignId}`),
          api.get('/api/meta/me'),
        ]);

        if (campaignResult.status === 'fulfilled') {
          const campaign = campaignResult.value.data.campaign;
          setName(campaign.name);
          setObjective(campaign.objective);
          if (campaign.dailyBudgetCents) {
            setBudgetType('daily');
            setBudgetAmount(String(campaign.dailyBudgetCents / 100));
          } else if (campaign.lifetimeBudgetCents) {
            setBudgetType('lifetime');
            setBudgetAmount(String(campaign.lifetimeBudgetCents / 100));
          }
          if (campaign.startTime) {
            setStartDate(campaign.startTime.slice(0, 10));
          }
          if (campaign.endTime) {
            setEndDate(campaign.endTime.slice(0, 10));
          }
        } else {
          setError('Campaign not found');
        }

        if (metaResult.status === 'fulfilled') {
          const meta = metaResult.value.data;
          setAdAccounts(meta.adAccounts ?? []);
          setAdAccountId(meta.selectedAdAccountId ?? meta.adAccounts?.[0]?.id ?? '');
        }
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [campaignId]);

  const searchTargeting = async (
    type: 'adinterest' | 'adgeolocation' | 'adTargetingCategory',
    query: string,
    setter: (value: TargetingInterest[]) => void,
    setLoading: (value: boolean) => void
  ) => {
    if (query.trim().length < 2) {
      setter([]);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get('/api/meta/targeting/search', {
        params: { type, q: query, limit: 20 },
      });
      setter(data.results ?? []);
    } catch {
      setter([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInterestInput = (value: string) => {
    if (interestSearchTimeout.current) clearTimeout(interestSearchTimeout.current);
    interestSearchTimeout.current = setTimeout(() => {
      searchTargeting('adinterest', value, setInterestOptions, setSearchingInterests);
    }, 350);
  };

  const handleBehaviorInput = (value: string) => {
    if (behaviorSearchTimeout.current) clearTimeout(behaviorSearchTimeout.current);
    behaviorSearchTimeout.current = setTimeout(() => {
      searchTargeting('adTargetingCategory', value, setBehaviorOptions, setSearchingBehaviors);
    }, 350);
  };

  const buildBroadAudience = () => ({
    ageMin: ageRange[0],
    ageMax: ageRange[1],
    genders,
    countries: countries.split(',').map((c) => c.trim().toUpperCase()).filter(Boolean),
    interests: interests.map((i) => ({ id: i.id, name: i.name })),
    behaviors: behaviors.map((b) => ({ id: b.id, name: b.name })),
    publisherPlatforms: ['facebook', 'instagram'],
    facebookPositions: ['feed'],
    instagramPositions: ['stream'],
  });

  const handleGenerateAudiences = async () => {
    setGeneratingAudiences(true);
    setError(null);
    try {
      const { data } = await api.post('/api/audiences/sub-audiences', {
        audience: buildBroadAudience(),
        count: 6,
      });
      const specs: Record<string, unknown>[] = data.subAudiences;

      let withReach: SubAudience[] = specs.map((targeting) => ({ targeting, reach: null, included: true }));
      if (adAccountId) {
        withReach = await Promise.all(
          specs.map(async (targeting) => {
            try {
              const estimate = await api.post('/api/audiences/reach-estimate', { adAccountId, targeting });
              return { targeting, reach: estimate.data.estimate?.users ?? null, included: true };
            } catch {
              return { targeting, reach: null, included: true };
            }
          })
        );
      }
      setSubAudiences(withReach);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setGeneratingAudiences(false);
    }
  };

  const handleGenerateCopy = async () => {
    setGeneratingText(true);
    setError(null);
    try {
      const prompt = `You are an expert direct-response copywriter for Facebook and Instagram ads. Business context: ${brandInfo || 'a generic e-commerce brand'}. Campaign objective: ${objective}. Write 3 short, punchy ad copy variations (primary text) with a clear hook, value proposition, and call to action. Each variation must be 1-3 sentences.`;
      const { data } = await api.post('/api/ai/generate-text', { prompt, n: 3 });
      setTextOptions(data.content.texts ?? []);
      if (data.content.texts?.length) setSelectedText(data.content.texts[0]);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setGeneratingText(false);
    }
  };

  const handleGenerateImage = async () => {
    setGeneratingImage(true);
    setError(null);
    try {
      const prompt = `High-quality advertising creative for Facebook/Instagram feed. ${brandInfo || 'A modern product or lifestyle image'}. Bright, clean, professional, no text overlay.`;
      const { data } = await api.post('/api/ai/generate-image', { prompt, n: 2, size: '1024x1024' });
      const urls = (data.content.images ?? [])
        .map((img: { url?: string; b64_json?: string }) => img.url ?? (img.b64_json ? `data:image/png;base64,${img.b64_json}` : null))
        .filter(Boolean);
      setImageOptions(urls);
      if (urls.length) setSelectedImage(urls[0]);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    setError(null);
    try {
      const budgetCents = Math.round(Number(budgetAmount || 0) * 100);
      const adSets = subAudiences
        .filter((s) => s.included)
        .map((s, index) => ({
          name: `Ad set ${index + 1}`,
          targeting: s.targeting,
          optimizationGoal: objective === 'OUTCOME_SALES' || objective === 'OUTCOME_LEADS' ? 'CONVERSIONS' : 'LINK_CLICKS',
          billingEvent: 'IMPRESSIONS',
          reachEstimate: s.reach ?? undefined,
          subAudienceIndex: index,
          ads: selectedText
            ? [
                {
                  name: `Ad ${index + 1}`,
                  creative: {
                    message: selectedText,
                    headline: headline || undefined,
                    description: description || undefined,
                    linkUrl: linkUrl || 'https://example.com',
                    callToAction: callToAction || undefined,
                    imageUrl: selectedImage || undefined,
                  },
                },
              ]
            : [],
        }));

      await api.put(`/api/campaigns/${campaignId}/configure`, {
        name,
        objective,
        dailyBudgetCents: budgetType === 'daily' ? budgetCents : null,
        lifetimeBudgetCents: budgetType === 'lifetime' ? budgetCents : null,
        startTime: startDate || null,
        endTime: endDate || null,
        adSets,
      });
      navigate(`/campaigns/${campaignId}`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
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
      <Typography variant="h4" sx={{ mb: 3 }}>
        Campaign wizard
      </Typography>
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {activeStep === 0 && (
        <Card>
          <CardContent>
            <Typography variant="h5" sx={{ mb: 2 }}>
              Choose your objective
            </Typography>
            <TextField
              label="Campaign name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              sx={{ mb: 3 }}
            />
            <RadioGroup value={objective} onChange={(e) => setObjective(e.target.value as CampaignObjective)}>
              <Grid container spacing={2}>
                {OBJECTIVES.map((obj) => (
                  <Grid item xs={12} sm={6} md={4} key={obj.value}>
                    <Paper
                      variant="outlined"
                      sx={{ p: 2, borderColor: objective === obj.value ? 'primary.main' : 'divider' }}
                    >
                      <FormControlLabel value={obj.value} control={<Radio />} label={obj.label} />
                      <Typography variant="body2" color="text.secondary">
                        {obj.hint}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {activeStep === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h5" sx={{ mb: 2 }}>
              Define your audience
            </Typography>

            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel id="ad-account-label">Ad account</InputLabel>
              <Select labelId="ad-account-label" label="Ad account" value={adAccountId} onChange={(e) => setAdAccountId(e.target.value)}>
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
            <Slider
              value={ageRange}
              onChange={(_e, value) => setAgeRange(value as number[])}
              min={13}
              max={65}
              valueLabelDisplay="auto"
              sx={{ mb: 2 }}
            />

            <Typography variant="body2" sx={{ mb: 1 }}>
              Genders
            </Typography>
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
              onInputChange={(_e, value) => handleInterestInput(value)}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              filterOptions={(x) => x}
              loading={searchingInterests}
              renderInput={(params) => <TextField {...params} label="Interests" placeholder="Start typing to search…" />}
              sx={{ mb: 3 }}
            />

            <Autocomplete
              multiple
              options={behaviorOptions}
              value={behaviors}
              onChange={(_e, value) => setBehaviors(value)}
              onInputChange={(_e, value) => handleBehaviorInput(value)}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              filterOptions={(x) => x}
              loading={searchingBehaviors}
              renderInput={(params) => <TextField {...params} label="Behaviors" placeholder="Start typing to search…" />}
              sx={{ mb: 3 }}
            />

            <Button
              variant="contained"
              onClick={handleGenerateAudiences}
              disabled={generatingAudiences || !adAccountId}
              startIcon={generatingAudiences ? <CircularProgress size={18} /> : undefined}
            >
              {generatingAudiences ? 'Generating sub-audiences…' : 'Generate sub-audiences & reach estimates'}
            </Button>
            {!adAccountId && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Connect an ad account (Settings) to generate sub-audiences with reach estimates.
              </Typography>
            )}

            {subAudiences.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  Suggested sub-audiences
                </Typography>
                <Stack spacing={1}>
                  {subAudiences.map((sub, index) => {
                    const targeting = sub.targeting as Record<string, unknown>;
                    const ages = `${targeting.age_min ?? '?'}–${targeting.age_max ?? '?'}`;
                    const genderLabel = (targeting.genders as number[])?.includes(1) && (targeting.genders as number[])?.includes(2)
                      ? 'All'
                      : (targeting.genders as number[])?.includes(1)
                        ? 'Male'
                        : 'Female';
                    return (
                      <Paper key={index} variant="outlined" sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Checkbox checked={sub.included} onChange={(e) => setSubAudiences((prev) => prev.map((s, i) => (i === index ? { ...s, included: e.target.checked } : s)))} />
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="body2">
                            {ages} · {genderLabel}
                            {(targeting.interests as Array<{ name?: string }> | undefined)?.length
                              ? ` · ${(targeting.interests as Array<{ name?: string }>).map((i) => i.name).join(', ')}`
                              : ''}
                          </Typography>
                        </Box>
                        <Chip size="small" label={sub.reach !== null ? `Reach: ${sub.reach.toLocaleString()}` : 'Reach unavailable'} variant="outlined" />
                      </Paper>
                    );
                  })}
                </Stack>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {activeStep === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h5" sx={{ mb: 2 }}>
              Create your ad creative
            </Typography>

            <TextField
              label="Brand / product information"
              value={brandInfo}
              onChange={(e) => setBrandInfo(e.target.value)}
              fullWidth
              multiline
              minRows={3}
              helperText="Describe your product, offer, and landing page. Used to generate copy and images."
              sx={{ mb: 3 }}
            />

            <TextField
              label="Landing page URL"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
            />
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <TextField label="Headline" value={headline} onChange={(e) => setHeadline(e.target.value)} fullWidth />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} fullWidth />
              </Grid>
            </Grid>
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel id="cta-label">Call to action</InputLabel>
              <Select labelId="cta-label" label="Call to action" value={callToAction} onChange={(e) => setCallToAction(e.target.value)}>
                <MenuItem value="LEARN_MORE">Learn More</MenuItem>
                <MenuItem value="SHOP_NOW">Shop Now</MenuItem>
                <MenuItem value="SIGN_UP">Sign Up</MenuItem>
                <MenuItem value="SUBSCRIBE">Subscribe</MenuItem>
                <MenuItem value="DOWNLOAD">Download</MenuItem>
              </Select>
            </FormControl>

            <Divider sx={{ mb: 3 }} />

            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                startIcon={<AutoAwesomeIcon />}
                onClick={handleGenerateCopy}
                disabled={generatingText}
              >
                {generatingText ? 'Generating…' : 'Generate ad copy'}
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<AutoAwesomeIcon />}
                onClick={handleGenerateImage}
                disabled={generatingImage}
              >
                {generatingImage ? 'Generating…' : 'Generate images'}
              </Button>
            </Box>

            {textOptions.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  Ad copy variations
                </Typography>
                <RadioGroup value={selectedText} onChange={(e) => setSelectedText(e.target.value)}>
                  <Stack spacing={1}>
                    {textOptions.map((text, index) => (
                      <Paper key={index} variant="outlined" sx={{ p: 1.5 }}>
                        <FormControlLabel value={text} control={<Radio />} label={<Typography variant="body2">{text}</Typography>} />
                      </Paper>
                    ))}
                  </Stack>
                </RadioGroup>
              </Box>
            )}

            {imageOptions.length > 0 && (
              <Box>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  Generated images
                </Typography>
                <RadioGroup value={selectedImage} onChange={(e) => setSelectedImage(e.target.value)}>
                  <Grid container spacing={2}>
                    {imageOptions.map((url, index) => (
                      <Grid item xs={6} md={4} key={index}>
                        <Paper variant="outlined" sx={{ p: 1, textAlign: 'center' }}>
                          <img src={url} alt={`Creative ${index + 1}`} style={{ width: '100%', borderRadius: 6 }} />
                          <FormControlLabel value={url} control={<Radio />} label="Use this" />
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </RadioGroup>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {activeStep === 3 && (
        <Card>
          <CardContent>
            <Typography variant="h5" sx={{ mb: 2 }}>
              Budget & schedule
            </Typography>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="budget-type-label">Budget type</InputLabel>
              <Select labelId="budget-type-label" label="Budget type" value={budgetType} onChange={(e) => setBudgetType(e.target.value as 'daily' | 'lifetime')}>
                <MenuItem value="daily">Daily budget</MenuItem>
                <MenuItem value="lifetime">Lifetime budget</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label={`${budgetType === 'daily' ? 'Daily' : 'Lifetime'} budget (USD)`}
              type="number"
              value={budgetAmount}
              onChange={(e) => setBudgetAmount(e.target.value)}
              fullWidth
              sx={{ mb: 3 }}
            />

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Start date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="End date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {activeStep === 4 && (
        <Card>
          <CardContent>
            <Typography variant="h5" sx={{ mb: 2 }}>
              Review & save
            </Typography>
            <Stack spacing={1} sx={{ mb: 2 }}>
              <Typography><strong>Campaign:</strong> {name}</Typography>
              <Typography><strong>Objective:</strong> {objective.replace('OUTCOME_', '')}</Typography>
              <Typography><strong>Ad sets:</strong> {subAudiences.filter((s) => s.included).length}</Typography>
              <Typography>
                <strong>Budget:</strong> ${Number(budgetAmount || 0).toFixed(2)} {budgetType === 'daily' ? 'per day' : 'lifetime'}
              </Typography>
              <Typography><strong>Creative:</strong> {selectedText ? 'Ready' : 'No copy selected'}</Typography>
            </Stack>

            {subAudiences.filter((s) => s.included).length === 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Generate and include at least one sub-audience in the Audience step.
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button disabled={activeStep === 0} onClick={() => setActiveStep((prev) => prev - 1)}>
          Back
        </Button>
        <Stack direction="row" spacing={2}>
          {activeStep === steps.length - 1 ? (
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSaveDraft}
              disabled={saving || !name.trim()}
            >
              {saving ? 'Saving…' : 'Save draft'}
            </Button>
          ) : (
            <Button variant="contained" onClick={() => setActiveStep((prev) => prev + 1)}>
              Next
            </Button>
          )}
        </Stack>
      </Box>
    </Box>
  );
};

export default CampaignWizard;
