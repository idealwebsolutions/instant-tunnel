# core
Utilities to build and manage cloudflared argo tunnels

## Pre-requisites
`cloudflared` must be in `PATH` or defined as an env variable `CLOUDFLARED_PATH` prior to usage. Download [here](https://developers.cloudflare.com/argo-tunnel/downloads).
Uses whatever redis server is running locally, if not define `REDIS_HOST`, `REDIS_PORT` and `REDIS_PASSWORD` with the appropriate values.

## Usage

```js
const { 
  createStore, 
  TunnelStatus 
} = require('core');

(async () => {
  // Initialize store
  const store = createStore({
    disableTimeoutCheck: true, // optional: manually disables handling health checks for timeout from origin (default: true)
    timeoutIntervalPreference: 45000 // optional: changes timeout check to 45 seconds (default: 30000)
  });
  // Listen for events
  store.on('connected', (connectedEvent) => console.log(`Live tunnel (${connectedEvent.id}) url: ${connectedEvent.publicURL}`));
  store.on('disconnected', (disconnectedEvent) => console.log(`Tunnel (${disconnectedEvent.id}) disconnected`));
  store.on('expired', (expiredEvent) => console.log(`Tunnel (${expiredEvent.id}) has expired`));
  store.on('timeout', (timeoutEvent) => console.log(`Timeout occured for tunnel (${timeoutEvent.id})`));
  store.on('error', (err) => console.error(err));
  // Tunnel identifier - Use tunnel id for other actions
  let tunnelId;
  try {
    // Creates a new tunnel
    tunnelId = await store.createTunnel(Object.freeze({
      name: 'my-first-live-tunnel', // required: tunnel name, only certain characters allowed ([A-Za-z-])
      originURL: 'http://localhost:3000', // required: address to web server on local network
      expiration: 60 * 60 * 1000 // optional: expiration time to shutdown tunnel 
    }));
  } catch (err) {
    // Tunnel could fail if origin is not running
    console.error(err);
    return;
  }
  // Wait about 10-15 seconds to get assigned public address
  setTimeout(async () => {
    // Check known records
    const records = await store.getRecords();
    for (const record of records) {
      // Displays new public url assigned to you by argo tunnel
      console.log(record);
    }
  }, 15000);
  // Wait about 15-30 seconds for tunnels to fully initialize and propogate on Cloudflare's end
  setTimeout(async () => {
    // Check status of tunnel
    const status = await store.getTunnelStatus(tunnelId);
    // Tunnel is active
    if (status === TunnelStatus.ACTIVE) {
      try {
        await store.shutdown(tunnelId); // Shutdown tunnel created
      } catch (err) {
        console.error(err);
      } finally {
        await store.destroy(); // Destroy all remaining tunnels and cleanup store to exit
      }
    }
  }, 30000);
})()
```
