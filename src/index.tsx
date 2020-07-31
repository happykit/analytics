import * as React from 'react';

// Delete me
export const Thing = () => {
  const [text, setText] = React.useState<string>('loading');
  React.useEffect(() => {
    fetch('/api')
      .then(res => res.json())
      .then(data => {
        setText(data.text);
      });
  }, []);
  return <div>{text}</div>;
};
