import Knex from 'knex';
import isUrlHttp from 'is-url-http';

import {
  ROUTES_TABLE_NAME,
  SavedRouteConfiguration,
  TunnelRouteConfiguration,
  TunnelRouteIdentifier,
} from '../constants';

export class Route {
  private _db: Knex;
  constructor (db: Knex) {
    this._db = db;
  }
  // Connects to knex instance
  public static connect (db: Knex): Route {
    return new Route(db);
  }
  // Fetches all route configurations
  public async fetchAll (active = false): Promise<Array<TunnelRouteConfiguration>> {
    let routeConfigQuery = this._db.select<Array<SavedRouteConfiguration>>().from(ROUTES_TABLE_NAME);
    if (active) {
      routeConfigQuery = routeConfigQuery.whereNotNull('tunnel');
    }
    const routeConfigurations: Array<SavedRouteConfiguration> = await routeConfigQuery;
    return routeConfigurations.map((routeConfig: SavedRouteConfiguration) => Object.freeze({
      id: routeConfig.tunnel,
      name: routeConfig.name,
      originURL: routeConfig.origin,
      publicURL: routeConfig.proxy,
      persist: routeConfig.persist,
    }) as TunnelRouteConfiguration);
  }
  // Fetches single route configuration
  public async fetch (tunnelId: TunnelRouteIdentifier): Promise<TunnelRouteConfiguration> {
    const routeConfig: SavedRouteConfiguration = await this._db.first<SavedRouteConfiguration>().from(ROUTES_TABLE_NAME).where('tunnel', tunnelId);
    return Object.freeze({
      id: routeConfig.tunnel,
      name: routeConfig.name,
      originURL: routeConfig.origin,
      publicURL: routeConfig.proxy,
      persist: routeConfig.persist,
    }) as TunnelRouteConfiguration;
  }
  // Fetches all route identifiers only
  public async fetchAllIdentifiers (): Promise<Array<TunnelRouteIdentifier>> {
    const routeIdentifiers: Array<TunnelRouteIdentifier> = await this._db.select<Array<TunnelRouteIdentifier>>('id').from(ROUTES_TABLE_NAME);
    return routeIdentifiers;
  }
  // Creates new route configuration
  public async create (config: TunnelRouteConfiguration): Promise<void> {
    if (!isUrlHttp(config.publicURL)) {
      throw new Error('Invalid proxy url detected');
    }
    await this._db.insert<SavedRouteConfiguration>({
      tunnel: config.id,
      name: config.name,
      origin: config.originURL,
      proxy: config.publicURL,
      persist: config.persist,
    } as SavedRouteConfiguration).into(ROUTES_TABLE_NAME);
  }
  // Removes open proxy for tunnel
  public async disable (tunnelId: TunnelRouteIdentifier): Promise<void> {
    await this._db.update({
      proxy: null
    }).where('tunnel', tunnelId).from(ROUTES_TABLE_NAME);
  }
  // Removes a route entry from routing table
  public async remove (tunnelId: TunnelRouteIdentifier): Promise<void> {
    await this._db.del<SavedRouteConfiguration>().from(ROUTES_TABLE_NAME).where('tunnel', tunnelId);
  }
}
