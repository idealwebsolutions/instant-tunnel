import 'make-promises-safe';

import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import next from 'next';
import exitHook from 'async-exit-hook';
import { AddressInfo } from 'net';
import { createStore } from 'core';

import TunnelController from './controllers/tunnel';

const port = process.env.PORT || 9000;
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();
const store = createStore(Object.freeze({
  timeoutIntervalPreference: 30000
}));
const storeController = new TunnelController(store);

app.prepare().then(() => {
  const server = express();
  // Use json parser and cors
  server.use(bodyParser.json());
  server.use(cors());
  store.on('disconnnected', (disconnectEvent) => console.log(`Tunnel ${disconnectEvent.id} disconnected`));
  store.on('expired', (expiredEvent) => console.log(`Tunnel (${expiredEvent.id}) has expired`));
  store.on('timeout', (timeoutEvent) => console.log(`Timeout occured for tunnel (${timeoutEvent.id})`));
  store.on('error', (errorEvent) => console.log(`Error occured for tunnel (${errorEvent.id}): ${errorEvent.error.message}`));
  // Create custom routes
  server.delete('/api/tunnel/:id', async (req, res) => await storeController.kill(req, res));
  server.get('/api/tunnels', async (req, res) => await storeController.fetch(req, res));
  server.post('/api/tunnels', async (req, res) => await storeController.create(req, res));
  server.all('*', (req, res) => handle(req, res));
  // Bind to port
  const bound = server.listen(port, () => {
    const addressInfo: string | AddressInfo | null = bound.address() as AddressInfo;
    if (!addressInfo) {
      return console.error(`Failed to bind to port ${port}`);
    }
    console.log(`Listening on port ${addressInfo.port}`);
  });
  // Add exit callback for a clean shutdown
  exitHook((done: Function) => {
    bound.close();
    store.destroy().then(() => {
      bound.unref();
      done();
    }).catch((err) => console.error(err));
  });
});
