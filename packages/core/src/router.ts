import { 
  Route 
} from './data';
import {
  TunnelRouteConfiguration,
  TunnelRouteIdentifier,
} from './constants';

export default class Router {
  private async _cleanup () {
    // Query remaining members
    const tunnelIds: Array<TunnelRouteIdentifier> = await Route.fetchAllIdentifiers();
    // Iterate through all keys and remove entries
    for (const tunnelId of tunnelIds) {
      await this.removeRoute(tunnelId);
    }
  }
  
  // Fetches a specific route based on tunnel identifier
  public async getRoute (tunnelId: TunnelRouteIdentifier): Promise<TunnelRouteConfiguration> {
    const tunnelRouteConfiguration: TunnelRouteConfiguration = await Route.fetch(tunnelId);
    return tunnelRouteConfiguration;
  }

  // Fetches all routes on router
  public async getAllRoutes (): Promise<Array<TunnelRouteConfiguration>> {
    const tunnelRecords: Array<TunnelRouteConfiguration> = await Route.fetchAll();
    return tunnelRecords;
  }

  // Adds a new route to router
  public async addRoute (config: TunnelRouteConfiguration): Promise<void> {
    try {
      await Route.create(config);
    } catch (err) {
      console.error(err);
      throw new Error('addRoute: Unable to add new route');
    }
  }

  // Disables a route by remove proxy associated
  public async disableRoute (tunnelId: TunnelRouteIdentifier): Promise<void> {
    try {
      await Route.disable(tunnelId);
    } catch (err) {
      console.error(err);
      throw new Error('disableRoute: Unable to disable route');
    }
  }

  // Removes a single route from router
  public async removeRoute (tunnelId: TunnelRouteIdentifier): Promise<void> {
    try {
      await Route.remove(tunnelId);
    } catch (err) {
      console.error(err);
      throw new Error('removeRoute: Unable to remove route');
    }
  }

  // Destroys router and can optionally cleanup (remove all) routes
  public async destroy (empty = false): Promise<void> {
    if (empty) {
      await this._cleanup();
    }
  }
}
