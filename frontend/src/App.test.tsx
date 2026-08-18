import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { store } from './store';
import Login from './pages/Login';

describe('Login page', () => {
  it('renders the sign in form', () => {
    render(
      <Provider store={store}>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </Provider>
    );
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
  });
});
