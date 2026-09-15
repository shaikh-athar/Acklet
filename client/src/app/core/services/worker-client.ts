/**
 * @acklet/worker-sdk - Universal Web Worker Job Client
 * Handles standardized job dispatching, cancellation, error envelopes, and superseding of in-flight tasks.
 */

export type WorkerJobStatus = 'success' | 'error' | 'cancelled';

export interface WorkerJobRequest<TReq = any> {
  jobId: string;
  type: string;
  payload: TReq;
  toolId?: string;
  timestamp: number;
}

export interface WorkerJobResponse<TRes = any> {
  jobId: string;
  type: string;
  status: WorkerJobStatus;
  result?: TRes;
  error?: string;
  errorStack?: string;
}

export interface WorkerJobOptions {
  timeoutMs?: number;
  cancelSuperseded?: boolean; // Automatically cancel in-flight jobs of the same type
}

export class AckletWorkerClient {
  private worker: Worker | null = null;
  private pendingJobs = new Map<string, {
    type: string;
    resolve: (res: any) => void;
    reject: (err: any) => void;
    timer: any;
  }>();

  private activeJobByType = new Map<string, string>(); // type -> latest jobId

  constructor(private workerFactory: () => Worker) {
    this.initWorker();
  }

  private initWorker() {
    if (typeof Worker === 'undefined') return;

    try {
      this.worker = this.workerFactory();
      this.worker.onmessage = (event: MessageEvent<WorkerJobResponse>) => {
        const { jobId, status, result, error } = event.data;
        const pending = this.pendingJobs.get(jobId);
        if (!pending) return;

        clearTimeout(pending.timer);
        this.pendingJobs.delete(jobId);

        if (status === 'success') {
          pending.resolve(result);
        } else if (status === 'cancelled') {
          pending.reject(new Error(`Worker job ${jobId} was cancelled`));
        } else {
          pending.reject(new Error(error || 'Worker execution failed'));
        }
      };

      this.worker.onerror = (err) => {
        console.error('[AckletWorkerClient] Worker runtime error:', err);
      };
    } catch (e) {
      console.error('[AckletWorkerClient] Failed to initialize worker:', e);
    }
  }

  /**
   * Dispatches a job to the worker with cancellation and timeout protection.
   */
  async runJob<TReq, TRes>(
    type: string,
    payload: TReq,
    options: WorkerJobOptions = {}
  ): Promise<TRes> {
    const { timeoutMs = 15000, cancelSuperseded = true } = options;

    if (!this.worker) {
      throw new Error('Worker environment is unavailable');
    }

    // Automatically cancel previously in-flight job of the same type
    if (cancelSuperseded && this.activeJobByType.has(type)) {
      const prevJobId = this.activeJobByType.get(type)!;
      this.cancel(prevJobId);
    }

    const jobId = 'job_' + type + '_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
    this.activeJobByType.set(type, jobId);

    return new Promise<TRes>((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pendingJobs.has(jobId)) {
          this.pendingJobs.delete(jobId);
          if (this.activeJobByType.get(type) === jobId) {
            this.activeJobByType.delete(type);
          }
          reject(new Error(`Worker job "${type}" (${jobId}) timed out after ${timeoutMs}ms`));
        }
      }, timeoutMs);

      this.pendingJobs.set(jobId, { type, resolve, reject, timer });

      const request: WorkerJobRequest<TReq> = {
        jobId,
        type,
        payload,
        timestamp: Date.now()
      };

      this.worker!.postMessage(request);
    });
  }

  /**
   * Explicitly cancel an in-flight job.
   */
  cancel(jobId: string) {
    const pending = this.pendingJobs.get(jobId);
    if (pending) {
      clearTimeout(pending.timer);
      this.pendingJobs.delete(jobId);
      if (this.activeJobByType.get(pending.type) === jobId) {
        this.activeJobByType.delete(pending.type);
      }
      pending.reject(new Error(`Job ${jobId} was superseded`));

      if (this.worker) {
        this.worker.postMessage({ jobId, type: 'CANCEL_JOB', payload: null, timestamp: Date.now() });
      }
    }
  }

  /**
   * Cleanly terminate the worker.
   */
  destroy() {
    for (const [jobId, job] of this.pendingJobs.entries()) {
      clearTimeout(job.timer);
      job.reject(new Error('Worker client destroyed'));
    }
    this.pendingJobs.clear();
    this.activeJobByType.clear();

    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}
