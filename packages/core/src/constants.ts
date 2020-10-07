const NAMESPACE: string = process.env.NAMESPACE || 'instant-tunnel';

export type URL = string;
export type TunnelRouteIdentifier = string;
export interface TunnelStorePreferences {
  readonly disableTimeoutCheck?: boolean,
  readonly timeoutIntervalPreference: number
}
export interface TunnelRouteEntry {
  readonly config: TunnelRouteConfiguration,
  readonly state: TunnelState,
}
export interface TunnelRouteConfiguration extends TunnelRouteConfigurationRequest {
  readonly id: TunnelRouteIdentifier,
  readonly publicURL: URL,
}
export interface TunnelRouteConfigurationRequest {
  readonly name: string,
  readonly originURL: URL,
  readonly expiration?: number,
  readonly persist?: boolean
}
export enum TunnelState {
  PENDING = 0,
  ACTIVE = 1,
  DISABLED = 2
}
export interface TunnelConnectedEvent {
  readonly id: TunnelRouteIdentifier,
  readonly publicURL: URL
}
export interface TunnelDisconnectedEvent {
  readonly id: TunnelRouteIdentifier,
}
export interface TunnelErrorEvent {
  readonly id: TunnelRouteIdentifier,
  readonly error: Error
}
export interface UpstreamTimeoutEvent {
  readonly id: TunnelRouteIdentifier
}
export interface ExpiredEvent {
  readonly id: TunnelRouteIdentifier
}
export const CONNECTED_EVENT = 'connected';
export const DISCONNECTED_EVENT = 'disconnected';
export const READY_EVENT = 'ready';
export const FINISH_EVENT = 'finish';
export const TIMEOUT_EVENT = 'timeout';
export const EXPIRED_EVENT = 'expired';
export const CLOSE_EVENT = 'close';
export const EXIT_EVENT = 'exit';
export const DATA_EVENT = 'data';
export const CLOUDFLARED_PATH: string = process.env.CLOUDFLARED_PATH || 'cloudflared';
export const TEMPORARY_CLOUDFLARE_URL = /(https:\/\/.+\.trycloudflare\.com)/;
export const VALID_TUNNEL_NAME = /^[A-Za-z-]{2,32}[A-Za-z]$/;
export const TUNNEL_LIST_KEY = `${NAMESPACE}:tunnels`;
export const NAME_FIELD = 'name';
export const ORIGIN_URL_FIELD = 'origin_url';
export const PUBLIC_URL_FIELD = 'public_url';
export const PERSIST_FIELD = 'persist';
export const DEFAULT_STORE_PREFERENCES = Object.freeze({
  disableTimeoutCheck: false,
  timeoutIntervalPreference: 30000 // change default timeout to 30 seconds
});
