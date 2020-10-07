import { Request, Response } from 'express';
import {
  store,
  constants
} from 'core';

type ErrorResponse = {
  error: string
}

type ActiveRoutesResponse = {
  routes: Array<constants.TunnelRouteEntry>
}

type TunnelIdResponse = {
  tunnelId: string
}

export default class TunnelController {
  private _store: store.TunnelStore;

  constructor (store: store.TunnelStore) {
    this._store = store;
  }

  public async fetch (_req: Request, res: Response<ActiveRoutesResponse | ErrorResponse>): Promise<void> {
    let routes: Array<constants.TunnelRouteEntry>;

    try {
      routes = await this._store.getTunnels();
    } catch (err) {
      res.status(500).json({
        error: err.message
      });
      return;
    }

    res.status(200).json({
      routes 
    });
  }

  // Changes state to restart
  public async restart (req: Request, res: Response<void | ErrorResponse>): Promise<void> {
    try {
      await this._store.reinstantiate(req.params.id, req.query.persist === 'true');
    } catch (err) {
      res.status(500).json({
        error: err.message
      });
      return;
    }
    res.status(204).end();
  }

  // Shuts down and removes a single tunnel if necessary
  public async stop (req: Request, res: Response<void | ErrorResponse>): Promise<void> {
    try {
      await this._store.shutdownTunnel(req.params.id, req.query.remove === 'true');
    } catch (err) {
      res.status(500).json({
        error: err.message
      });
      return;
    }
    res.status(204).end();
  }
  
  // Creates a new tunnel
  public async create (req: Request, res: Response<TunnelIdResponse | ErrorResponse>): Promise<void> {
    if (!req.body) {
      res.status(400).json({
        error: 'Invalid data passed'
      });
      return;
    }
    
    const tunnelConfigRequest: constants.TunnelRouteConfigurationRequest = req.body;
    let tunnelId: string;

    try {
      tunnelId = await this._store.createTunnel(tunnelConfigRequest);
    } catch (err) {
      res.status(500).json({
        error: err.message
      });
      return;
    }
    
    res.status(200).json({
      tunnelId
    });
  }
}
