import { EventEmitter } from 'events';
import Tunnel from './tunnel';
import Router from './router';
import { 
  UpstreamHealthCheckTask,
  ScheduledCancellationTask
} from './task';
import {
  URL,
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
    
    this._storePreferences = storePreferences;
    this._router = new Router();
    this._liveTunnels = new Map<URL, Tunnel>();
  }
  // Connects tunnel specific events with store
  private _setupListeners (tunnel: Tunnel, expiration: number): void {
    // Listen for ready event
    tunnel.once(READY_EVENT, async (publicURL: URL) => {
      const config: TunnelRouteConfiguration = Object.freeze({
        id: tunnel.id,
        active: tunnel.currentState === TunnelState.ACTIVE,
        originURL: tunnel.address,
        publicURL,
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
  // Creates a new tunnel instance
  public async createTunnel (request: TunnelRouteConfigurationRequest): Promise<TunnelRouteIdentifier> {
    const liveTunnels: Array<TunnelRouteConfiguration> = await this.getRecords();
    // Check tunnel already exists for origin
    const found: TunnelRouteConfiguration | undefined = liveTunnels.find((route) => route.originURL.toLowerCase() === request.originURL.toLowerCase());
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
    const trId: TunnelRouteIdentifier = tunnel.id;
    // Setup listeners
    this._setupListeners(tunnel, request.expiration || 0);
    // Return identifier
    return trId;
  }
  // Shuts down a single tunnel instance
  public async shutdownTunnel (tunnelId: TunnelRouteIdentifier): Promise<void> {
    if (this._liveTunnels.has(tunnelId)) {
      // Removes record on request
      await this._router.removeRoute(tunnelId);
      // Fetch associated tunnel
      const liveTunnel: Tunnel | undefined = this._liveTunnels.get(tunnelId);
      // Check correct instance lives
      if (liveTunnel && liveTunnel instanceof Tunnel) {
        liveTunnel.destroy();
      }
    }
  }
  // Returns current status of tunnel
  public async getTunnelStatus (tunnelId: TunnelRouteIdentifier): Promise<TunnelState> {
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
  // Returns all tunnel route configurations
  public async getRecords (): Promise<Array<TunnelRouteConfiguration>> {
    const tunnels: Array<TunnelRouteConfiguration> = await this._router.getRoutes();
    return tunnels.map((tunnelConfig: TunnelRouteConfiguration) => Object.freeze(
      Object.assign({}, tunnelConfig, {
        active: this._liveTunnels.has(tunnelConfig.id)
      })
    ));
  }
  // Destroys entire store
  public async destroy (): Promise<void> {
    const tunnelIterator: Iterator<TunnelRouteIdentifier> = this._liveTunnels.keys();
    let tunnelId: TunnelRouteIdentifier | null;
    // Iterate and shutdown all live instances
    while ((tunnelId = tunnelIterator.next().value) != null) {
      await this.shutdownTunnel(tunnelId);
    }
    // Destroy associated router
    await this._router.destroy();
    // Remove listeners
    this.removeAllListeners();
  }
}

export function createStore (storePrefs: TunnelStorePreferences = DEFAULT_STORE_PREFERENCES): TunnelStore {
  return new TunnelStore(storePrefs);
}
