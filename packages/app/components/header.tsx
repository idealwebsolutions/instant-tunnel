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
    </Head>
  )
}
