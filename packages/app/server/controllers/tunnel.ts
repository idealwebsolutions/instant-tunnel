import { Request, Response } from 'express';
import { 
  TunnelStore, 
  TunnelRouteConfiguration,
  TunnelRouteConfigurationRequest
} from 'core';

type ErrorResponse = {
  error: string
}

type ActiveRoutesResponse = {
  routes: Array<TunnelRouteConfiguration>
}

type TunnelIdResponse = {
  tunnelId: string
}

export default class TunnelController {
  private _store: TunnelStore;

  constructor (store: TunnelStore) {
    this._store = store;
  }

  public async fetch (req: Request, res: Response<ActiveRoutesResponse | ErrorResponse>) {
    let routes: Array<TunnelRouteConfiguration>;
    try {
      routes = await this._store.getRecords();
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        error: err.message
      });
    }
    res.status(200).json({
      routes 
    });
  }

  public async kill (req: Request, res: Response<void | ErrorResponse>) {
    try {
      await this._store.shutdownTunnel(req.params.id);
    } catch (err) {
      return res.status(500).json({
        error: err.message
      });
    }
    res.status(204).end();
  }
  
  public async create (req: Request, res: Response<TunnelIdResponse | ErrorResponse>) {
    if (!req.body) {
      return res.status(400).json({
        error: 'Invalid data passed'
      });
    }
    const tunnelConfigRequest: TunnelRouteConfigurationRequest = req.body;
    let tunnelId: string;
    try {
      tunnelId = await this._store.createTunnel(tunnelConfigRequest);
    } catch (err) {
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
