"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("make-promises-safe");
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const cors_1 = __importDefault(require("cors"));
const next_1 = __importDefault(require("next"));
const async_exit_hook_1 = __importDefault(require("async-exit-hook"));
const core_1 = require("core");
const tunnel_1 = __importDefault(require("./controllers/tunnel"));
const port = process.env.PORT || 9000;
const dev = process.env.NODE_ENV !== 'production';
const app = next_1.default({ dev });
const handle = app.getRequestHandler();
const store = core_1.createStore(Object.freeze({
    timeoutIntervalPreference: 30000
}));
const storeController = new tunnel_1.default(store);
app.prepare().then(() => {
    const server = express_1.default();
    // Use json parser and cors
    server.use(body_parser_1.default.json());
    server.use(cors_1.default());
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
        const addressInfo = bound.address();
        if (!addressInfo) {
            return console.error(`Failed to bind to port ${port}`);
        }
        console.log(`Listening on port ${addressInfo.port}`);
    });
    // Add exit callback for a clean shutdown
    async_exit_hook_1.default((done) => {
        bound.close();
        store.destroy().then(() => {
            bound.unref();
            done();
        }).catch((err) => console.error(err));
    });
});
