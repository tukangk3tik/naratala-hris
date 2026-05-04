import { describe, it, expect, beforeAll } from 'vitest';
import { useTranslation } from 'react-i18next';
import { render, screen } from '@testing-library/react';
import { i18nReady } from './index.js';

function Probe() {
  const { t, i18n } = useTranslation();
  return (
    <div>
      <div data-testid="lang">{i18n.language}</div>
      <div data-testid="text">{t('nav.employees')}</div>
    </div>
  );
}

describe('i18n', () => {
  beforeAll(async () => {
    await i18nReady;
  });

  it('defaults to id and translates nav.employees → Karyawan', () => {
    render(<Probe />);
    expect(screen.getByTestId('lang').textContent).toBe('id');
    expect(screen.getByTestId('text').textContent).toBe('Karyawan');
  });
});
