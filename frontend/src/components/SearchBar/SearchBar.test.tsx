import { fireEvent, render, screen } from '@testing-library/react';
import SearchBar from './SearchBar';

test('submits the trimmed search term', () => {
  const onSearch = jest.fn();
  const onReset = jest.fn();
  render(<SearchBar onSearch={onSearch} onReset={onReset} />);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '  Portal  ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));
  expect(onSearch).toHaveBeenCalledWith('Portal');
  expect(onReset).not.toHaveBeenCalled();
});

test('resets a whitespace-only search', () => {
  const onSearch = jest.fn();
  const onReset = jest.fn();
  render(<SearchBar onSearch={onSearch} onReset={onReset} />);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '   ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));
  expect(onReset).toHaveBeenCalledTimes(1);
  expect(onSearch).not.toHaveBeenCalled();
});
