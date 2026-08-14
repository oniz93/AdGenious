import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api, { getErrorMessage, TOKEN_STORAGE_KEY } from '../../api/client';
import { User } from '../../types';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  submitting: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem(TOKEN_STORAGE_KEY),
  loading: false,
  submitting: false,
  error: null,
};

export const login = createAsyncThunk(
  'auth/login',
  async (payload: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/api/auth/login', payload);
      localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
      return data as { token: string; user: User };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (payload: { email: string; password: string; name?: string }, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/api/auth/register', payload);
      localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
      return data as { token: string; user: User };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const loadCurrentUser = createAsyncThunk(
  'auth/loadCurrentUser',
  async (_arg, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/api/users/me');
      return data.user as User;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      state.error = null;
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    },
    setToken(state, action: { payload: string }) {
      state.token = action.payload;
      localStorage.setItem(TOKEN_STORAGE_KEY, action.payload);
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.submitting = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
      })
      .addCase(login.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload as string;
      })
      .addCase(register.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.submitting = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
      })
      .addCase(register.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload as string;
      })
      .addCase(loadCurrentUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadCurrentUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(loadCurrentUser.rejected, (state) => {
        state.loading = false;
        state.token = null;
        state.user = null;
      });
  },
});

export const { logout, setToken, clearError } = authSlice.actions;
export default authSlice.reducer;
