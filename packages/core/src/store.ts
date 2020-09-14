import Tunnel from './tunnel';
import Router from './router';
import { UpstreamHealthTask } from './task';
import {
  URL,
  TunnelRouteConfiguration,
  TunnelState,
  TunnelRouteConfigurationRequest,
  TunnelRouteIdentifier,
  VALID_TUNNEL_NAME
} from './constants';

export class TunnelStore {
  private _router: Router;
  private _liveTunnels: Map<URL, Tunnel>;

  constructor () {
    this._router = new Router();
    this._liveTunnels = new Map<URL, Tunnel>();
  }
  // Connects tunnel specific events with store
  private _setupListeners (tunnel: Tunnel): void {
    const healthCheck: UpstreamHealthTask = new UpstreamHealthTask(tunnel.address);
    // Listen for ready event
    tunnel.once('ready', async (publicURL: URL) => {
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
    });
    // Listen for finish event
    tunnel.once('finish', () => {
      // Stop health monitor
      healthCheck.stop();
      // Delete and cleanup
      if (this._liveTunnels.has(tunnel.id)) {
        const liveTunnel: Tunnel | undefined = this._liveTunnels.get(tunnel.id);
        if (liveTunnel && liveTunnel instanceof Tunnel) { // Check instance is tunnel
          this._liveTunnels.delete(tunnel.id);
        }
      }
    });
    // Listen for timeouts upstream
    healthCheck.once('timeout', async () => await this.shutdownTunnel(tunnel.id));
    // Start health check interval
    healthCheck.start();
  }
  // Reinitializes existing tunnels
  public regenerate (): void {
    throw new Error('reinitializeTunnels: Method not implemented');
  }
  // Creates a new tunnel instance
  public async createTunnel (request: TunnelRouteConfigurationRequest): Promise<TunnelRouteIdentifier> {
    const originURL: URL = `${request.originHost}:${request.originPort}`;
    // Check service is healthy
    const isActive: boolean = await UpstreamHealthTask.checkAvailable(originURL);
    if (!isActive) {
      throw new Error(`createTunnel: ${originURL} is not online`);
    }
    // Check valid name
    if (!request.name.length || !VALID_TUNNEL_NAME.test(request.name)) {
      throw new Error(`createTunnel: Name (${name}) is invalid`);
    }
    // Begin tunnel creation
    const tunnel: Tunnel = Tunnel.create(request.name, originURL);
    const trId: TunnelRouteIdentifier = tunnel.id;
    // Setup listeners
    this._setupListeners(tunnel);
    // Return identifier
    return trId;
  }
  // Shuts down a single tunnel instance
  public async shutdownTunnel (tunnelId: string): Promise<void> {
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
  public async getTunnelStatus (tunnelId: string): Promise<TunnelState> {
    if (!this._liveTunnels.has(tunnelId)) {
      throw new Error('getTunnelStatus: No tunnel exists');
    }

    const tunnel: Tunnel | undefined = this._liveTunnels.get(tunnelId);

    if (!tunnel || !(tunnel instanceof Tunnel)) {
      throw new Error('getTunnelStatus: Invalid instance encountered');
    }
    
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
    const tunnelIterator: Iterator<string> = this._liveTunnels.keys();
    let tunnelId: string | null;
    // Iterate and shutdown all live instances
    while ((tunnelId = tunnelIterator.next().value) != null) {
      await this.shutdownTunnel(tunnelId);
    }
    // Destroy associated router
    await this._router.destroy();
  }
}

export function createStore (): TunnelStore {
  return new TunnelStore();
}
