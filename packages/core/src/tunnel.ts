import execa from 'execa';
import { ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { nanoid } from 'nanoid';

import {
  TunnelState,
  TunnelRouteIdentifier,
  URL,
  CLOUDFLARED_PATH,
  TEMPORARY_CLOUDFLARE_URL,
  READY_EVENT,
  FINISH_EVENT,
  CLOSE_EVENT,
  EXIT_EVENT,
  DATA_EVENT
} from './constants';

export default class Tunnel extends EventEmitter {
  private _tunnelProcess: ChildProcess | null;
  private _rid: string;
  private _address: string;
  private _debug: boolean;
  private _state: TunnelState;

  constructor (name: string, address: URL, debug = false) {
    super();

    this._rid = `${name}_${nanoid()}`;
    this._address = address;
    this._debug = debug;
    this._state = TunnelState.PENDING;
    this._tunnelProcess = null;
  }

  public get id (): TunnelRouteIdentifier {
    return this._rid;
  }

  public get address (): string {
    return this._address;
  }

  public get currentState (): TunnelState {
    return this._state;
  }

  private _cleanup (): void {
    if (!this._tunnelProcess) {
      throw new Error('cleanup: No tunnel process exists');
    }
    this._state = TunnelState.DISABLED;
    this.emit(FINISH_EVENT);
    this._tunnelProcess.removeAllListeners();
    this.removeAllListeners();
  }

  private _setupHandlers (): void {
    if (!this._tunnelProcess || !this._tunnelProcess.stderr) {
      throw new Error('setupHandlers: No tunnel process exists');
    }
    this._tunnelProcess.stderr.on(DATA_EVENT, (data: Buffer) => {
      const line: string = data.toString().trim();
      const lineMatch: RegExpMatchArray | null = line.match(TEMPORARY_CLOUDFLARE_URL);
      
      if (lineMatch && lineMatch.length > 1) {
        const publicURL: URL = lineMatch[1];
        if (this._debug) {
          console.log(`Match: ${publicURL}`);
        }
        // Change state and emit ready
        this._state = TunnelState.ACTIVE;
        this.emit(READY_EVENT, publicURL);
      }
      if (this._debug) {
        console.log(line);
      }
    });
    // Setup cleanup handlers
    this._tunnelProcess.on('error', (err: Error) => this.emit('error', err));
    this._tunnelProcess.once(CLOSE_EVENT, () => this._cleanup.bind(this));
    this._tunnelProcess.once(EXIT_EVENT, () => this._cleanup.bind(this));
  }

  private _open (): void {
    try {
      this._tunnelProcess = execa(CLOUDFLARED_PATH, ['tunnel', '--url', this._address]);
    } catch (err) {
      console.error(err);
      throw new Error('create: unable to spawn new cloudflared process');
    }
    this._setupHandlers();
  }

  public destroy (): void {
    if (!this._tunnelProcess) {
      throw new Error('destroy: No child process found');
    }
    this._tunnelProcess.kill('SIGKILL');
    this._tunnelProcess.unref();
  }

  public static create (name: string, address: string, debug = false): Tunnel {    
    const tunnel: Tunnel = new Tunnel(name, address, debug);
    tunnel._open();
    return tunnel;
  }
}
