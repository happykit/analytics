import '@testing-library/jest-dom';
import * as React from 'react';
import { render, screen } from '../jest/test-utils';
import useAnalytics, { Analytics } from '../src';

// navigator.sendBeacon is not defined in jsdom, so the
// useAnalytics function will always send page views direclty through fetch.

type PageViewBody = { publicKey: string; views: Analytics[] };

beforeEach(() => {
  global.fetch = jest.fn();
});

declare var fetch: jest.Mock<any, any>;
declare var navigator: Navigator & {
  sendBeacon: jest.Mock<any, any>;
};

function parseBody(
  mockContext: jest.MockContext<any, any>['calls'][0]
): PageViewBody {
  return JSON.parse(mockContext[1].body);
}

describe('when called without a publicKey', () => {
  // Silence error message logging, while keeping other logs alive
  let err = console.error;
  beforeEach(() => {
    console.error = jest.fn();
  });
  afterEach(() => {
    console.error = err;
  });
  it('shoud throw an error', () => {
    function TestComponent() {
      useAnalytics({ publicKey: '' });
      return null;
    }

    expect.assertions(1);

    expect(() => {
      render(<TestComponent />);
    }).toThrowError('@happykit/analytics: missing options.publicKey');
  });
});

describe('when using fetch', () => {
  it('calls the api', async () => {
    function TestComponent() {
      useAnalytics({ publicKey: 'pk_test', skipHostnames: [] });
      return <p>content</p>;
    }

    render(<TestComponent />, {
      router: { pathname: '/[place]', asPath: '/home' },
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      'https://happykit.dev/api/pv',
      expect.objectContaining({
        body: expect.any(String),
      })
    );

    const body = parseBody(fetch.mock.calls[0]);
    expect(body.publicKey).toEqual('pk_test');

    expect(body.views).toHaveLength(1);

    const view = body.views[0];
    expect(view.hostname).toBe('localhost');
    expect(view.pathname).toBe('/home');
    expect(view.route).toBe('/[place]');
    expect(view.ua).toMatch(/jsdom/);
    expect(typeof view.timeZone).toBe('string');
    expect(view.referrer).toBe('');
    expect(view.referrerHostname).toBe(undefined);
    expect(view.referrerPathname).toBe(undefined);
    expect(view.urlReferrer).toBe(undefined);
    expect(typeof view.time).toBe('number');

    const content = await screen.findByText('content');
    expect(content).toBeInTheDocument();
  });

  it('accepts a custom apiRoute', async () => {
    function TestComponent() {
      useAnalytics({
        apiRoute: '/foo',
        publicKey: 'pk_test',
        skipHostnames: [],
      });
      return null;
    }

    render(<TestComponent />);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      '/foo',
      expect.objectContaining({ body: expect.any(String) })
    );

    const body = parseBody(fetch.mock.calls[0]);
    expect(body.publicKey).toEqual('pk_test');
  });

  it('accepts a custom apiRoute', async () => {
    function TestComponent() {
      useAnalytics({
        apiRoute: '/foo',
        publicKey: 'pk_test',
        skipHostnames: [],
      });
      return null;
    }

    render(<TestComponent />, {
      router: { pathname: '/home', route: '/home', asPath: '/' },
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      '/foo',
      expect.objectContaining({ body: expect.any(String) })
    );

    const body = parseBody(fetch.mock.calls[0]);
    expect(body.publicKey).toEqual('pk_test');
  });

  it('respects the given skip function', async () => {
    const skip = jest.fn(() => true);
    function TestComponent() {
      useAnalytics({
        apiRoute: '/foo',
        publicKey: 'pk_test',
        skipHostnames: [],
        skip,
      });
      return null;
    }

    render(<TestComponent />);

    expect(skip).toHaveBeenCalledTimes(1);
    expect(skip).toHaveBeenCalledWith(
      expect.objectContaining({
        hostname: 'localhost',
        pathname: '/',
        referrer: '',
        referrerHostname: undefined,
        referrerPathname: undefined,
        route: '/',
        time: expect.any(Number),
        timeZone: expect.any(String),
        ua: expect.any(String),
        unique: expect.any(Boolean),
        urlReferrer: undefined,
        width: expect.any(Number),
      })
    );
    expect(fetch).toHaveBeenCalledTimes(0);
  });

  it('should not call the api from localhost', async () => {
    function TestComponent() {
      // note that skipHostnames defaults to ["localhost"],
      // and the request should thus be skipped
      useAnalytics({ publicKey: 'pk_test' });
      return null;
    }

    render(<TestComponent />);
    expect(fetch).toHaveBeenCalledTimes(0);
  });
});

// const delay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

describe('when using navigator.sendBeacon', () => {
  let n: typeof global.navigator.sendBeacon;
  beforeEach(() => {
    n = global.navigator.sendBeacon;
    global.navigator.sendBeacon = jest.fn();
  });
  afterEach(() => {
    global.navigator.sendBeacon = n;
  });

  it('calls the api', async () => {
    jest.useFakeTimers();

    function TestComponent() {
      useAnalytics({ publicKey: 'pk_test', skipHostnames: [] });
      return null;
    }

    render(<TestComponent />);

    // not called yet because it gets queued
    expect(navigator.sendBeacon).toHaveBeenCalledTimes(0);
    jest.runAllTimers();

    // called now because we forwarded the timers
    expect(navigator.sendBeacon).toHaveBeenCalledTimes(1);

    expect(navigator.sendBeacon).toHaveBeenCalledWith(
      'https://happykit.dev/api/pv',
      expect.any(String)
    );

    const body: PageViewBody = JSON.parse(
      navigator.sendBeacon.mock.calls[0][1]
    );
    expect(body.views).toHaveLength(1);
    expect(body.publicKey).toBe('pk_test');
    const view = body.views[0];
    expect(view).toEqual(
      expect.objectContaining({
        hostname: 'localhost',
        pathname: '/',
        referrer: '',
        route: '/',
        time: expect.any(Number),
        timeZone: expect.any(String),
        ua: expect.any(String),
        unique: expect.any(Boolean),
        width: expect.any(Number),
      })
    );
    expect(view).not.toHaveProperty('referrerHostname');
    expect(view).not.toHaveProperty('referrerPathname');
    expect(view).not.toHaveProperty('urlReferrer');

    // never called because we're using navigator.sendBeacon
    expect(fetch).toHaveBeenCalledTimes(0);
  });
});
