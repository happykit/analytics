<a id="nav">
  <img src="https://i.imgur.com/oeUhHfO.png" width="100%" />
</a>

<div align="right">
  <a href="https://happykit.dev/">Website</a>
  <span>&nbsp;•&nbsp;</span>
  <a href="https://twitter.com/happykitdev" target="_blank">Twitter</a>
</div>

&nbsp;
&nbsp;

## `@happykit/analytics`

Analytics specifically designed for Next.js.

Add analytics to your Next.js application with a single React Hook. This package integrates your Next.js application with HappyKit Analytics. Create a free [happykit.dev](https://happykit.dev/signup) account to get started.

## Installation

Add the package to your project

```sh
npm install @happykit/analytics
```

Set up a `pages/_app.js` file with this content:

```js
import { useAnalytics } from '@happykit/analytics';

function MyApp({ Component, pageProps }) {
  // Track page views
  useAnalytics({ publicKey: 'HAPPYKIT KEY' });

  return <Component {...pageProps} />;
}

export default MyApp;
```

> Get your _HappyKit Key_ by creating a free account on [happykit.dev](https://happykit.dev/signup).

You can read more about using a custom `_app.js` component [here](https://nextjs.org/docs/advanced-features/custom-app).
