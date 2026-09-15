import { fireEvent, render, screen } from '@testing-library/react';
import GameCard from './GameCard';

const game = { id: 7, title: 'Portal', description: 'Puzzle game', imageUrl: '', releaseDate: '2007-10-10' };

test('shows the game title and fallback image', () => {
  render(<GameCard game={game} onEdit={jest.fn()} onDelete={jest.fn()} />);
  expect(screen.getByRole('heading', { name: 'Portal' })).toBeInTheDocument();
  expect(screen.getByText('No Image')).toBeInTheDocument();
});

test('passes the game to edit and its id to delete', () => {
  const onEdit = jest.fn();
  const onDelete = jest.fn();
  render(<GameCard game={game} onEdit={onEdit} onDelete={onDelete} />);
  fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
  fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
  expect(onEdit).toHaveBeenCalledWith(game);
  expect(onDelete).toHaveBeenCalledWith(7);
});
