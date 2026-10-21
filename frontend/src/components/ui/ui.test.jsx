import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from './Modal.jsx';
import { KpiCard } from './KpiCard.jsx';
import { TextField } from './Field.jsx';
import { StatusBadge } from './Badge.jsx';

describe('Modal', () => {
  test('is labelled, closes on Escape, and renders nothing when closed', async () => {
    const onClose = vi.fn();
    const { rerender } = render(<Modal open title="Edit thing" onClose={onClose}><input aria-label="x" /></Modal>);
    expect(screen.getByRole('dialog', { name: 'Edit thing' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
    rerender(<Modal open={false} title="Edit thing" onClose={onClose} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('KpiCard', () => {
  test('shows a clear message instead of a fake percentage when no comparison exists', () => {
    render(<KpiCard label="Revenue" value="$0.00" delta={null} />);
    expect(screen.getByText(/no previous data/i)).toBeInTheDocument();
    expect(screen.queryByText(/%/)).toBeNull();
  });
  test('shows signed growth when available', () => {
    render(<KpiCard label="Revenue" value="$10.00" delta="12.5" />);
    expect(screen.getByText('+12.5%')).toBeInTheDocument();
  });
});

describe('forms and status', () => {
  test('field errors are announced and linked to the input', () => {
    render(<TextField label="Email" error="Invalid email" value="" onChange={() => {}} />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid email');
    expect(input.getAttribute('aria-describedby')).toBe(screen.getByRole('alert').id);
  });
  test('status badges humanize the status text', () => {
    render(<StatusBadge status="partially_paid" />);
    expect(screen.getByText('Partially paid')).toBeInTheDocument();
  });
});
