import { Injectable } from '@angular/core';

export interface WorkerTask<TReq, TRes> {
  type: string;
  payload: TReq;
  id: string;
}

export interface WorkerResponse<TRes> {
  id: string;
  success: boolean;
  result?: TRes;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class WorkerBridgeService {
  private workers = new Map<string, Worker>();
  private pendingCallbacks = new Map<string, { resolve: (val: any) => void; reject: (err: any) => void; timer: any }>();

  /**
   * Execute heavy compute work inside a dedicated or shared Web Worker with timeout protection.
   */
  async runTask<TReq, TRes>(
    workerScriptUrl: string | URL,
    taskType: string,
    payload: TReq,
    timeoutMs = 10000
  ): Promise<TRes> {
    const scriptKey = workerScriptUrl.toString();
    let worker = this.workers.get(scriptKey);

    if (!worker) {
      worker = new Worker(workerScriptUrl, { type: 'module' });
      worker.onmessage = (event: MessageEvent<WorkerResponse<TRes>>) => {
        const { id, success, result, error } = event.data;
        const pending = this.pendingCallbacks.get(id);
        if (pending) {
          clearTimeout(pending.timer);
          this.pendingCallbacks.delete(id);
          if (success) {
            pending.resolve(result);
          } else {
            pending.reject(new Error(error || 'Worker execution failed'));
          }
        }
      };

      worker.onerror = (err) => {
        console.error('WebWorker runtime error:', err);
        // Clear and reject all pending tasks so UI does not hang or freeze
        this.pendingCallbacks.forEach((cb, taskId) => {
          clearTimeout(cb.timer);
          cb.reject(new Error('WebWorker crashed or failed'));
        });
        this.pendingCallbacks.clear();
        // Remove dead worker instance so subsequent tasks spawn a fresh healthy worker
        this.workers.delete(scriptKey);
        try {
          worker?.terminate();
        } catch {}
      };

      this.workers.set(scriptKey, worker);
    }

    const taskId = 'task_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();

    return new Promise<TRes>((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pendingCallbacks.has(taskId)) {
          this.pendingCallbacks.delete(taskId);
          reject(new Error(`Worker task "${taskType}" timed out after ${timeoutMs}ms`));
        }
      }, timeoutMs);

      this.pendingCallbacks.set(taskId, { resolve, reject, timer });

      worker!.postMessage({
        type: taskType,
        id: taskId,
        payload
      });
    });
  }

  /**
   * Terminate a worker instance to reclaim volatile memory.
   */
  terminate(workerScriptUrl: string | URL) {
    const key = workerScriptUrl.toString();
    const worker = this.workers.get(key);
    if (worker) {
      worker.terminate();
      this.workers.delete(key);
    }
  }
}
