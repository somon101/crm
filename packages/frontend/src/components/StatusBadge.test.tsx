import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge, TemperatureBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('renders the status name', () => {
    render(
      <StatusBadge
        status={{
          id: '1',
          key: 'NEW',
          name: 'Новый',
          order: 1,
          color: '#000',
          isWon: false,
          isLost: false,
          isDefault: true,
          isActive: true,
        }}
      />,
    );
    expect(screen.getByText('Новый')).toBeInTheDocument();
  });
});

describe('TemperatureBadge', () => {
  it('renders a known temperature in Russian', () => {
    render(<TemperatureBadge temperature="HOT" />);
    expect(screen.getByText('Горячий')).toBeInTheDocument();
  });

  it('falls back to the raw value for an unknown temperature', () => {
    render(<TemperatureBadge temperature="SOMETHING_NEW" />);
    expect(screen.getByText('SOMETHING_NEW')).toBeInTheDocument();
  });
});
