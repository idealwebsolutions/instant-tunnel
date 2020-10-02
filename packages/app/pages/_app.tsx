import { FunctionComponentElement } from 'react';
import { SWRConfig } from 'swr';
import type { AppProps /*, AppContext */ } from 'next/app';

import 'bootstrap/dist/css/bootstrap.min.css'

function MyApp({ Component, pageProps }: AppProps): FunctionComponentElement<AppProps> {
  return ( 
    <SWRConfig 
      value={{
        fetcher: (resource, init) => fetch(resource, init).then((res) => res.json())
      }}>
        <Component {...pageProps} />
    </SWRConfig>
  );
}

export default MyApp
