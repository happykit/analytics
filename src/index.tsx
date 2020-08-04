import * as React from 'react';
import { useRouter } from 'next/router';

export type Analytics = {
  /**
   * The current hostname of the page
   */
  hostname: string;
  /**
   * The current path of the page
   */
  pathname: string;
  /**
   * The Next.js route of the page. That is the path of the page in /pages.
   */
  route: string;
  /**
   * User Agent
   * This is overwritten by the User Agent of the request headers in case they
   * are defined.
   */
  ua?: string;
  /**
   * The viewport width of the device (not possible via server)
   */
  width?: number;
  /**
   * This tells us if this visit is unique.
   */
  unique?: boolean;
  /**
   * The time zone of the current user so we can detect the country
   */
  timeZone?: string;
  /**
   * The full referrer url of the current page (if any)
   */
  referrer?: string;
  /**
   * The referrer hostname of the current page (if any), or the value of ?ref
   */
  referrerHostname?: string;
  /**
   * The referrer pathname of the current page (if any).
   * Undefined in case ?ref was set.
   */
  referrerPathname?: string;
  /**
   * The value of ?ref=... in the URL (more info: https://docs.simpleanalytics.com/how-to-use-url-parameters)
   */
  urlReferrer?: string;
  /**
   * The time when the view occurred. Use Date.now() to set it.
   */
  time: number;
};

export type AnalyticsConfig = {
  /**
   * The public key for this project from happykit.dev.
   */
  publicKey: string;
  apiRoute?: string;
  /**
   * An optional function. Return true to avoid tracking certain page views.
   */
  skip?: (pageView: Analytics) => boolean;
  /**
   * An array of hostnames whose page views will not get tracked.
   *
   * Views from "localhost" are skipped by default. Make sure to readd localhost
   * when you provide your own array. You can provide an empty array to track
   * views from localhost.
   */
  skipHostnames?: string[];
  /**
   * Duration in milliseconds to wait since the last page view before sending
   * page views.
   */
  delay?: number;
};

type AnalyticsReducerState = {
  queue: Analytics[];
  hadFirstPageView: boolean;
  lastPathname: string;
};

type AnalyticsReducerAction =
  | {
      type: 'view';
      payload: Analytics;
    }
  | { type: 'clear'; payload: Analytics[] };

function analyticsReducer(
  state: AnalyticsReducerState,
  action: AnalyticsReducerAction
): AnalyticsReducerState {
  if (action.type === 'view') {
    const view =
      state.hadFirstPageView && action.payload.unique
        ? // subsequent page views can never be unique, so we overwrite it
          { ...action.payload, unique: false }
        : action.payload;

    // Avoid adding duplicate.
    // We should only need this in case a React Fast Refresh happened
    if (view.pathname === state.lastPathname) return state;

    return {
      ...state,
      queue: [...state.queue, view],
      hadFirstPageView: true,
      lastPathname: view.pathname,
    };
  }

  if (action.type === 'clear') {
    return {
      ...state,
      queue: state.queue.filter(view => !action.payload.includes(view)),
    };
  }

  return state;
}

// the url we are passed looks like /projects?x=5
// but we are only interested in /projects
const omitQueryFromPathname = (url: string) => {
  const u = new URL(`http://e.de${url}`);
  return u.pathname;
};

function useAnalyticsServer() {}
function useAnalyticsClient({
  apiRoute = 'https://happykit.dev/api/pv',
  publicKey,
  skip,
  skipHostnames = ['localhost'],
  delay = 5000,
}: AnalyticsConfig) {
  if (!publicKey) {
    throw new Error('@happykit/analytics: missing options.publicKey');
  }
  const router = useRouter();
  const [state, send] = React.useReducer(analyticsReducer, {
    queue: [],
    hadFirstPageView: false,
    lastPathname: '',
  });

  const view = React.useMemo<Analytics>(() => {
    const referrer =
      document.referrer &&
      new URL(document.referrer).hostname === window.location.hostname
        ? ''
        : document.referrer;

    const searchParams = new URLSearchParams(window.location.search);
    const urlReferrer = searchParams.get('ref') || undefined;
    return {
      hostname: window.location.hostname,
      // Actual path (excluding the query) shown in the browser
      pathname: omitQueryFromPathname(router.asPath),
      // The Next.js route. That is the path of the page in `/pages`.
      route: router.pathname,
      ua: navigator.userAgent,
      width: window.innerWidth,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      referrer,
      urlReferrer,
      // This gets overwritten by the reducer, as subsequent page views can
      // never be unique
      unique: (() => {
        if (document.referrer === '') return true;

        const ref = new URL(document.referrer);
        return ref.hostname !== window.location.hostname;
      })(),
      referrerHostname: urlReferrer
        ? urlReferrer
        : referrer
        ? new URL(referrer).hostname
        : undefined,
      referrerPathname: urlReferrer
        ? undefined
        : referrer
        ? new URL(referrer).pathname
        : undefined,
      time: Date.now(),
    };
  }, [router.pathname, router.asPath]);

  const skipped = // skip ignored hostnames
    (Array.isArray(skipHostnames) &&
      skipHostnames.some(
        hostname => hostname.toLowerCase() === view.hostname.toLowerCase()
      )) ||
    // skip events as defined by user
    (typeof skip === 'function' && skip(view));

  React.useEffect(() => {
    if (skipped) return;

    send({ type: 'view', payload: view });
  }, [view, skipped]);

  const queue = state.queue;
  const sendQueue = React.useCallback(() => {
    if (queue.length === 0) return;
    const views = [...queue];

    send({ type: 'clear', payload: views });
    if (typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(apiRoute, JSON.stringify({ publicKey, views }));
    } else {
      const body = JSON.stringify({ publicKey, views });
      // Since sendBeacon sends a plain string, we don't set any
      // content-type headers on this request either.
      //
      // That way the server can parse the request body from a string.
      fetch(apiRoute, { method: 'POST', keepalive: true, body });
    }
  }, [queue, apiRoute, publicKey, send]);

  React.useEffect(() => {
    if (state.queue.length === 0) return;

    const supportsBeacon = typeof navigator.sendBeacon === 'function';
    // sendBeacon works even when a browser window is being closed.
    // It's supported in most major browsers. We queue events in case
    // we can use sendBeacon, otherwise we send them live.
    const adjustedDelay = supportsBeacon ? delay : 0;

    if (!supportsBeacon) {
      sendQueue();
      return;
    }

    const timer = setTimeout(sendQueue, adjustedDelay);

    return () => {
      clearTimeout(timer);
    };
  }, [state, apiRoute, delay, sendQueue]);

  // send anything that hasn't been sent yet
  React.useEffect(() => {
    window.addEventListener('beforeunload', sendQueue, { once: true });
    return () => {
      window.removeEventListener('beforeunload', sendQueue);
    };
  }, [sendQueue]);
}

// this runs on the client only
export const useAnalytics =
  typeof window === 'undefined' ? useAnalyticsServer : useAnalyticsClient;
