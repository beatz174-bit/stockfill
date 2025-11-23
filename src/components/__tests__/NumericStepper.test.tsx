import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { useState } from 'react';
import { NumericStepper } from '../NumericStepper';

type NumericStepperWrapperProps = {
  initial?: number;
  min?: number;
  label?: string;
};

const NumericStepperWrapper = ({ initial = 2, min = 0, label = 'Quantity' }: NumericStepperWrapperProps) => {
  const [value, setValue] = useState(initial);

  return <NumericStepper label={label} value={value} min={min} onChange={setValue} />;
};

describe('NumericStepper', () => {
  it('does not decrease below the minimum value', async () => {
    const user = userEvent.setup();
    render(<NumericStepperWrapper initial={1} min={1} />);

    const input = screen.getByRole('spinbutton', { name: /quantity/i });
    await user.click(screen.getByRole('button', { name: /decrease quantity/i }));

    expect(input).toHaveValue(1);
  });

  it('increments the value by one when increase is clicked', async () => {
    const user = userEvent.setup();
    render(<NumericStepperWrapper initial={2} min={1} />);

    const input = screen.getByRole('spinbutton', { name: /quantity/i });
    await user.click(screen.getByRole('button', { name: /increase quantity/i }));

    expect(input).toHaveValue(3);
  });

  it('updates the value when a number is typed', async () => {
    const user = userEvent.setup();
    render(<NumericStepperWrapper initial={2} min={1} />);

    const input = screen.getByRole('spinbutton', { name: /quantity/i });
    await user.clear(input);
    await user.type(input, '5');

    expect(input).toHaveValue(5);
  });

  it('sets button aria-labels based on the provided label', () => {
    render(<NumericStepperWrapper label="Items" />);

    expect(screen.getByRole('button', { name: 'decrease Items' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'increase Items' })).toBeInTheDocument();
  });
});
