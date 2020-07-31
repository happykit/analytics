import * as React from 'react';
import { useRouter } from 'next/router';

// Delete me
export const Thing = () => {
  const router = useRouter();

  const [text, setText] = React.useState<string>('loading');
  React.useEffect(() => {
    fetch('/api')
      .then(res => res.json())
      .then(data => {
        setText(data.text);
      });
  }, []);
  return (
    <div>
      {text} <p>{router.pathname}</p>
    </div>
  );
};
