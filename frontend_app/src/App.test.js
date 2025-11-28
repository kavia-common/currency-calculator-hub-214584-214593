import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app header title', () => {
  render(<App />);
  const heading = screen.getByText(/Currency Calculator Hub/i);
  expect(heading).toBeInTheDocument();
});

test('renders calculator section placeholder', () => {
  render(<App />);
  const calcPlaceholder = screen.getByText(/Calculator module coming next/i);
  expect(calcPlaceholder).toBeInTheDocument();
});
