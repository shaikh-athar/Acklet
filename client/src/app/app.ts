// src/app/app.ts
import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
  styles: [],
})
export class App implements OnInit {
  private readonly router = inject(Router);
  private lenis?: Lenis;

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      this.lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
      });

      this.lenis.on('scroll', ScrollTrigger.update);

      gsap.ticker.add((time) => {
        this.lenis?.raf(time * 1000);
      });

      gsap.ticker.lagSmoothing(0);

      this.router.events.subscribe((evt) => {
        if (evt instanceof NavigationEnd) {
          this.lenis?.scrollTo(0, { immediate: true });
        }
      });
    }
  }
}
