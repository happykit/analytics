import '@testing-library/jest-dom';
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { Thing } from '../src';

const server = setupServer(
  rest.get('/api', (_req, res, ctx) => {
    return res(ctx.json({ text: 'the snozzberries taste like snozzberries' }));
  })
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
});
afterAll(() => server.close());

describe('it', () => {
  it('renders without crashing', async () => {
    render(<Thing />);
    const text = await screen.findByText(
      'the snozzberries taste like snozzberries'
    );
    screen.debug();

    expect(text).toBeInTheDocument();
  });
});
