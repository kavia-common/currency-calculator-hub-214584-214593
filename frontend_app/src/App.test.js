import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app header title', () => {
  render(<App />);
  const heading = screen.getByText(/Currency Calculator Hub/i);
  expect(heading).toBeInTheDocument();
});

test('renders calculator initial display', () => {
  render(<App />);
  const displayZero = screen.getByText(/^0$/);
  expect(displayZero).toBeInTheDocument();
});
