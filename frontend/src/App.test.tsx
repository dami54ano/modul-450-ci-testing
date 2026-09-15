import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./hooks/useGames', () => ({
  useGames: () => ({ games: [], loading: false, error: null,
    fetchGames: jest.fn(), search: jest.fn(), addGame: jest.fn(),
    editGame: jest.fn(), removeGame: jest.fn() }),
}));
jest.mock('./api/steamApi', () => ({
  searchSteamGames: jest.fn(), getSteamGameDetails: jest.fn(),
}));

test('renders the games library heading', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Games Library', level: 1 })).toBeInTheDocument();
});
