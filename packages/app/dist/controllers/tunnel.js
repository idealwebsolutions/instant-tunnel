"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class TunnelController {
    constructor(store) {
        this._store = store;
    }
    async fetch(req, res) {
        let routes;
        try {
            routes = await this._store.getRecords();
        }
        catch (err) {
            console.error(err);
            return res.status(500).json({
                error: err.message
            });
        }
        res.status(200).json({
            routes
        });
    }
    async kill(req, res) {
        try {
            await this._store.shutdownTunnel(req.params.id);
        }
        catch (err) {
            return res.status(500).json({
                error: err.message
            });
        }
        res.status(204).end();
    }
    async create(req, res) {
        if (!req.body) {
            return res.status(400).json({
                error: 'Invalid data passed'
            });
        }
        const tunnelConfigRequest = req.body;
        let tunnelId;
        try {
            tunnelId = await this._store.createTunnel(tunnelConfigRequest);
        }
        catch (err) {
            console.error(err);
            return res.status(500).json({
                error: err.message
            });
        }
        res.status(200).json({
            tunnelId
        });
    }
}
exports.default = TunnelController;
