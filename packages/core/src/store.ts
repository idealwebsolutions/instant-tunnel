import { EventEmitter } from 'events';
import Tunnel from './tunnel';
import Router from './router';
import { 
  UpstreamHealthCheckTask,
  ScheduledCancellationTask
} from './task';
import {
  URL,
  TunnelRouteEntry,
  TunnelStorePreferences,
  TunnelRouteConfiguration,
  TunnelState,
  TunnelRouteConfigurationRequest,
  TunnelRouteIdentifier,
  TunnelConnectedEvent,
  TunnelDisconnectedEvent,
  TunnelErrorEvent,
  UpstreamTimeoutEvent,
  ExpiredEvent,
  DEFAULT_STORE_PREFERENCES,
  VALID_TUNNEL_NAME,
  CONNECTED_EVENT,
  READY_EVENT,
  DISCONNECTED_EVENT,
  FINISH_EVENT,
  TIMEOUT_EVENT,
  EXPIRED_EVENT,
} from './constants';

export class TunnelStore extends EventEmitter {
  private _storePreferences: TunnelStorePreferences;
  private _router: Router;
  private _liveTunnels: Map<URL, Tunnel>;

  constructor (storePreferences: TunnelStorePreferences) {
    super();
    
    this._storePreferences = Object.freeze(storePreferences);
    this._router = new Router();
    this._liveTunnels = new Map<URL, Tunnel>();
  }
  // Connects tunnel specific events with store
  private _setupListeners (tunnel: Tunnel, expiration: number, persist = false): void {
    // Listen for ready event
    tunnel.once(READY_EVENT, async (publicURL: URL) => {
      const config: TunnelRouteConfiguration = Object.freeze({
        id: tunnel.id,
        name: tunnel.name,
        originURL: tunnel.address,
        publicURL,
        persist,
      });
      // Add to live tunnels
      this._liveTunnels.set(tunnel.id, tunnel);
      // Set temporary records
      await this._router.addRoute(config);
      // Start cancellation task if expiration set
      if (expiration && expiration > 0) {
        // Start cancellation task
        const cancellationTask: ScheduledCancellationTask = new ScheduledCancellationTask(expiration);
        // Set task with tunnel
        tunnel.setBackgroundTask(cancellationTask);
        // Check for cancellations
        cancellationTask.once(EXPIRED_EVENT, async () => {
          // Emit cancellation
          const expiredEvent: ExpiredEvent = Object.freeze({
            id: tunnel.id
          });
          this.emit(EXPIRED_EVENT, expiredEvent);
          // If cancelled fired, shutdown tunnel
          await this.shutdownTunnel(tunnel.id); 
        });
        cancellationTask.start();
      }
      // Disable upstream health check if flag enabled
      if (!this._storePreferences.disableTimeoutCheck) {
        // Start health check task, include interval preference if set
        const healthCheck: UpstreamHealthCheckTask = new UpstreamHealthCheckTask(tunnel.address, this._storePreferences.timeoutIntervalPreference);
        // Set task with tunnel
        tunnel.setBackgroundTask(healthCheck);
        // Check for timeouts
        healthCheck.once(TIMEOUT_EVENT, async () => {
          // Pass along timeout to client
          const timeoutEvent: UpstreamTimeoutEvent = Object.freeze({
            id: tunnel.id
          });
          this.emit(TIMEOUT_EVENT, timeoutEvent);
          await this.shutdownTunnel(tunnel.id);
        });
        healthCheck.start();
      }
      // Emit tunnel connected event
      const connectedEvent: TunnelConnectedEvent = Object.freeze({
        id: tunnel.id,
        publicURL
      });
      this.emit(CONNECTED_EVENT, connectedEvent);
    });
    // Listen for finish event
    tunnel.once(FINISH_EVENT, () => {
      // Emit disconnected event
      const disconnectedEvent: TunnelDisconnectedEvent = Object.freeze({
        id: tunnel.id
      });
      this.emit(DISCONNECTED_EVENT, disconnectedEvent);
      // Delete and cleanup
      if (this._liveTunnels.has(tunnel.id)) {
        const liveTunnel: Tunnel | undefined = this._liveTunnels.get(tunnel.id);
        if (liveTunnel && liveTunnel instanceof Tunnel) { // Check instance is tunnel
          this._liveTunnels.delete(tunnel.id);
        }
      }
    });
    tunnel.on('error', (error: Error) => {
      // Pass along errors to client
      const errorEvent: TunnelErrorEvent = Object.freeze({
        id: tunnel.id,
        error
      });
      this.emit('error', errorEvent);
    });
  }
  // Returns current status of tunnel
  private _getTunnelStatus (tunnelId: TunnelRouteIdentifier): TunnelState {
    if (!this._liveTunnels.has(tunnelId)) {
      throw new Error('getTunnelStatus: No tunnel exists');
    }
    // Fetch associated tunnel
    const tunnel: Tunnel | undefined = this._liveTunnels.get(tunnelId);
    // Check correct instance lives
    if (!tunnel || !(tunnel instanceof Tunnel)) {
      throw new Error('getTunnelStatus: Invalid instance encountered');
    }
    // Return current state (will always either be ACTIVE, PENDING or DISABLED)
    return tunnel.currentState;
  }
  // Revives a single shutdown instance
  public async reinstantiate (oldTunnelId: TunnelRouteIdentifier, persist = false): Promise<void> {
    const tunnelEntry: TunnelRouteEntry = await this._getTunnel(oldTunnelId);
    if (tunnelEntry.state === TunnelState.DISABLED) {
      // Remove old route with associated id
      await this._router.removeRoute(oldTunnelId);
      // Start up a brand new tunnel with same options
      const newTunnelRequest: TunnelRouteConfigurationRequest = Object.freeze({
        name: tunnelEntry.config.name,
        originURL: tunnelEntry.config.originURL,
        expiration: tunnelEntry.config.expiration,
        persist
      });
      await this.createTunnel(newTunnelRequest);
    }
  }
  // Resets by reviving instances if persisted option is enabled
  public async reset (): Promise<void> {
    // Remove any stale instances found
    await this._router.removeStaleRoutes();
    // Fetch persistent tunnels
    const tunnels: Array<TunnelRouteEntry> = await this.getTunnels();
    // Iterate over each tunnel that is disabled with persistance enabled
    let tunnelEntry: TunnelRouteEntry;
    for (tunnelEntry of tunnels) {
      if (tunnelEntry.state === TunnelState.DISABLED && tunnelEntry.config.persist) {
        const oldTunnelId: TunnelRouteIdentifier = tunnelEntry.config.id;
        // Remove old route with associated id
        await this._router.removeRoute(oldTunnelId);
        // Start up a brand new tunnel with same options
        const newTunnelRequest: TunnelRouteConfigurationRequest = Object.freeze({
          name: tunnelEntry.config.name,
          originURL: tunnelEntry.config.originURL,
          expiration: tunnelEntry.config.expiration,
          persist: tunnelEntry.config.persist
        });
        // Create new tunnel
        await this.createTunnel(newTunnelRequest);
      }
    }
  }
  // Creates a new tunnel instance
  public async createTunnel (request: TunnelRouteConfigurationRequest): Promise<TunnelRouteIdentifier> {
    const liveTunnels: Array<TunnelRouteEntry> = await this.getTunnels();
    // Check tunnel already exists for origin
    const found: TunnelRouteEntry | undefined = liveTunnels.find((route: TunnelRouteEntry) => 
      route.config.originURL.toLowerCase() === request.originURL.toLowerCase()
    );
    if (found) {
      throw new Error(`createTunnel: Existing tunnel found for ${request.originURL}`);
    }
    // Check valid service name
    if (!request.name.length || !VALID_TUNNEL_NAME.test(request.name)) {
      throw new Error(`createTunnel: Name (${request.name}) is invalid`);
    }
    // If not found, first check service is healthy
    const isActive: boolean = await UpstreamHealthCheckTask.checkAvailable(request.originURL);
    if (!isActive) {
      throw new Error(`createTunnel: ${request.originURL} is not online`);
    }
    // Begin tunnel creation
    const tunnel: Tunnel = Tunnel.create(request.name, request.originURL);
    const id: TunnelRouteIdentifier = tunnel.id;
    // Setup listeners
    this._setupListeners(tunnel, request.expiration || 0, request.persist);
    // Return identifier
    return id;
  }
  // Shuts down a single tunnel instance
  public async shutdownTunnel (tunnelId: TunnelRouteIdentifier, forget = false): Promise<void> {
    if (this._liveTunnels.has(tunnelId)) {
      // Permanently removes record on request
      if (forget) {
        await this._router.removeRoute(tunnelId);
      } else { // Removes the now defunct proxy associated with route
        await this._router.disableRoute(tunnelId);
      }
      // Fetch associated tunnel
      const liveTunnel: Tunnel | undefined = this._liveTunnels.get(tunnelId);
      // Check correct instance lives
      if (liveTunnel && liveTunnel instanceof Tunnel) {
        liveTunnel.destroy();
      }
    }
  }
  // Returns single tunnel route configuration include state
  private async _getTunnel (id: TunnelRouteIdentifier): Promise<TunnelRouteEntry> {
    const config: TunnelRouteConfiguration = await this._router.getRoute(id);
    let state: TunnelState;
    try {
      state = this._getTunnelStatus(config.id);
    } catch (err) {
      state = TunnelState.DISABLED;
    }
    const tunnelEntry: TunnelRouteEntry = Object.freeze({
      config,
      state
    });
    return tunnelEntry;
  }
  // Returns all tunnel route configuration including state
  public async getTunnels (): Promise<Array<TunnelRouteEntry>> {
    const tunnels: Array<TunnelRouteConfiguration> = await this._router.getAllRoutes();
    return tunnels.map((config: TunnelRouteConfiguration) => {
      let state: TunnelState;
      try {
        state = this._getTunnelStatus(config.id);
      } catch (err) {
        state = TunnelState.DISABLED;
      }
      const tunnelEntry: TunnelRouteEntry = Object.freeze({
        config,
        state
      });
      return tunnelEntry;
    });
  }
  // Destroys entire store
  public async destroy (clear = false): Promise<void> {
    const tunnelIterator: Iterator<TunnelRouteIdentifier> = this._liveTunnels.keys();
    let tunnelId: TunnelRouteIdentifier | null;
    // Iterate and shutdown all live instances
    while ((tunnelId = tunnelIterator.next().value) != null) {
      // Delete if not persisting
      const tunnelRouteConfig: TunnelRouteConfiguration = await this._router.getRoute(tunnelId);
      await this.shutdownTunnel(tunnelId, !tunnelRouteConfig.persist);
    }
    // Destroy associated router
    await this._router.destroy(clear);
    // Remove listeners
    this.removeAllListeners();
  }
}

export function createStore (storePrefs: TunnelStorePreferences = DEFAULT_STORE_PREFERENCES): TunnelStore {
  const store = new TunnelStore(storePrefs);
  setTimeout(async () => await store.reset(), 100);
  return store;
}
