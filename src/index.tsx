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
   * This tells us if this visit is unique. Don’t send this field if you don’t detect unique page views
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

  const subsequent = React.useRef(false);
  // used to set a timer, so we can send page views in batches
  const [latestView, setLatestView] = React.useState<Analytics | null>(null);

  const sendQueue = React.useCallback(() => {
    if (queue.length === 0) return;

    // the splice method clears the current queue and returns its items
    const views = queue.splice(0, queue.length);
    navigator.sendBeacon(apiRoute, JSON.stringify({ publicKey, views }));
  }, [apiRoute, publicKey]);

  // We need to use useRouter instead of Router.events.on("routeChangeComplete")
  // because only useRouter contains the original route, e.g. /[project]/foo
  const router = useRouter();

  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const { current: queue } = React.useRef<Analytics[]>([]);

  // send anything that hasn't been sent yet
  React.useEffect(() => {
    window.addEventListener('beforeunload', sendQueue, { once: true });
    return () => {
      window.removeEventListener('beforeunload', sendQueue);
    };
  }, [sendQueue]);

  // wait at most 5 seconds since the latest page view before sending them
  React.useEffect(() => {
    if (latestView === null) return;

    const timer = window.setTimeout(sendQueue, delay);
    return () => {
      clearTimeout(timer);
    };
  }, [latestView, delay, sendQueue]);

  React.useEffect(() => {
    // Make sure the initial page isn't tracked twice in case query params are
    // present. Next.js will render twice when query params are present on
    // the initial page. The first render will be missing query params for
    // static pages. Such a render is present when pathname doesn't match asPath
    // and when the query is missing.
    if (!mounted) return;

    const unique = (() => {
      // only the first render can be unique
      if (subsequent.current) return false;
      if (document.referrer === '') return true;

      const ref = new URL(document.referrer);
      return ref.hostname !== location.hostname;
    })();

    // mark further navigations as subsequent, so they are not tracked as
    // unique in any case
    subsequent.current = true;

    // the url we are passed looks like /projects?x=5
    // but we are only interested in /projects
    const omitQueryFromPathname = (url: string) => {
      const u = new URL(`http://e.de${url}`);
      return u.pathname;
    };

    const view: Analytics = (() => {
      // avoid tracking site as its own referrer, which happens in case of
      // hot reloading
      const referrer =
        document.referrer &&
        new URL(document.referrer).hostname === location.hostname
          ? ''
          : document.referrer;

      const searchParams = new URLSearchParams(location.search);
      const urlReferrer = searchParams.get('ref') || undefined;
      return {
        hostname: location.hostname,
        // Actual path (excluding the query) shown in the browser
        pathname: omitQueryFromPathname(router.asPath),
        // The Next.js route. That is the path of the page in `/pages`.
        route: router.pathname,
        ua: navigator.userAgent,
        width: window.innerWidth,
        unique,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        referrer,
        urlReferrer,
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
    })();

    // ignore certain page views
    if (
      // skip ignored hostnames
      (Array.isArray(skipHostnames) &&
        skipHostnames.some(
          hostname => hostname.toLowerCase() === view.hostname.toLowerCase()
        )) ||
      // skip events as defined by user
      (typeof skip === 'function' && skip(view))
    ) {
      return;
    }

    const body = JSON.stringify({ publicKey, views: [view] });

    // sendBeacon works even when a browser window is being closed.
    // It's supported in most major browsers. We queue events in case
    // we can use sendBeacon, otherwise we send them live.
    //
    if (typeof navigator.sendBeacon === 'function') {
      queue.push(view);
      setLatestView(view);
    } else {
      // Since sendBeacon sends a plain string, we don't set any
      // content-type headers on this request either.
      //
      // That way the server can parse the request body from a string.
      fetch(apiRoute, { method: 'POST', keepalive: true, body });
    }
  }, [router, mounted]);
}

// this runs on the client only
export const useAnalytics =
  typeof window === 'undefined' ? useAnalyticsServer : useAnalyticsClient;
