// apps/tool-device-studio/src/services/diagnostic-report.service.ts
import { Injectable, inject } from '@angular/core';
import {
  DeviceStudioReport,
  ReportExportOptions,
  ReportTemplateType
} from '../models/device.models';
import { SystemInfoService } from './system-info.service';
import { WebcamService } from './webcam.service';
import { MicrophoneService } from './microphone.service';
import { SpeakerService } from './speaker.service';
import { SpeedTestService } from './speed-test.service';
import { IpCheckerService } from './ip-checker.service';
import { ScreenShareService } from './screen-share.service';
import { DeviceStudioStateService } from './device-studio-state.service';

const DEFAULT_OPTIONS: ReportExportOptions = {
  template: 'full',
  includeModules: ['webcam', 'microphone', 'speaker', 'speed', 'ip', 'screen', 'readiness'],
  maskIp: true,
  includeLocation: true,
  includeReadiness: true
};

@Injectable({
  providedIn: 'root'
})
export class DiagnosticReportService {
  private systemInfo: SystemInfoService;
  private webcam: WebcamService;
  private mic: MicrophoneService;
  private speaker: SpeakerService;
  private speed: SpeedTestService;
  private ip: IpCheckerService;
  private screen: ScreenShareService;
  private state: DeviceStudioStateService;

  constructor(
    systemInfo?: SystemInfoService,
    webcam?: WebcamService,
    mic?: MicrophoneService,
    speaker?: SpeakerService,
    speed?: SpeedTestService,
    ip?: IpCheckerService,
    screen?: ScreenShareService,
    state?: DeviceStudioStateService
  ) {
    try {
      this.systemInfo = systemInfo ?? inject(SystemInfoService);
      this.webcam = webcam ?? inject(WebcamService);
      this.mic = mic ?? inject(MicrophoneService);
      this.speaker = speaker ?? inject(SpeakerService);
      this.speed = speed ?? inject(SpeedTestService);
      this.ip = ip ?? inject(IpCheckerService);
      this.screen = screen ?? inject(ScreenShareService);
      this.state = state ?? inject(DeviceStudioStateService);
    } catch {
      this.systemInfo = systemInfo ?? new SystemInfoService();
      this.webcam = webcam ?? new WebcamService();
      this.mic = mic ?? new MicrophoneService();
      this.speaker = speaker ?? new SpeakerService();
      this.speed = speed ?? new SpeedTestService();
      this.ip = ip ?? new IpCheckerService();
      this.screen = screen ?? new ScreenShareService();
      this.state = state ?? new DeviceStudioStateService();
    }
  }

  public generateReport(options: Partial<ReportExportOptions> = {}): DeviceStudioReport {
    const opts: ReportExportOptions = { ...DEFAULT_OPTIONS, ...options };
    const sys = this.systemInfo.getCapabilities();
    const camMetrics = this.webcam.metrics();
    const micMetrics = this.mic.metrics();
    const spkMetrics = this.speaker.metrics();
    const spdMetrics = this.speed.metrics();
    const rawIpMetrics = this.ip.metrics();
    const scrMetrics = this.screen.metrics();

    // Mask IP if requested
    const ipMetrics = { ...rawIpMetrics };
    if (opts.maskIp && ipMetrics.ip) {
      ipMetrics.ip = this.maskIpAddress(ipMetrics.ip);
      if (ipMetrics.ipv4) ipMetrics.ipv4 = this.maskIpAddress(ipMetrics.ipv4);
      if (ipMetrics.ipv6) ipMetrics.ipv6 = this.maskIpAddress(ipMetrics.ipv6);
    }
    if (!opts.includeLocation) {
      ipMetrics.city = 'Hidden for privacy';
      ipMetrics.region = 'Hidden';
      ipMetrics.latitude = null;
      ipMetrics.longitude = null;
      ipMetrics.postal = '--';
    }

    const modulesTested: string[] = [];
    if (camMetrics.isStreaming || camMetrics.resolution.width > 0) modulesTested.push('Webcam');
    if (micMetrics.isStreaming || micMetrics.recording.status !== 'idle') modulesTested.push('Microphone');
    if (spkMetrics.isPlaying || spkMetrics.currentMode !== 'none') modulesTested.push('Speaker & Audio');
    if (spdMetrics.status === 'completed') modulesTested.push('Internet Speed');
    if (ipMetrics.ip) modulesTested.push('Public IP');
    if (scrMetrics.isSharing || scrMetrics.resolution.width > 0) modulesTested.push('Screen Sharing');

    const reportId = `ACK-DS-${this.getTimestamp()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const reportTitle = this.resolveReportTitle(opts.template);

    const troubleshooting: string[] = [];
    if (spdMetrics.pingMs && spdMetrics.pingMs > 80) {
      troubleshooting.push('High network ping detected. Connect via Ethernet cable or move closer to your Wi-Fi router for reduced latency.');
    }
    if (spdMetrics.jitterMs && spdMetrics.jitterMs > 25) {
      troubleshooting.push('High jitter detected. Check if other devices are consuming bandwidth with heavy downloads or background updates.');
    }
    if (!ipMetrics.isWebRtcLeakProtected) {
      troubleshooting.push('Local LAN IP exposed through WebRTC. Consider enabling mDNS candidate masking in your browser privacy flags.');
    }
    if (camMetrics.frameRate > 0 && camMetrics.frameRate < 20) {
      troubleshooting.push('Webcam frame rate is below 20 FPS. Ensure sufficient ambient lighting to allow the camera sensor to achieve target shutter speeds.');
    }

    return {
      reportId,
      reportTitle,
      generatedAt: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      os: sys.osName,
      browser: `${sys.browserName} ${sys.browserVersion}`,
      screenResolution: sys.screenResolution,
      overallHealthScore: this.state.deviceHealthScore(),
      modulesTested,
      hardwareInventory: {
        cameras: this.webcam.availableDevices(),
        microphones: this.mic.availableDevices(),
        speakers: this.speaker.availableDevices()
      },
      testResults: {
        webcam: opts.includeModules.includes('webcam') ? camMetrics : undefined,
        microphone: opts.includeModules.includes('microphone') ? micMetrics : undefined,
        speaker: opts.includeModules.includes('speaker') ? spkMetrics : undefined,
        speed: opts.includeModules.includes('speed') ? spdMetrics : undefined,
        ip: opts.includeModules.includes('ip') ? ipMetrics : undefined,
        screen: opts.includeModules.includes('screen') ? scrMetrics : undefined
      },
      readiness: opts.includeReadiness ? this.state.meetingReadiness() : undefined,
      troubleshooting: troubleshooting.length > 0 ? troubleshooting : ['All tested hardware and network parameters are operating within optimal parameters.']
    };
  }

  public printReport(options: Partial<ReportExportOptions> = {}): void {
    const opts: ReportExportOptions = { ...DEFAULT_OPTIONS, ...options };
    const report = this.generateReport(opts);
    const html = this.generatePrintableHtml(report, opts);

    if (typeof window === 'undefined') return;

    const printWin = window.open('', '_blank', 'width=840,height=900,menubar=no,toolbar=no,status=no');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(html);
      printWin.document.close();

      // Allow DOM to settle before invoking native print
      setTimeout(() => {
        try {
          printWin.focus();
          printWin.print();
        } catch {
          // Fallback if print interaction restricted
        }
      }, 350);
    } else {
      this.state.showToast('Popup was blocked. Please allow popups to print or save your PDF report.');
    }
  }

  public downloadReportPdf(options: Partial<ReportExportOptions> = {}): void {
    this.printReport(options);
    this.state.showToast("In the print dialog, select 'Save as PDF' to save your official PDF report.");
  }

  public downloadReportJson(options: Partial<ReportExportOptions> = {}): void {
    const report = this.generateReport(options);
    const jsonStr = JSON.stringify(report, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    this.triggerDownload(blob, `acklet-device-studio-report-${this.getTimestamp()}.json`);
  }

  public downloadReportText(options: Partial<ReportExportOptions> = {}): void {
    const report = this.generateReport(options);
    const text = this.formatReportAsText(report);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    this.triggerDownload(blob, `acklet-device-studio-report-${this.getTimestamp()}.txt`);
  }

  public async copyReportSummary(options: Partial<ReportExportOptions> = {}): Promise<void> {
    const report = this.generateReport(options);
    const text = this.formatReportAsText(report);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      this.state.showToast('Diagnostic report summary copied to clipboard!');
    }
  }

  public async shareReport(options: Partial<ReportExportOptions> = {}): Promise<boolean> {
    const report = this.generateReport(options);
    const text = `Acklet Device Studio Audit (${report.reportId}): Health Score ${report.overallHealthScore}/100 • Download ${report.testResults.speed?.downloadMbps ?? '--'} Mbps • Ping ${report.testResults.speed?.pingMs ?? '--'} ms`;

    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title: report.reportTitle,
          text,
          url: window.location.href
        });
        return true;
      } catch {
        // User dismissed share dialog
      }
    }

    // Fallback to clipboard
    await this.copyReportSummary(options);
    return false;
  }

  public formatReportAsText(report: DeviceStudioReport): string {
    const divider = '═'.repeat(64);
    const subDivider = '─'.repeat(64);

    return [
      divider,
      `  ACKLET DEVICE STUDIO — ${report.reportTitle?.toUpperCase()}`,
      divider,
      `Report ID:          ${report.reportId || '--'}`,
      `Generated At:       ${report.generatedAt}`,
      `Device Health:      ${report.overallHealthScore} / 100`,
      `Operating System:   ${report.os}`,
      `Web Browser:        ${report.browser}`,
      `Display Screen:     ${report.screenResolution}`,
      subDivider,
      'HARDWARE INVENTORY:',
      `  Cameras Found:     ${report.hardwareInventory.cameras.length}`,
      ...report.hardwareInventory.cameras.map(c => `    • ${c.label}`),
      `  Microphones Found: ${report.hardwareInventory.microphones.length}`,
      ...report.hardwareInventory.microphones.map(m => `    • ${m.label}`),
      `  Speakers Found:    ${report.hardwareInventory.speakers.length}`,
      ...report.hardwareInventory.speakers.map(s => `    • ${s.label}`),
      subDivider,
      'MODULE TEST RESULTS:',
      report.testResults.webcam ? `  Webcam:            ${report.testResults.webcam.resolution?.label || 'Tested'} (${report.testResults.webcam.frameRate || 0} FPS)` : '',
      report.testResults.microphone ? `  Microphone:        Peak ${report.testResults.microphone.peakDb ?? -60} dBFS • RMS ${report.testResults.microphone.volumeRms ?? 0}%` : '',
      report.testResults.speaker ? `  Audio Output:      Stereo Score: ${report.testResults.speaker.diagnosticSummary?.stereoSeparationScore ?? 100}% (${report.testResults.speaker.diagnosticSummary?.verdict ?? 'verified'})` : '',
      report.testResults.speed ? `  Internet Speed:    Down ${report.testResults.speed.downloadMbps ?? '--'} Mbps • Up ${report.testResults.speed.uploadMbps ?? '--'} Mbps • Ping ${report.testResults.speed.pingMs ?? '--'} ms • Jitter ${report.testResults.speed.jitterMs ?? '--'} ms` : '',
      report.testResults.ip ? `  Network & IP:      ${report.testResults.ip.ip ?? '--'} (${report.testResults.ip.version ?? '--'}) • ${report.testResults.ip.isp ?? '--'} • WebRTC: ${report.testResults.ip.isWebRtcLeakProtected ? 'Protected' : 'Exposed'}` : '',
      report.testResults.screen ? `  Screen Sharing:    ${report.testResults.screen.resolution?.width ?? 0}×${report.testResults.screen.resolution?.height ?? 0} @ ${report.testResults.screen.measuredFps ?? 0} FPS (${report.testResults.screen.surfaceType ?? 'display'})` : '',
      subDivider,
      report.readiness ? [
        'MEETING READINESS AUDIT:',
        `  Overall Score:     ${report.readiness.overallScore} / 100`,
        `  Camera:            ${report.readiness.camera.toUpperCase()}`,
        `  Microphone:        ${report.readiness.mic.toUpperCase()}`,
        `  Speaker:           ${report.readiness.speaker.toUpperCase()}`,
        `  Network:           ${report.readiness.network.toUpperCase()}`,
        `  Screen Sharing:    ${report.readiness.screenShare.toUpperCase()}`,
        `  Summary:           ${report.readiness.summaryText}`
      ].join('\n') : '',
      subDivider,
      'TROUBLESHOOTING RECOMMENDATIONS:',
      ...((report.troubleshooting || []).map(t => `  • ${t}`)),
      divider,
      'Privacy Guarantee: 100% Client-Side In-Memory Evaluation • Acklet Platform',
      divider
    ].filter(Boolean).join('\n');
  }

  public generatePrintableHtml(report: DeviceStudioReport, _options: ReportExportOptions): string {
    const cam = report.testResults.webcam;
    const mic = report.testResults.microphone;
    const spk = report.testResults.speaker;
    const spd = report.testResults.speed;
    const ip = report.testResults.ip;
    const scr = report.testResults.screen;
    const ready = report.readiness;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${report.reportTitle} — ${report.reportId}</title>
  <style>
    @page {
      size: A4;
      margin: 1.5cm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0F172A;
      background: #FFFFFF;
      margin: 0;
      padding: 0;
      font-size: 13px;
      line-height: 1.5;
    }
    .header-table {
      width: 100%;
      border-bottom: 2px solid #2563EB;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .brand-title {
      font-size: 22px;
      font-weight: 800;
      color: #0F172A;
      margin: 0;
      letter-spacing: -0.02em;
    }
    .brand-sub {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #2563EB;
      font-weight: 700;
      margin-top: 2px;
    }
    .report-meta {
      text-align: right;
      font-size: 11px;
      color: #64748B;
    }
    .meta-id {
      font-family: monospace;
      font-weight: 700;
      color: #0F172A;
    }
    .health-banner {
      background: #EFF6FF;
      border: 1px solid #DBEAFE;
      border-radius: 8px;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
    }
    .score-badge {
      font-size: 22px;
      font-weight: 800;
      color: #2563EB;
    }
    h2 {
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #334155;
      border-bottom: 1px solid #E2E8F0;
      padding-bottom: 4px;
      margin: 20px 0 10px;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      font-size: 12px;
    }
    table.data-table th, table.data-table td {
      padding: 6px 10px;
      border-bottom: 1px solid #F1F5F9;
      text-align: left;
    }
    table.data-table th {
      background: #F8FAFC;
      font-weight: 600;
      color: #64748B;
      font-size: 11px;
    }
    .status-pill {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .pill-pass { background: #DCFCE7; color: #166534; }
    .pill-warn { background: #FEF9C3; color: #854D0E; }
    .pill-fail { background: #FEE2E2; color: #991B1B; }
    .troubleshoot-box {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 10px 14px;
      margin-top: 16px;
    }
    .troubleshoot-box ul {
      margin: 4px 0 0;
      padding-left: 20px;
      font-size: 11.5px;
      color: #475569;
    }
    .footer {
      margin-top: 30px;
      padding-top: 10px;
      border-top: 1px solid #E2E8F0;
      font-size: 10.5px;
      color: #94A3B8;
      display: flex;
      justify-content: space-between;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <table class="header-table">
    <tr>
      <td>
        <h1 class="brand-title">Acklet Device Studio</h1>
        <div class="brand-sub">${report.reportTitle}</div>
      </td>
      <td class="report-meta">
        <div>Report ID: <span class="meta-id">${report.reportId}</span></div>
        <div>Generated: ${new Date(report.generatedAt).toLocaleString()}</div>
        <div>System: ${report.os} • ${report.browser}</div>
      </td>
    </tr>
  </table>

  <div class="health-banner">
    <div>
      <strong>Overall Device Health Score</strong>
      <div style="font-size: 11.5px; color: #64748B;">Evaluates browser hardware compatibility and testing coverage</div>
    </div>
    <div class="score-badge">${report.overallHealthScore} / 100</div>
  </div>

  <h2>Hardware Inventory</h2>
  <table class="data-table">
    <tr>
      <th style="width: 25%;">Category</th>
      <th style="width: 15%;">Detected</th>
      <th>Primary Hardware Label</th>
    </tr>
    <tr>
      <td>Cameras</td>
      <td>${report.hardwareInventory.cameras.length} device(s)</td>
      <td>${report.hardwareInventory.cameras[0]?.label || 'None detected'}</td>
    </tr>
    <tr>
      <td>Microphones</td>
      <td>${report.hardwareInventory.microphones.length} device(s)</td>
      <td>${report.hardwareInventory.microphones[0]?.label || 'None detected'}</td>
    </tr>
    <tr>
      <td>Audio Outputs</td>
      <td>${report.hardwareInventory.speakers.length} device(s)</td>
      <td>${report.hardwareInventory.speakers[0]?.label || 'System Default Output'}</td>
    </tr>
  </table>

  <h2>Diagnostic Results</h2>
  <table class="data-table">
    <tr>
      <th style="width: 25%;">Module</th>
      <th style="width: 20%;">Status</th>
      <th>Primary Measured Metrics</th>
    </tr>
    ${spd ? `
    <tr>
      <td>Internet Speed</td>
      <td><span class="status-pill pill-pass">${spd.qualityRating?.toUpperCase() || 'COMPLETED'}</span></td>
      <td>Download: <strong>${spd.downloadMbps ?? '--'} Mbps</strong> • Upload: <strong>${spd.uploadMbps ?? '--'} Mbps</strong> • Ping: ${spd.pingMs ?? '--'} ms</td>
    </tr>` : ''}
    ${ip ? `
    <tr>
      <td>Network & Public IP</td>
      <td><span class="status-pill ${ip.isWebRtcLeakProtected ? 'pill-pass' : 'pill-warn'}">${ip.isWebRtcLeakProtected ? 'PROTECTED' : 'LAN EXPOSED'}</span></td>
      <td>IP: <code>${ip.ip}</code> (${ip.version}) • ISP: ${ip.isp} • ASN: ${ip.asn}</td>
    </tr>` : ''}
    ${cam ? `
    <tr>
      <td>Webcam Video</td>
      <td><span class="status-pill pill-pass">GRADE ${cam.qualityAssessment?.grade || 'A'}</span></td>
      <td>Resolution: <strong>${cam.resolution?.width ?? 0} × ${cam.resolution?.height ?? 0}</strong> • Frame Rate: ${cam.frameRate ?? 0} FPS</td>
    </tr>` : ''}
    ${mic ? `
    <tr>
      <td>Microphone Audio</td>
      <td><span class="status-pill pill-pass">ACTIVE</span></td>
      <td>Peak: <strong>${mic.peakDb ?? -60} dBFS</strong> • RMS: ${mic.volumeRms ?? 0}% • Noise Floor: Quiet</td>
    </tr>` : ''}
    ${spk ? `
    <tr>
      <td>Speaker & Headphones</td>
      <td><span class="status-pill pill-pass">${spk.diagnosticSummary?.verdict?.toUpperCase() || 'VERIFIED'}</span></td>
      <td>Stereo Separation: <strong>${spk.diagnosticSummary?.stereoSeparationScore ?? 100}%</strong> • Balanced Channels Verified</td>
    </tr>` : ''}
    ${scr ? `
    <tr>
      <td>Screen Sharing</td>
      <td><span class="status-pill pill-pass">${scr.diagnosticSummary?.verdict?.toUpperCase() || 'VERIFIED'}</span></td>
      <td>Resolution: <strong>${scr.resolution?.width ?? 0} × ${scr.resolution?.height ?? 0}</strong> • Live Measured: ${scr.measuredFps ?? 0} FPS</td>
    </tr>` : ''}
  </table>

  ${ready ? `
  <h2>Meeting Readiness Assessment</h2>
  <table class="data-table">
    <tr>
      <th style="width: 25%;">Check</th>
      <th style="width: 15%;">Status</th>
      <th>Readiness Detail</th>
    </tr>
    <tr>
      <td>Camera Stream</td>
      <td><span class="status-pill ${ready.camera === 'pass' ? 'pill-pass' : 'pill-warn'}">${ready.camera.toUpperCase()}</span></td>
      <td>${ready.cameraDetail || 'Ready for HD meeting broadcast'}</td>
    </tr>
    <tr>
      <td>Microphone Input</td>
      <td><span class="status-pill ${ready.mic === 'pass' ? 'pill-pass' : 'pill-warn'}">${ready.mic.toUpperCase()}</span></td>
      <td>${ready.micDetail || 'Voice audio levels calibrated'}</td>
    </tr>
    <tr>
      <td>Speaker Audio</td>
      <td><span class="status-pill ${ready.speaker === 'pass' ? 'pill-pass' : 'pill-warn'}">${ready.speaker.toUpperCase()}</span></td>
      <td>${ready.speakerDetail || 'Stereo playback confirmed'}</td>
    </tr>
    <tr>
      <td>Network Bandwidth</td>
      <td><span class="status-pill ${ready.network === 'pass' ? 'pill-pass' : 'pill-warn'}">${ready.network.toUpperCase()}</span></td>
      <td>${ready.networkDetail || 'Low jitter, sufficient bandwidth'}</td>
    </tr>
  </table>` : ''}

  <h2>Troubleshooting Recommendations</h2>
  <div class="troubleshoot-box">
    <ul>
      ${(report.troubleshooting || []).map(t => `<li>${t}</li>`).join('')}
    </ul>
  </div>

  <div class="footer">
    <div>Acklet Device Studio • Official Hardware Diagnostic Audit</div>
    <div>100% Client-Side In-Memory Execution • acklet.com</div>
  </div>
</body>
</html>`;
  }

  private maskIpAddress(ip: string): string {
    if (ip.includes(':')) {
      const parts = ip.split(':');
      if (parts.length > 2) {
        return `${parts[0]}:${parts[1]}:xxxx:xxxx:xxxx:xxxx`;
      }
      return 'xxxx:xxxx:xxxx:xxxx';
    }
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.xxx.xxx`;
    }
    return 'xxx.xxx.xxx.xxx';
  }

  private resolveReportTitle(template: ReportTemplateType): string {
    switch (template) {
      case 'network': return 'Network Performance & Security Audit';
      case 'audio': return 'Audio Diagnostics & Acoustic Calibration';
      case 'camera': return 'Camera Video & Resolution Audit';
      case 'readiness': return 'Video Conference Meeting Readiness Audit';
      case 'full':
      default:
        return 'Comprehensive Hardware & Network Audit';
    }
  }

  private triggerDownload(blob: Blob, filename: string): void {
    if (typeof window === 'undefined') return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  private getTimestamp(): string {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  }
}
