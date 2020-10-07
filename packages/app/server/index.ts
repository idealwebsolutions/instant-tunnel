import 'make-promises-safe';

import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import pino from 'express-pino-logger';
import next from 'next';
import exitHook from 'async-exit-hook';
import { AddressInfo } from 'net';
import { 
  store as tstore,
  constants 
} from 'core';
import { Server } from 'http';
import TunnelController from './controllers/tunnel';

const port = process.env.PORT || 9000;
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const store: tstore.TunnelStore = tstore.createStore();
  const storeController: TunnelController = new TunnelController(store);
  const server: express.Express = express();
  // Use json parser, cors and logger
  server.use(bodyParser.json());
  server.use(cors());
  server.use(pino());
  store.on('disconnnected', (disconnectEvent: constants.TunnelDisconnectedEvent) => console.log(`Tunnel ${disconnectEvent.id} disconnected`));
  store.on('expired', (expiredEvent: constants.ExpiredEvent) => console.log(`Tunnel (${expiredEvent.id}) has expired`));
  store.on('timeout', (timeoutEvent: constants.UpstreamTimeoutEvent) => console.log(`Timeout occured for tunnel (${timeoutEvent.id})`));
  store.on('error', (errorEvent: constants.TunnelErrorEvent) => console.log(`Error occured for tunnel (${errorEvent.id}): ${errorEvent.error.message}`));
  // Create custom routes
  server.patch('/api/tunnel/:id', async (req, res) => await storeController.restart(req, res));
  server.delete('/api/tunnel/:id', async (req, res) => await storeController.stop(req, res));
  server.get('/api/tunnels', async (req, res) => await storeController.fetch(req, res));
  server.post('/api/tunnels', async (req, res) => await storeController.create(req, res));
  server.all('*', (req, res) => handle(req, res));
  // Bind to port
  const bound: Server = server.listen(port, () => {
    const addressInfo: string | AddressInfo | null = bound.address() as AddressInfo;
    if (!addressInfo) {
      return console.error(`Failed to bind to port ${port}`);
    }
    console.log(`Listening on port ${addressInfo.port}`);
  });
  // Add exit callback for a clean shutdown
  exitHook((done) => {
    bound.close();
    store.destroy().then(() => {
      bound.unref();
      done();
    }).catch((err) => console.error(err));
  });
});
