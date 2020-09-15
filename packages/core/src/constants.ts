const NAMESPACE: string = process.env.NAMESPACE || 'ondemand-tunnel';

export type URL = string;
export type TunnelRouteIdentifier = string;
export interface TunnelRouteConfiguration {
  id: TunnelRouteIdentifier,
  publicURL: URL,
  originURL: URL,
  expiration?: number,
  active?: boolean,
}
export interface TunnelRouteConfigurationRequest {
  name: string,
  originURL: URL,
  expiration?: number,
}
export enum TunnelState {
  PENDING = 0,
  ACTIVE = 1,
  DISABLED = 2
}
export interface TunnelConnectedEvent {
  id: TunnelRouteIdentifier,
  publicURL: URL
}
export interface TunnelDisconnectedEvent {
  id: TunnelRouteIdentifier,
}
export interface TunnelErrorEvent {
  id: TunnelRouteIdentifier,
  error: Error
}
export interface UpstreamTimeoutEvent {
  id: TunnelRouteIdentifier
}
export interface ExpiredEvent {
  id: TunnelRouteIdentifier
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
export const ORIGIN_URL_FIELD = 'origin_url';
export const PUBLIC_URL_FIELD = 'public_url';
export const DEFAULT_TIMEOUT_INTERVAL_MS = 10000;
