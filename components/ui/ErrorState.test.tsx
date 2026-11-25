import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ErrorState } from './ErrorState';

expect.extend(toHaveNoViolations);

describe('ErrorState', () => {
  it('renders the root element with role="alert"', () => {
    render(<ErrorState message="Something went wrong" />);

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ErrorState message="Something went wrong" />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});