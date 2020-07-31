# `@happykit/analytics`

Analytics specifically designed for Next.js.

This package integrates your Next.js application with HappyKit. Create a free [happykit.dev](https://happykit.dev/signup) account to get started.

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
  useAnalytics({ publicKey: 'YOUR HAPYKIT KEY' });

  return <Component {...pageProps} />;
}

export default MyApp;
```

You can read more about using a custom `_app.js` component [here](https://nextjs.org/docs/advanced-features/custom-app).
