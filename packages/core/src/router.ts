import Redis from 'ioredis';
import {
  URL,
  TUNNEL_LIST_KEY,
  NAME_FIELD,
  PERSIST_FIELD,
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

  private async _cleanup () {
    // Check remaining members in set
    const numInSet: number = await this._ds.scard(TUNNEL_LIST_KEY);

    if (numInSet === 0) {
      return;
    }

    // Query remaining members
    const tunnelIds: Array<TunnelRouteIdentifier> = await this._ds.smembers(TUNNEL_LIST_KEY);

    // Iterate through all keys and remove entries
    for (const tunnelId of tunnelIds) {
      await this.removeRoute(tunnelId);
    }
  }

  public async getRoute (id: TunnelRouteIdentifier): Promise<TunnelRouteConfiguration> {
    const name: string | null = await this._ds.hget(`${TUNNEL_LIST_KEY}_${id}`, NAME_FIELD);
    const publicURL: URL | null = await this._ds.hget(`${TUNNEL_LIST_KEY}_${id}`, PUBLIC_URL_FIELD);
    const originURL: URL | null = await this._ds.hget(`${TUNNEL_LIST_KEY}_${id}`, ORIGIN_URL_FIELD);
    const persist: string | null = await this._ds.hget(`${TUNNEL_LIST_KEY}_${id}`, PERSIST_FIELD);
      
    if (!name) {
      throw new Error('Missing name for tunnel configuration');
    }

    if (!originURL) {
      throw new Error('Missing origin url for tunnel configuration');
    }

    if (!publicURL) {
      throw new Error('Missing public url for tunnel configuration');
    }

    const route: TunnelRouteConfiguration = Object.freeze({
      id,
      name,
      publicURL,
      originURL,
      persist: persist === 'true'
    });
      
    return route;
  }

  public async getAllRoutes (): Promise<Array<TunnelRouteConfiguration>> {
    const tunnels: Array<string> = await this._ds.smembers(TUNNEL_LIST_KEY);
    const tunnelRecords: Array<TunnelRouteConfiguration> = await Promise.all(
      tunnels.map(async (id: TunnelRouteIdentifier) => await this.getRoute(id))
    );
    return tunnelRecords;
  }

  public async addRoute (config: TunnelRouteConfiguration): Promise<void> {
    // Exit early if route already exists
    const hasRoute: Redis.BooleanResponse = await this._ds.sismember(TUNNEL_LIST_KEY, config.id);

    if (hasRoute) {
      return;
    }
    
    // Set hash fields for name, origin url, public url and persistance
    const nameSetResponse: Redis.BooleanResponse = await this._ds.hset(`${TUNNEL_LIST_KEY}_${config.id}`, NAME_FIELD, config.name);

    if (!nameSetResponse) {
      throw new Error('addRoute: Failed to add name field');
    }

    const originURLSetResponse: Redis.BooleanResponse = await this._ds.hset(`${TUNNEL_LIST_KEY}_${config.id}`, ORIGIN_URL_FIELD, config.originURL);

    if (!originURLSetResponse) {
      throw new Error('addRoute: Failed to add origin url field');
    }
    
    const publicURLSetResponse: Redis.BooleanResponse = await this._ds.hset(`${TUNNEL_LIST_KEY}_${config.id}`, PUBLIC_URL_FIELD, config.publicURL);
    
    if (!publicURLSetResponse) {
      throw new Error('addRoute: Failed to add public url field');
    }

    const persistResponse: Redis.BooleanResponse = await this._ds.hset(`${TUNNEL_LIST_KEY}_${config.id}`, PERSIST_FIELD, config.persist ? `${config.persist}` : 'false');

    if (!persistResponse) {
      throw new Error('addRoute: Failed to add persist field');
    }

    // Add id to set of known tunnels
    const numAddedResponse: number = await this._ds.sadd(TUNNEL_LIST_KEY, config.id);

    if (numAddedResponse === 0) {
      throw new Error('addRoute: Failed to add tunnel id to set');
    }
  }

  public async removeRoute (tunnelId: TunnelRouteIdentifier): Promise<void> {
    // Check key exists
    const keyExists: number = await this._ds.exists(`${TUNNEL_LIST_KEY}_${tunnelId}`);
    
    if (keyExists === 0) {
      return;
    }

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

  public async destroy (empty = false): Promise<void> {
    if (empty) {
      await this._cleanup();
    }
    await this._ds.quit();
  }
}
