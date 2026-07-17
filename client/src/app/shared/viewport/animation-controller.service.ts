import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AnimationControllerService {
  private prefersReducedMotion = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
  }

  manageTimeline(timeline: any) {
    if (this.prefersReducedMotion) {
      timeline.progress(1);
      return { play: () => {}, pause: () => {} };
    }

    return {
      play: () => timeline.play(),
      pause: () => timeline.pause()
    };
  }

  manageVideo(video: HTMLVideoElement) {
    return {
      play: () => {
        if (video.paused) {
          video.play().catch(() => {});
        }
      },
      pause: () => {
        if (!video.paused) {
          video.pause();
        }
      }
    };
  }

  createFrameLoop(callback: () => void) {
    if (this.prefersReducedMotion) {
      return { start: () => {}, stop: () => {} };
    }

    let isRunning = false;
    let frameId: number | null = null;

    const loop = () => {
      if (!isRunning) return;
      callback();
      frameId = requestAnimationFrame(loop);
    };

    return {
      start: () => {
        if (isRunning) return;
        isRunning = true;
        loop();
      },
      stop: () => {
        if (!isRunning) return;
        isRunning = false;
        if (frameId !== null) {
          cancelAnimationFrame(frameId);
          frameId = null;
        }
      }
    };
  }
}
