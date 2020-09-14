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
  originHost: string,
  originPort: number,
  expiration?: number,
}
export enum TunnelState {
  PENDING = 0,
  ACTIVE = 1,
  DISABLED = 2
}
export const CLOUDFLARED_PATH: string = process.env.CLOUDFLARED_PATH || 'cloudflared';
export const TEMPORARY_CLOUDFLARE_URL = /(https:\/\/.+\.trycloudflare\.com)/;
export const VALID_TUNNEL_NAME = /^[A-Za-z-]{2,32}[A-Za-z]$/;
export const TUNNEL_LIST_KEY = `${NAMESPACE}:tunnels`;
export const ORIGIN_URL_FIELD = 'origin_url';
export const PUBLIC_URL_FIELD = 'public_url';
export const DEFAULT_TIMEOUT_INTERVAL_MS = 10000;
