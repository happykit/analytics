import '@testing-library/jest-dom';
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { Thing } from '../src';

describe('it', () => {
  it('renders without crashing', () => {
    render(<Thing />);
    expect(
      screen.queryByText('the snozzberries taste like snozzberries')
    ).toBeInTheDocument();
  });
});
