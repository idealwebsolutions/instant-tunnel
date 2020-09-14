import execa from 'execa';
import { ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { nanoid } from 'nanoid';

import {
  TunnelState,
  TunnelRouteIdentifier,
  CLOUDFLARED_PATH,
  TEMPORARY_CLOUDFLARE_URL
} from './constants';

export default class Tunnel extends EventEmitter {
  private _tunnelProcess: ChildProcess | null;
  private _rid: string;
  private _address: string;
  private _debug: boolean;
  private _state: TunnelState;

  constructor (name: string, address: string, debug = false) {
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
    this.emit('finish');
    this._tunnelProcess.removeAllListeners();
    this.removeAllListeners();
  }

  private _setupHandlers (): void {
    if (!this._tunnelProcess || !this._tunnelProcess.stderr) {
      throw new Error('setupHandlers: No tunnel process exists');
    }
    this._tunnelProcess.stderr.on('data', (data: Buffer) => {
      const line: string = data.toString().trim();
      const lineMatch: RegExpMatchArray | null = line.match(TEMPORARY_CLOUDFLARE_URL);
      
      if (lineMatch && lineMatch.length > 1) {
        if (this._debug) {
          console.log(`Match: ${lineMatch[1]}`);
        }
        this._state = TunnelState.ACTIVE;
        this.emit('ready', lineMatch[1]);
      }
      if (this._debug) {
        console.log(line);
      }
    });
    // Setup cleanup handlers
    this._tunnelProcess.on('error', (err: Error) => console.error(err)); // TODO: bubble upstream?
    this._tunnelProcess.once('close', () => this._cleanup.bind(this));
    this._tunnelProcess.once('exit', () => this._cleanup.bind(this));
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
    console.log('killing process');
    this._tunnelProcess.kill('SIGKILL');
    this._tunnelProcess.unref();
    console.log('process killed');
  }

  public static create (name: string, address: string, debug = false): Tunnel {    
    const tunnel: Tunnel = new Tunnel(name, address, debug);
    tunnel._open();
    return tunnel;
  }
}
