import { EventEmitter } from 'events';
import {
  setIntervalAsync,
  clearIntervalAsync,
  SetIntervalAsyncTimer,
} from 'set-interval-async/fixed';
import isReachable from 'is-reachable';
import {
  URL,
  DEFAULT_TIMEOUT_INTERVAL_MS,
} from './constants';
// Simple interface for defining tasks
abstract class Task extends EventEmitter {
  constructor () {
    super();
  }

  public start (): void {
    throw new Error('start: Method not implemented');
  }

  public stop (): void {
    throw new Error('stop: Method not implemented');
  }
}
// Discrete task for long running health checks on services (origin)
export class UpstreamHealthTask extends Task {
  private _intervalTimer: SetIntervalAsyncTimer | null;
  private _targetURL: URL;
  private _stopOnTimeout: boolean;
  private _intervalInMs: number;

  constructor (targetURL: URL, stopOnTimeout = true, intervalInMs = DEFAULT_TIMEOUT_INTERVAL_MS) {
    super();

    this._intervalTimer = null;
    this._targetURL = targetURL;
    this._stopOnTimeout = stopOnTimeout;
    this._intervalInMs = intervalInMs;
  }

  private async _run (): Promise<void> {
    const result: boolean = await UpstreamHealthTask.checkAvailable(this._targetURL);
    if (!result) {
      // Emit timeout event
      this.emit('timeout');
      // Automatically end task once timeout has occured if flag is enabled
      if (this._stopOnTimeout) {
        this.stop();
      }
    }
  }

  public static async checkAvailable (url: URL): Promise<boolean> {
    return await isReachable(url);
  }

  public start (): void {
    if (this._intervalTimer) {
      throw new Error('start: Active timer encountered');
    }
    this._intervalTimer = setIntervalAsync(this._run.bind(this), this._intervalInMs);
  }

  public stop (): void {
    if (!this._intervalTimer) {
      throw new Error('stop: No active timer encountered');
    }
    clearIntervalAsync(this._intervalTimer);
    this.removeAllListeners();
  }
}
