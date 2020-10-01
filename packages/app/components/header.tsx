// Header.tsx
import Head from 'next/head';

type HeaderProps = {
  pageTitle: string
}

export default function Header (props: HeaderProps) {
  return (
    <Head>
      <title>Instant-Tunnel - {props.pageTitle}</title>
      <link rel="icon" href="/favicon.ico" />
    </Head>
  )
}
