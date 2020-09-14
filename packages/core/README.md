# core
Utilities to build and manage cloudflared argo tunnels

## Usage

```js
const { 
  createStore, 
  TunnelStatus 
} = require('core');

(async () => {
  // Initialize store
  const store = createStore();
  // Tunnel identifier - Use tunnel id for other actions
  let tunnelId;
  try {
    // Creates a new tunnel
    tunnelId = await store.createTunnel(Object.freeze({
      name: 'my-first-live-tunnel', // tunnel name, only certain characters allowed ([A-Za-z-])
      originHost: 'localhost', // host on local network
      originPort: 3000 // port of running web service
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
