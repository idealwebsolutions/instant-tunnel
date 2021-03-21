import { EventEmitter } from 'events';
import {
  setIntervalAsync,
  clearIntervalAsync,
  SetIntervalAsyncTimer,
} from 'set-interval-async/fixed';
import isReachable from 'is-reachable';
import {
  URL,
  TIMEOUT_EVENT,
  EXPIRED_EVENT
} from './constants';
// Simple interface for defining background tasks
export abstract class Task extends EventEmitter {
  constructor () {
    super();
  }

  public abstract start (): void;
  public abstract stop (): void;
}
// Discrete task for handling a scheduled expiration
export class ScheduledCancellationTask extends Task {
  private _timeoutTimer: NodeJS.Timeout | null;
  private _delayInMs: number;

  constructor (delayInMs: number) {
    super();
    
    this._timeoutTimer = null;
    this._delayInMs = delayInMs;
  }

  private _run (): void {
    // Emit expired event
    this.emit(EXPIRED_EVENT);
    // Automatically end task
    this.stop();
  }

  public start (): void {
    if (this._timeoutTimer) {
      throw new Error('start: Active timer encountered');
    }
    this._timeoutTimer = setTimeout(this._run.bind(this), this._delayInMs);
  }

  public stop (): void {
    if (!this._timeoutTimer) {
      throw new Error('stop: No active timer encountered');
    }
    clearTimeout(this._timeoutTimer);
    this.removeAllListeners();
  }
}
// Discrete task for long running health checks on services (origin)
export class UpstreamHealthCheckTask extends Task {
  private _intervalTimer: SetIntervalAsyncTimer | null;
  private _targetURL: URL;
  private _intervalInMs: number;
  private _timeoutOccurances: number;

  constructor (targetURL: URL, intervalInMs: number) {
    super();

    this._intervalTimer = null;
    this._targetURL = targetURL;
    this._intervalInMs = intervalInMs;
    this._timeoutOccurances = 0;
  }

  private async _run (): Promise<void> {
    const result: boolean = await UpstreamHealthCheckTask.checkAvailable(this._targetURL);
    if (!result) {
      // Increment occurance
      this._timeoutOccurances = this._timeoutOccurances + 1;
      // If at least three timeouts occur, timeout and stop
      if (this._timeoutOccurances >= 3) {
        // Emit timeout event
        this.emit(TIMEOUT_EVENT);
        // Automatically end task once timeout has occured
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
