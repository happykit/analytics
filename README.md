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


Add analytics to your Next.js application with a single React Hook. This package integrates your Next.js application with HappyKit Analytics. Create a free [happykit.dev](https://happykit.dev/signup) account to get started.

## Key Features

- Track page views and unique visitors
- Integrate using a single React Hook
- Next.js specific dynamic route tracking (e.g. `/[user]`)
- Written in TypeScript

## Installation

Add the package to your project

```sh
npm install @happykit/analytics
```

## Integration

You'll need to add a single `useAnalytics` call to your application. The best place to do this is in `pages/_app.js`.

Set up a `pages/_app.js` file with this content:

```js
import { useAnalytics } from '@happykit/analytics';

function MyApp({ Component, pageProps }) {
  useAnalytics({ publicKey: '<Your HappyKit Public Key>' }); // <-- add this

  return <Component {...pageProps} />;
}

export default MyApp;
```

> Create a free account on [happykit.dev](https://happykit.dev/signup) to get your _HappyKit Public Key_ 

<details>
<summary>Using TypeScript?</summary>

```ts
import { useAnalytics } from '@happykit/analytics';
import type { AppProps } from 'next/app'

function MyApp({ Component, pageProps }: AppProps) {
  useAnalytics({ publicKey: 'HAPPYKIT KEY' }); // <-- add this

  return <Component {...pageProps} />
}

export default MyApp
```

</details>

You can read more about using a custom `_app.js` component [here](https://nextjs.org/docs/advanced-features/custom-app).


## Options

`useAnalytics(options)` accepts the following options object:

- `publicKey` **string** (required): The public key for this project from [happykit.dev](https://happykit.dev/).
- `skip` **function** (optional): This function is called with the created page view record. Return true to avoid tracking it.
- `skipHostnames` **array of strings** (optional): An array of hostnames which will not be tracked. Defaults to `["localhost"]`. HappyKit tracks page views from preview deployments by default. The data is kept separate from your production data.
- `delay` **number** (optional): The number of milliseconds to wait before reporting a page view. Defaults to 5000. This is used for batching purposes. This is used only if the browser supports `navigator.sendBeacon`. Otherwise page views are sent immediately.

Example:

```js
useAnalytics({
  publicKey: "pk_live_5093bcd381",
  skip: (pageView) => pageView.pathname === '/some-ignored-path'
})
```
