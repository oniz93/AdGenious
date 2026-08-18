import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  AutoAwesome as AutoAwesomeIcon,
  ContentCopy as ContentCopyIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import api, { getErrorMessage } from '../api/client';
import { useAppDispatch } from '../store/hooks';
import { loadCurrentUser } from '../store/slices/authSlice';

interface TextResult {
  type: 'text';
  text: string;
  model: string;
}

interface ImageResult {
  type: 'image';
  images: Array<{ url?: string; b64_json?: string; revisedPrompt?: string }>;
  model: string;
}

const AIStudio: React.FC = () => {
  const dispatch = useAppDispatch();
  const [textPrompt, setTextPrompt] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageCount, setImageCount] = useState(1);
  const [imageSize, setImageSize] = useState('1024x1024');
  const [generating, setGenerating] = useState<'text' | 'image' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [textResults, setTextResults] = useState<TextResult[]>([]);
  const [imageResults, setImageResults] = useState<ImageResult[]>([]);
  const [copied, setCopied] = useState(false);

  const refreshCredits = () => dispatch(loadCurrentUser());

  const handleGenerateText = async () => {
    setGenerating('text');
    setError(null);
    try {
      const { data } = await api.post('/api/ai/generate-text', { prompt: textPrompt });
      setTextResults((prev) => [data.content as TextResult, ...prev]);
      setTextPrompt('');
      refreshCredits();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setGenerating(null);
    }
  };

  const handleGenerateImage = async () => {
    setGenerating('image');
    setError(null);
    try {
      const { data } = await api.post('/api/ai/generate-image', {
        prompt: imagePrompt,
        n: imageCount,
        size: imageSize,
      });
      setImageResults((prev) => [data.content as ImageResult, ...prev]);
      setImagePrompt('');
      refreshCredits();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setGenerating(null);
    }
  };

  const copyText = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 1 }}>
        AI Studio
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Generate ad copy and creative images powered by OpenRouter.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AutoAwesomeIcon color="primary" />
                  <Typography variant="h5">Ad copy generator</Typography>
                </Box>
                <TextField
                  label="Describe your product, offer, or message"
                  multiline
                  minRows={4}
                  value={textPrompt}
                  onChange={(e) => setTextPrompt(e.target.value)}
                  fullWidth
                  placeholder="e.g. Write 3 variations of Facebook ad copy for a summer sale on running shoes, targeting active adults."
                />
                <Button
                  variant="contained"
                  startIcon={<AutoAwesomeIcon />}
                  onClick={handleGenerateText}
                  disabled={!textPrompt.trim() || generating === 'text'}
                >
                  {generating === 'text' ? 'Generating…' : 'Generate copy'}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ImageIcon color="secondary" />
                  <Typography variant="h5">Image generator</Typography>
                </Box>
                <TextField
                  label="Describe the image you want"
                  multiline
                  minRows={3}
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  fullWidth
                  placeholder="e.g. A bright product photo of a modern running shoe on a summer beach background."
                />
                <Stack direction="row" spacing={2}>
                  <Box sx={{ flex: 1 }}>
                    <InputLabel>Number</InputLabel>
                    <Select
                      value={imageCount}
                      onChange={(e) => setImageCount(Number(e.target.value))}
                      fullWidth
                      size="small"
                    >
                      {[1, 2, 3, 4].map((n) => (
                        <MenuItem key={n} value={n}>
                          {n}
                        </MenuItem>
                      ))}
                    </Select>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <InputLabel>Size</InputLabel>
                    <Select
                      value={imageSize}
                      onChange={(e) => setImageSize(e.target.value)}
                      fullWidth
                      size="small"
                    >
                      <MenuItem value="1024x1024">1024×1024</MenuItem>
                      <MenuItem value="1024x1792">1024×1792</MenuItem>
                      <MenuItem value="1792x1024">1792×1024</MenuItem>
                    </Select>
                  </Box>
                </Stack>
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<ImageIcon />}
                  onClick={handleGenerateImage}
                  disabled={!imagePrompt.trim() || generating === 'image'}
                >
                  {generating === 'image' ? 'Generating…' : 'Generate image'}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {generating && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {textResults.length > 0 && (
        <>
          <Divider sx={{ my: 4 }} />
          <Typography variant="h5" sx={{ mb: 2 }}>
            Generated copy
          </Typography>
          <Grid container spacing={2}>
            {textResults.map((result, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Paper sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      {result.model}
                    </Typography>
                    <IconButton size="small" onClick={() => copyText(result.text)}>
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {result.text}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </>
      )}

      {imageResults.length > 0 && (
        <>
          <Divider sx={{ my: 4 }} />
          <Typography variant="h5" sx={{ mb: 2 }}>
            Generated images
          </Typography>
          <Grid container spacing={2}>
            {imageResults.flatMap((result, resultIndex) =>
              result.images.map((image, imageIndex) => (
                <Grid item xs={12} sm={6} md={4} key={`${resultIndex}-${imageIndex}`}>
                  <Paper sx={{ p: 1 }}>
                    {image.b64_json ? (
                      <img
                        src={`data:image/png;base64,${image.b64_json}`}
                        alt={image.revisedPrompt || 'Generated'}
                        style={{ width: '100%', borderRadius: 4 }}
                      />
                    ) : (
                      <img
                        src={image.url}
                        alt={image.revisedPrompt || 'Generated'}
                        style={{ width: '100%', borderRadius: 4 }}
                      />
                    )}
                  </Paper>
                </Grid>
              ))
            )}
          </Grid>
        </>
      )}
    </Box>
  );
};

export default AIStudio;
