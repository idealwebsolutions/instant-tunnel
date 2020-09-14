import Redis from 'ioredis';
import {
  URL,
  TUNNEL_LIST_KEY,
  PUBLIC_URL_FIELD,
  ORIGIN_URL_FIELD,
  TunnelRouteConfiguration,
  TunnelRouteIdentifier,
} from './constants';

export default class Router {
  private _ds: Redis.Redis;

  constructor () {
    this._ds = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || '',
      dropBufferSupport: true,
    });
  }

  public async getRoutes (): Promise<Array<TunnelRouteConfiguration>> {
    const tunnels: Array<string> = await this._ds.smembers(TUNNEL_LIST_KEY);
    const tunnelRecords: Array<TunnelRouteConfiguration> = await Promise.all(tunnels.map(async (tunnelId: string) => {
      const publicURL: URL | null = await this._ds.hget(tunnelId, PUBLIC_URL_FIELD);
      const originURL: URL | null = await this._ds.hget(tunnelId, ORIGIN_URL_FIELD);
      
      if (!originURL) {
        throw new Error(`Missing origin url for tunnel configuration`);
      }

      if (!publicURL) {
        throw new Error(`Missing public url for tunnel configuration`);
      }

      const route: TunnelRouteConfiguration = Object.freeze({
        id: tunnelId,
        publicURL,
        originURL,
      });
      
      return route;
    }));

    return tunnelRecords;
  }

  public async addRoute (config: TunnelRouteConfiguration): Promise<void> {
    // Exit early if route already exists
    const hasRoute: Redis.BooleanResponse = await this._ds.sismember(TUNNEL_LIST_KEY, config.id);
    if (hasRoute) {
      return;
    }
    // Set hash fields for origin and public urls
    const originURLSetResponse: Redis.BooleanResponse = await this._ds.hset(`${TUNNEL_LIST_KEY}_${config.id}`, ORIGIN_URL_FIELD, config.originURL);

    if (!originURLSetResponse) {
      throw new Error('addRoute: Failed to add origin url field');
    }
    
    const publicURLSetResponse: Redis.BooleanResponse = await this._ds.hset(`${TUNNEL_LIST_KEY}_${config.id}`, PUBLIC_URL_FIELD, config.publicURL);
    
    if (!publicURLSetResponse) {
      throw new Error('addRoute: Failed to add public url field');
    }
    // Add id to set of known tunnels
    const numAddedResponse: number = await this._ds.sadd(TUNNEL_LIST_KEY, config.id);

    if (numAddedResponse === 0) {
      throw new Error('addRoute: Failed to add tunnel id to set');
    }
  }

  public async removeRoute (tunnelId: TunnelRouteIdentifier): Promise<void> {
    // Remove tunnel specific entry
    const keyDeletionResponse: number = await this._ds.del(`${TUNNEL_LIST_KEY}_${tunnelId}`);

    if (keyDeletionResponse === 0) {
      throw new Error('removeRoute: Failed to remove tunnel entry');
    }
    
    // Remove id from set of known tunnels
    const numRemovedResponse: number = await this._ds.srem(TUNNEL_LIST_KEY, tunnelId);

    if (numRemovedResponse === 0) {
      throw new Error('removeRoute: Failed to remove tunnel id from set');
    }
  }

  public async destroy (): Promise<void> {
    await this._ds.quit();
  }
}
