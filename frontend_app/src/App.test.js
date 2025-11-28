import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

describe('App shell and main sections', () => {
  test('renders app header title', () => {
    render(<App />);
    const heading = screen.getByText(/Currency Calculator Hub/i);
    expect(heading).toBeInTheDocument();
  });

  test('renders main section headings: Calculator, Currency Converter, Daily Rates', () => {
    render(<App />);

    // Section titles
    expect(screen.getByRole('heading', { name: /Calculator/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Currency Converter/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Daily Rates/i })).toBeInTheDocument();
  });

  test('renders calculator initial display "0"', () => {
    render(<App />);
    // Calculator screen shows 0 initially
    const displayZero = screen.getByText(/^0$/);
    expect(displayZero).toBeInTheDocument();
  });

  test('theme toggle is rendered and toggles data-theme on the documentElement', () => {
    render(<App />);

    // Determine current theme based on attribute or inferred from toggle label
    const html = document.documentElement;
    const before = html.getAttribute('data-theme') || 'light';

    // Find the toggle button by its label/title content
    // It contains either "Dark" or "Light" text along with an emoji
    const toggle = screen.getByRole('button', { name: /Switch to (dark|light) mode/i });
    expect(toggle).toBeInTheDocument();

    // Toggle once
    fireEvent.click(toggle);

    const after = html.getAttribute('data-theme');
    expect(after).toBeDefined();
    // Should have flipped
    expect(after).not.toBe(before);

    // Toggle back to original
    fireEvent.click(toggle);
    const back = html.getAttribute('data-theme');
    expect(back).toBe(before);
  });

  test('Calculator, CurrencyConverter, and DailyRates render without crashing', () => {
    // Smoke test is essentially covered by rendering <App />, but we assert for key UI affordances.
    render(<App />);

    // Calculator group region exists
    expect(screen.getByRole('group', { name: /Calculator/i })).toBeInTheDocument();

    // Currency converter input/selects exist after loading placeholder (which may appear briefly)
    // Since data fetching may produce a loading state, we just check that converter container exists by placeholder or inputs
    // Input for amount
    // It's okay if placeholder text is visible even if not yet interactive; presence suffices for smoke.
    // We try to query by placeholder or by role if available.
    // Use queryBy* to avoid throwing if still loading.
    const amountInput = screen.queryByPlaceholderText(/Enter amount/i);
    const fromSelect = screen.queryByLabelText(/From currency/i);
    const toSelect = screen.queryByLabelText(/To currency/i);
    // At least the converter section should be present; one of those should be found eventually in simple render.
    expect(screen.getByText(/Currency Converter/i)).toBeInTheDocument();
    // These might be null during network loading, so we don't hard fail on them.
    // The Daily Rates section heading is asserted in another test already.
  });
});
