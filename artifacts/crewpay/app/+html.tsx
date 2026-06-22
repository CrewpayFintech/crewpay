import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function RootHtml({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta content="IE=edge" httpEquiv="X-UA-Compatible" />
        <meta
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
          name="viewport"
        />
        <meta content="#ffffff" name="theme-color" />
        <ScrollViewStyleReset />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
