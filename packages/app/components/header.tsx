// Header.tsx
import Head from 'next/head';
import { FunctionComponentElement} from 'react';

type HeaderProps = {
  pageTitle: string
}

export default function Header (props: HeaderProps): FunctionComponentElement<HeaderProps> {
  return (
    <Head>
      <title>Instant-Tunnel - {props.pageTitle}</title>
      <link rel="icon" href="/favicon.ico" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
      <link rel="manifest" href="/site.webmanifest" />
    </Head>
  )
}
