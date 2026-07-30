import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../shared/components/icon/icon';

@Component({
  selector: 'app-workspace-analytics',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="an-wrapper">
      <div class="an-header">
        <h1 class="an-title">Tool Analytics</h1>
        <p class="an-subtitle">Developer platform metrics, API traffic, collection bookmarks, and telemetry rankings.</p>
      </div>
 
      <!-- Telemetry Grid -->
      <div class="an-metrics-grid">
        <div class="an-metric-card">
          <div class="an-metric-label">Total Views (30d)</div>
          <div class="an-metric-value">128,490</div>
          <div class="an-metric-trend positive">
            <span class="trend-icon">↑</span>
            <span>+14.2% from last month</span>
          </div>
        </div>
 
        <div class="an-metric-card">
          <div class="an-metric-label">Unique Developers</div>
          <div class="an-metric-value">34,102</div>
          <div class="an-metric-trend positive">
            <span class="trend-icon">↑</span>
            <span>+8.7% new developers</span>
          </div>
        </div>
 
        <div class="an-metric-card">
          <div class="an-metric-label">AI Search Discoveries</div>
          <div class="an-metric-value cyan">19,840</div>
          <div class="an-metric-trend neutral">
            <span>Rank #1 in AST Parsing</span>
          </div>
        </div>
 
        <div class="an-metric-card">
          <div class="an-metric-label">Trust Score</div>
          <div class="an-metric-value emerald">99.9%</div>
          <div class="an-metric-trend positive">
            <span>Verified GitHub Publisher</span>
          </div>
        </div>
      </div>
 
      <!-- Charts Section -->
      <div class="an-charts-grid">
        <!-- Edge Requests Line Chart -->
        <div class="an-chart-card">
          <div class="an-chart-header">
            <div class="an-chart-title-wrap">
              <h3 class="an-chart-title">Edge Requests</h3>
              <p class="an-chart-desc">Total HTTP requests handled across Edge Nodes.</p>
            </div>
            <div class="an-chart-meta">
              <span class="an-chart-summary-val">84.2K total</span>
              <span class="an-chart-period">Past 30 Days</span>
            </div>
          </div>
          <div class="an-chart-canvas">
            <svg class="an-svg-chart" viewBox="0 0 500 150" preserveAspectRatio="none">
              <defs>
                <linearGradient id="cyan-glow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.25"/>
                  <stop offset="100%" stop-color="#06b6d4" stop-opacity="0"/>
                </linearGradient>
              </defs>
              <!-- Grid lines -->
              <line x1="0" y1="30" x2="500" y2="30" class="chart-grid-line" />
              <line x1="0" y1="75" x2="500" y2="75" class="chart-grid-line" />
              <line x1="0" y1="120" x2="500" y2="120" class="chart-grid-line" />
              <!-- Gradient Area -->
              <path d="M 0 150 L 0 110 Q 50 80 100 120 T 200 60 T 300 90 T 400 40 Q 450 70 500 30 L 500 150 Z" fill="url(#cyan-glow)" />
              <!-- Main Line -->
              <path d="M 0 110 Q 50 80 100 120 T 200 60 T 300 90 T 400 40 Q 450 70 500 30" fill="none" stroke="#06b6d4" stroke-width="2.5" stroke-linecap="round" />
              <!-- Hover dot -->
              <circle cx="400" cy="40" r="4.5" fill="#06b6d4" stroke="var(--vercel-card-bg)" stroke-width="2" />
            </svg>
          </div>
          <div class="an-chart-labels">
            <span>Jul 1</span>
            <span>Jul 10</span>
            <span>Jul 20</span>
            <span>Jul 30</span>
          </div>
        </div>
 
        <!-- Bandwidth Bar Chart -->
        <div class="an-chart-card">
          <div class="an-chart-header">
            <div class="an-chart-title-wrap">
              <h3 class="an-chart-title">Data Transfer</h3>
              <p class="an-chart-desc">Bandwidth egress from edge server caching.</p>
            </div>
            <div class="an-chart-meta">
              <span class="an-chart-summary-val">194.2 MB total</span>
              <span class="an-chart-period">Past 30 Days</span>
            </div>
          </div>
          <div class="an-chart-canvas">
            <svg class="an-svg-chart" viewBox="0 0 500 150" preserveAspectRatio="none">
              <!-- Grid lines -->
              <line x1="0" y1="30" x2="500" y2="30" class="chart-grid-line" />
              <line x1="0" y1="75" x2="500" y2="75" class="chart-grid-line" />
              <line x1="0" y1="120" x2="500" y2="120" class="chart-grid-line" />
              
              <!-- Sparkbars -->
              <g class="chart-bars">
                <rect x="15" y="80" width="8" height="70" class="chart-bar" />
                <rect x="35" y="60" width="8" height="90" class="chart-bar" />
                <rect x="55" y="95" width="8" height="55" class="chart-bar" />
                <rect x="75" y="110" width="8" height="40" class="chart-bar" />
                <rect x="95" y="50" width="8" height="100" class="chart-bar" />
                <rect x="115" y="40" width="8" height="110" class="chart-bar" />
                <rect x="135" y="85" width="8" height="65" class="chart-bar" />
                <rect x="155" y="70" width="8" height="80" class="chart-bar" />
                <rect x="175" y="90" width="8" height="60" class="chart-bar" />
                <rect x="195" y="105" width="8" height="45" class="chart-bar" />
                <rect x="215" y="30" width="8" height="120" class="chart-bar active" />
                <rect x="235" y="55" width="8" height="95" class="chart-bar" />
                <rect x="255" y="75" width="8" height="75" class="chart-bar" />
                <rect x="275" y="65" width="8" height="85" class="chart-bar" />
                <rect x="295" y="80" width="8" height="70" class="chart-bar" />
                <rect x="315" y="40" width="8" height="110" class="chart-bar" />
                <rect x="335" y="50" width="8" height="100" class="chart-bar" />
                <rect x="355" y="95" width="8" height="55" class="chart-bar" />
                <rect x="375" y="115" width="8" height="35" class="chart-bar" />
                <rect x="395" y="60" width="8" height="90" class="chart-bar" />
                <rect x="415" y="45" width="8" height="105" class="chart-bar" />
                <rect x="435" y="70" width="8" height="80" class="chart-bar" />
                <rect x="455" y="85" width="8" height="65" class="chart-bar" />
                <rect x="475" y="90" width="8" height="60" class="chart-bar" />
              </g>
            </svg>
          </div>
          <div class="an-chart-labels">
            <span>Jul 1</span>
            <span>Jul 10</span>
            <span>Jul 20</span>
            <span>Jul 30</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .an-wrapper {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
 
    .an-header {
      margin-bottom: 8px;
    }
 
    .an-title {
      font-size: 20px;
      font-weight: 700;
      color: var(--vercel-text-primary);
      margin: 0 0 4px 0;
    }
 
    .an-subtitle {
      font-size: 13px;
      color: var(--vercel-text-secondary);
      margin: 0;
    }
 
    .an-metrics-grid {
      display: grid;
      grid-template-columns: repeat(1, 1fr);
      gap: 16px;
    }
 
    @media (min-width: 640px) {
      .an-metrics-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
 
    @media (min-width: 1024px) {
      .an-metrics-grid {
        grid-template-columns: repeat(4, 1fr);
      }
    }
 
    .an-metric-card {
      background: var(--vercel-card-bg);
      border: 1px solid var(--vercel-border);
      border-radius: 8px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
 
    .an-metric-label {
      font-size: 12px;
      color: var(--vercel-text-muted);
    }
 
    .an-metric-value {
      font-size: 24px;
      font-weight: 700;
      color: var(--vercel-text-primary);
    }
 
    .an-metric-value.cyan { color: #06b6d4; }
    .an-metric-value.emerald { color: #10b981; }
 
    .an-metric-trend {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
    }
 
    .an-metric-trend.positive {
      color: #10b981;
    }
 
    .an-metric-trend.neutral {
      color: var(--vercel-text-muted);
    }
 
    .an-charts-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 24px;
    }
 
    @media (min-width: 1024px) {
      .an-charts-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
 
    .an-chart-card {
      background: var(--vercel-card-bg);
      border: 1px solid var(--vercel-border);
      border-radius: 8px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
 
    .an-chart-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }
 
    .an-chart-title-wrap {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
 
    .an-chart-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--vercel-text-primary);
      margin: 0;
    }
 
    .an-chart-desc {
      font-size: 11px;
      color: var(--vercel-text-muted);
      margin: 0;
    }
 
    .an-chart-meta {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
    }
 
    .an-chart-summary-val {
      font-size: 13px;
      font-weight: 700;
      color: var(--vercel-text-primary);
    }
 
    .an-chart-period {
      font-size: 10px;
      color: var(--vercel-text-muted);
    }
 
    .an-chart-canvas {
      height: 150px;
      position: relative;
    }
 
    .an-svg-chart {
      width: 100%;
      height: 100%;
      overflow: visible;
    }
 
    .chart-grid-line {
      stroke: var(--vercel-border-subtle);
      stroke-width: 1;
      stroke-dasharray: 4 4;
    }
 
    .chart-bar {
      fill: var(--vercel-border);
      rx: 2;
      ry: 2;
      transition: fill 0.15s ease;
    }
 
    .chart-bar:hover, .chart-bar.active {
      fill: var(--vercel-text-primary);
    }
 
    .an-chart-labels {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 10px;
      color: var(--vercel-text-muted);
      font-family: var(--font-mono);
      border-top: 1px solid var(--vercel-border-subtle);
      padding-top: 12px;
    }
  `],
})
export class WorkspaceAnalyticsComponent {}

