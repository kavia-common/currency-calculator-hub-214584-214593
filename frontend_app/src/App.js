import React, { useEffect, useMemo, useState } from 'react';
import './App.css';
import { getBaseUrl } from './config/env';
import Calculator from './components/Calculator';
import CurrencyConverter from './components/CurrencyConverter';
import DailyRates from './components/DailyRates';

/**
 * Core app shell with Ocean Professional theme.
 * Sections:
 * - Calculator placeholder
 * - Currency converter placeholder
 * - Daily rates placeholder
 * Includes theme toggle with localStorage persistence.
 */

// PUBLIC_INTERFACE
function App() {
  /** Initialize theme from localStorage or system preference */
  const initialTheme = useMemo(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem('theme') : null;
    if (stored === 'light' || stored === 'dark') return stored;
    const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }, []);

  const [theme, setTheme] = useState(initialTheme);

  // Apply theme to <html> and persist
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      window.localStorage.setItem('theme', theme);
    } catch {
      // ignore storage errors
    }
  }, [theme]);

  // PUBLIC_INTERFACE
  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <div className="App">
      {/* App Header */}
      <header className="header container">
        <div className="brand">
          <div className="logo-dot" aria-hidden="true" />
          <div className="brand-text">
            <h1 className="title">Currency Calculator Hub</h1>
            <p className="subtitle">Ocean Professional</p>
          </div>
        </div>

        <div className="header-actions">
          <button
            className="btn btn-ghost"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>
        </div>
      </header>

      {/* Hero / Intro */}
      <section className="container hero">
        <div className="hero-content">
          <h2 className="hero-title">All-in-one currency tools</h2>
          <p className="hero-desc">
            Calculate, convert, and review daily rates in a modern, responsive interface.
          </p>
          <p className="muted" style={{ marginTop: '8px', fontSize: '0.85rem' }}>
            API base: {getBaseUrl()}
          </p>
        </div>
      </section>

      {/* Main Content */}
      <main className="container grid">
        {/* Calculator Module */}
        <section className="card span-2">
          <header className="card-header">
            <h3 className="card-title">Calculator</h3>
            <span className="badge badge-amber">Module</span>
          </header>
          <div className="card-body">
            <Calculator />
          </div>
        </section>

        {/* Currency Converter */}
        <section className="card">
          <header className="card-header">
            <h3 className="card-title">Currency Converter</h3>
            <span className="badge badge-blue">Live</span>
          </header>
          <div className="card-body">
            <CurrencyConverter />
          </div>
        </section>

        {/* Daily Rates */}
        <section className="card">
          <header className="card-header">
            <h3 className="card-title">Daily Rates</h3>
            <span className="badge badge-neutral">Today</span>
          </header>
          <div className="card-body">
            <DailyRates />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="container footer">
        <p className="muted">
          © {new Date().getFullYear()} Currency Calculator Hub • Built with React
        </p>
      </footer>
    </div>
  );
}

export default App;
