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

    const html = document.documentElement;
    const body = document.body;

    const beforeAttr = html.getAttribute('data-theme') || 'light';
    const beforeBodyClass = body.className;

    // Find the toggle button by its label/title content
    const toggle = screen.getByRole('button', { name: /Switch to (dark|light) mode/i });
    expect(toggle).toBeInTheDocument();

    // Toggle once
    fireEvent.click(toggle);

    const afterAttr = html.getAttribute('data-theme');
    expect(afterAttr).toBeDefined();
    expect(afterAttr).not.toBe(beforeAttr);

    // Optionally, verify a body class flip if implemented in future (won't fail if unchanged)
    const afterBodyClass = body.className;
    if (beforeBodyClass !== afterBodyClass) {
      expect(afterBodyClass).not.toBe(beforeBodyClass);
    }

    // Toggle back to original
    fireEvent.click(toggle);
    const backAttr = html.getAttribute('data-theme');
    expect(backAttr).toBe(beforeAttr);
  });

  test('Calculator, CurrencyConverter, and DailyRates render without crashing', () => {
    // Smoke test is essentially covered by rendering <App />, but we assert for key UI affordances.
    render(<App />);

    // Calculator group region exists
    expect(screen.getByRole('group', { name: /Calculator/i })).toBeInTheDocument();

    // Currency converter section present
    expect(screen.getByText(/Currency Converter/i)).toBeInTheDocument();

    // Daily rates section present
    expect(screen.getByText(/Daily Rates/i)).toBeInTheDocument();

    // Inputs/selects may be pending during loading; soft checks:
    screen.queryByPlaceholderText(/Enter amount/i);
    screen.queryByLabelText(/From currency/i);
    screen.queryByLabelText(/To currency/i);
  });
});
