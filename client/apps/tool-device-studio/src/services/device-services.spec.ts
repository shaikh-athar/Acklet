// apps/tool-device-studio/src/services/device-services.spec.ts
import '@angular/compiler';
import { describe, it, expect } from 'vitest';
import { WebcamService } from './webcam.service';
import { MicrophoneService } from './microphone.service';
import { SpeakerService } from './speaker.service';
import { SpeedTestService } from './speed-test.service';
import { IpCheckerService } from './ip-checker.service';
import { ScreenShareService } from './screen-share.service';
import { DiagnosticHistoryService } from './diagnostic-history.service';
import { DiagnosticReportService } from './diagnostic-report.service';

describe('Device Studio Hardware & Network Services', () => {
  describe('WebcamService', () => {
    it('should initialize with default webcam metrics, ladder and quality assessment', () => {
      const service = new WebcamService();
      const m = service.metrics();
      expect(m.isStreaming).toBe(false);
      expect(m.isMirrored).toBe(true);
      expect(m.streamState).toBe('stopped');
      expect(m.resolution.label).toBe('Not Connected');
      expect(m.snapshots).toEqual([]);
      expect(m.qualityAssessment.score).toBe(0);
      expect(m.qualityAssessment.grade).toBe('C');
      expect(m.resolutionLadder.length).toBe(5);
    });

    it('should toggle mirror horizontal preview', () => {
      const service = new WebcamService();
      expect(service.metrics().isMirrored).toBe(true);
      service.toggleMirror();
      expect(service.metrics().isMirrored).toBe(false);
      service.toggleMirror();
      expect(service.metrics().isMirrored).toBe(true);
    });

    it('should toggle facing mode between user and environment', async () => {
      const service = new WebcamService();
      expect(service.metrics().facingMode).toBe('user');
      await service.toggleFacingMode();
      expect(service.metrics().facingMode).toBe('environment');
      await service.toggleFacingMode();
      expect(service.metrics().facingMode).toBe('user');
    });

    it('should manage snapshots deletion and clearing', () => {
      const service = new WebcamService();
      service.metrics.update(m => ({ ...m, snapshots: ['snap1', 'snap2', 'snap3'] }));
      expect(service.metrics().snapshots.length).toBe(3);

      service.deleteSnapshot(1);
      expect(service.metrics().snapshots).toEqual(['snap1', 'snap3']);

      service.clearAllSnapshots();
      expect(service.metrics().snapshots).toEqual([]);
    });

    it('should safely return false when copying out-of-bounds snapshot', async () => {
      const service = new WebcamService();
      const res = await service.copySnapshotToClipboard(99);
      expect(res).toBe(false);
    });
  });

  describe('MicrophoneService', () => {
    it('should initialize with default microphone metrics, silence state, and recording metadata', () => {
      const service = new MicrophoneService();
      const m = service.metrics();
      expect(m.isStreaming).toBe(false);
      expect(m.streamState).toBe('stopped');
      expect(m.volumeRms).toBe(0);
      expect(m.peakDb).toBe(-60);
      expect(m.peakHoldDb).toBe(-60);
      expect(m.isClipping).toBe(false);
      expect(m.isSilent).toBe(true);
      expect(m.recording.status).toBe('idle');
      expect(m.qualityAssessment.score).toBe(0);
      expect(m.levelHistory.length).toBe(32);
    });

    it('should reject startRecording when stream is not active', async () => {
      const service = new MicrophoneService();
      await expect(service.startRecording(5)).rejects.toThrow('Microphone stream is not active.');
    });

    it('should reset recording state when retakeRecording is called', () => {
      const service = new MicrophoneService();
      service.metrics.update(m => ({
        ...m,
        recording: {
          status: 'recorded',
          durationSeconds: 5,
          maxDurationSeconds: 15,
          blobUrl: 'blob:http://localhost/sample-123',
          blobSize: 1024,
          mimeType: 'audio/webm'
        }
      }));
      expect(service.metrics().recording.status).toBe('recorded');

      service.retakeRecording();
      expect(service.metrics().recording.status).toBe('idle');
      expect(service.metrics().recording.blobUrl).toBeUndefined();
    });

    it('should stop stream cleanly and reset active volume metrics', () => {
      const service = new MicrophoneService();
      service.metrics.update(m => ({
        ...m,
        isStreaming: true,
        volumeRms: 55,
        peakDb: -12,
        isClipping: true
      }));

      service.stopStream();
      const m = service.metrics();
      expect(m.isStreaming).toBe(false);
      expect(m.streamState).toBe('stopped');
      expect(m.volumeRms).toBe(0);
      expect(m.peakDb).toBe(-60);
      expect(m.isClipping).toBe(false);
      expect(m.isSilent).toBe(true);
    });
  });

  describe('SpeakerService', () => {
    it('should initialize with default speaker metrics, confirmations, and diagnostic summary', () => {
      const service = new SpeakerService();
      const m = service.metrics();
      expect(m.isPlaying).toBe(false);
      expect(m.currentMode).toBe('none');
      expect(m.masterVolume).toBe(60);
      expect(m.panValue).toBe(0);
      expect(m.isMuted).toBe(false);
      expect(m.confirmations.leftConfirmed).toBeNull();
      expect(m.diagnosticSummary.verdict).toBe('untested');
    });

    it('should update volume within clamped boundaries [0, 100]', () => {
      const service = new SpeakerService();
      service.setVolume(50);
      expect(service.metrics().masterVolume).toBe(50);

      service.setVolume(150);
      expect(service.metrics().masterVolume).toBe(100);

      service.setVolume(-20);
      expect(service.metrics().masterVolume).toBe(0);
    });

    it('should update pan within clamped boundaries [-1.0, 1.0]', () => {
      const service = new SpeakerService();
      service.setPan(-0.5);
      expect(service.metrics().panValue).toBe(-0.5);

      service.setPan(2.5);
      expect(service.metrics().panValue).toBe(1.0);

      service.setPan(-3.0);
      expect(service.metrics().panValue).toBe(-1.0);
    });

    it('should toggle mute state', () => {
      const service = new SpeakerService();
      expect(service.metrics().isMuted).toBe(false);
      service.toggleMute();
      expect(service.metrics().isMuted).toBe(true);
      service.toggleMute();
      expect(service.metrics().isMuted).toBe(false);
    });

    it('should update confirmations and compute diagnostic verdicts', () => {
      const service = new SpeakerService();
      
      // Confirming left and right
      service.confirmResult('leftConfirmed', true);
      service.confirmResult('rightConfirmed', true);
      expect(service.metrics().diagnosticSummary.verdict).toBe('partial');

      // Confirming stereo
      service.confirmResult('stereoConfirmed', true);
      expect(service.metrics().diagnosticSummary.verdict).toBe('verified');
      expect(service.metrics().diagnosticSummary.stereoSeparationScore).toBe(90);

      // Confirming frequencies
      service.confirmResult('frequenciesConfirmed', true);
      expect(service.metrics().diagnosticSummary.stereoSeparationScore).toBe(100);

      // Flagging an issue
      service.confirmResult('leftConfirmed', false);
      expect(service.metrics().diagnosticSummary.verdict).toBe('issue');
      expect(service.metrics().diagnosticSummary.stereoSeparationScore).toBe(40);

      // Resetting
      service.resetConfirmations();
      expect(service.metrics().confirmations.leftConfirmed).toBeNull();
      expect(service.metrics().diagnosticSummary.verdict).toBe('untested');
    });
  });

  describe('SpeedTestService', () => {
    it('should initialize with idle status, default suitability, and history', () => {
      const service = new SpeedTestService();
      const m = service.metrics();
      expect(m.status).toBe('idle');
      expect(m.downloadMbps).toBeNull();
      expect(m.uploadMbps).toBeNull();
      expect(m.pingMs).toBeNull();
      expect(m.minPingMs).toBeNull();
      expect(m.maxPingMs).toBeNull();
      expect(m.jitterMs).toBeNull();
      expect(m.currentInstantSpeedMbps).toBe(0);
      expect(m.suitability.overallScore).toBe(0);
      expect(m.suitability.conferencing.status).toBe('check');
      expect(Array.isArray(m.testHistory)).toBe(true);
    });

    it('should accurately classify network quality tiers', () => {
      const service = new SpeedTestService();
      expect(service.classifyQuality(500, 15)).toBe('gigabit');
      expect(service.classifyQuality(150, 20)).toBe('ultra');
      expect(service.classifyQuality(60, 30)).toBe('fast');
      expect(service.classifyQuality(30, 50)).toBe('good');
      expect(service.classifyQuality(12, 100)).toBe('moderate');
      expect(service.classifyQuality(4, 250)).toBe('slow');
    });

    it('should evaluate high performance connection as passing across all suitability criteria', () => {
      const service = new SpeedTestService();
      const suit = service.evaluateSuitability(120, 40, 18, 3);
      expect(suit.conferencing.status).toBe('pass');
      expect(suit.gaming.status).toBe('pass');
      expect(suit.streaming4k.status).toBe('pass');
      expect(suit.browsing.status).toBe('pass');
      expect(suit.stabilityRating).toBe('excellent');
      expect(suit.overallScore).toBeGreaterThanOrEqual(85);
    });

    it('should evaluate sub-optimal connection with failures and low stability', () => {
      const service = new SpeedTestService();
      const suit = service.evaluateSuitability(1.5, 0.5, 220, 45);
      expect(suit.conferencing.status).toBe('fail');
      expect(suit.gaming.status).toBe('fail');
      expect(suit.streaming4k.status).toBe('fail');
      expect(suit.browsing.status).toBe('fail');
      expect(suit.stabilityRating).toBe('unstable');
      expect(suit.overallScore).toBeLessThan(45);
    });

    it('should clear test history correctly', () => {
      const service = new SpeedTestService();
      service.metrics.update(m => ({
        ...m,
        testHistory: [
          {
            id: 'test-1',
            timestamp: '12:00:00',
            downloadMbps: 100,
            uploadMbps: 50,
            pingMs: 20,
            jitterMs: 4,
            qualityRating: 'ultra'
          }
        ]
      }));
      expect(service.metrics().testHistory.length).toBe(1);

      service.clearHistory();
      expect(service.metrics().testHistory).toEqual([]);
    });

    it('should safely detect telemetry without errors', () => {
      const service = new SpeedTestService();
      const telem = service.detectTelemetry();
      expect(typeof telem).toBe('object');
    });

    it('should cancel active test and reset to idle metrics', () => {
      const service = new SpeedTestService();
      service.metrics.update(m => ({
        ...m,
        status: 'download',
        currentInstantSpeedMbps: 45,
        progressPercent: 40
      }));
      expect(service.metrics().status).toBe('download');

      service.cancelTest();
      expect(service.metrics().status).toBe('idle');
      expect(service.metrics().currentInstantSpeedMbps).toBe(0);
    });
  });

  describe('IpCheckerService', () => {
    it('should initialize with default ip metrics and dual stack untested', () => {
      const service = new IpCheckerService();
      const m = service.metrics();
      expect(m.ip).toBe('');
      expect(m.version).toBe('Unknown');
      expect(m.ipv4).toBeNull();
      expect(m.ipv6).toBeNull();
      expect(m.dualStackStatus).toBe('untested');
      expect(m.isLoading).toBe(false);
      expect(m.isWebRtcLeakProtected).toBe(true);
      expect(m.isProxyOrVpn).toBe(false);
      expect(m.privacyScore).toBe(0);
      expect(m.localIps).toEqual([]);
    });

    it('should compute explainable privacy assessment with excellent rating for protected connection', () => {
      const service = new IpCheckerService();
      const assessment = service.calculatePrivacyScore({
        isWebRtcLeakProtected: true,
        dualStackStatus: 'ipv4-only',
        isProxyOrVpn: true,
        asnOrg: 'Cloudflare Inc'
      });

      expect(assessment.privacyScore).toBe(100);
      expect(assessment.privacyRating).toBe('excellent');
      expect(assessment.privacyFactors.length).toBe(4);
      expect(assessment.privacyFactors.every(f => f.status === 'pass')).toBe(true);
    });

    it('should compute moderate/lower privacy rating when WebRTC leaks and connection is residential', () => {
      const service = new IpCheckerService();
      const assessment = service.calculatePrivacyScore({
        isWebRtcLeakProtected: false,
        dualStackStatus: 'dual-stack',
        isProxyOrVpn: false,
        asnOrg: 'Broadband ISP'
      });

      expect(assessment.privacyScore).toBe(45);
      expect(assessment.privacyRating).toBe('moderate');
      expect(assessment.privacyFactors.some(f => f.status === 'fail')).toBe(true);
    });

    it('should generate formatted text report and JSON report with network details', () => {
      const service = new IpCheckerService();
      service.metrics.update(m => ({
        ...m,
        ip: '203.0.113.195',
        version: 'IPv4',
        ipv4: '203.0.113.195',
        dualStackStatus: 'ipv4-only',
        country: 'United States',
        countryCode: 'US',
        region: 'California',
        city: 'San Francisco',
        postal: '94105',
        isp: 'Cloud Network',
        asn: 'AS13335',
        privacyScore: 85,
        privacyRating: 'excellent',
        isWebRtcLeakProtected: true
      }));

      const text = service.generateReportText();
      expect(text).toContain('PUBLIC IP & NETWORK INTELLIGENCE REPORT');
      expect(text).toContain('203.0.113.195');
      expect(text).toContain('United States');
      expect(text).toContain('AS13335');

      const json = service.generateReportJson();
      expect(json['reportType']).toContain('Acklet Device Studio');
      expect((json['network'] as any).primaryIp).toBe('203.0.113.195');
      expect((json['location'] as any).city).toBe('San Francisco');
      expect((json['privacy'] as any).privacyScore).toBe(85);
    });
  });

  describe('ScreenShareService', () => {
    it('should initialize with default screen share metrics and quality assessment', () => {
      const service = new ScreenShareService();
      const m = service.metrics();
      expect(m.isSharing).toBe(false);
      expect(m.surfaceType).toBe('unknown');
      expect(m.resolution.width).toBe(0);
      expect(m.fitMode).toBe('contain');
      expect(m.capturedFrames).toEqual([]);
      expect(m.qualityAssessment.tier).toBe('none');
      expect(m.diagnosticSummary.verdict).toBe('untested');
    });

    it('should accurately compute common screen aspect ratios', () => {
      const service = new ScreenShareService();
      expect(service.computeAspectRatio(1920, 1080)).toBe('16:9');
      expect(service.computeAspectRatio(2560, 1600)).toBe('16:10');
      expect(service.computeAspectRatio(1024, 768)).toBe('4:3');
      expect(service.computeAspectRatio(0, 0)).toBe('--');
    });

    it('should evaluate 4K and 1080p screen streams with high text clarity and smooth fps', () => {
      const service = new ScreenShareService();
      const q4k = service.evaluateQuality(3840, 2160, 60, 60, 'monitor', true);
      expect(q4k.tier).toBe('4k');
      expect(q4k.fpsStability).toBe('smooth-60');
      expect(q4k.textClarity).toBe('exceptional');
      expect(q4k.audioStatusText).toContain('Audio Track Included');

      const q1080 = service.evaluateQuality(1920, 1080, 30, 30, 'window', false);
      expect(q1080.tier).toBe('1080p');
      expect(q1080.fpsStability).toBe('stable-30');
      expect(q1080.textClarity).toBe('crisp');
      expect(q1080.audioStatusText).toContain('Video-Only');
    });

    it('should toggle fit mode between contain and cover', () => {
      const service = new ScreenShareService();
      expect(service.metrics().fitMode).toBe('contain');
      const next1 = service.toggleFitMode();
      expect(next1).toBe('cover');
      expect(service.metrics().fitMode).toBe('cover');
      const next2 = service.toggleFitMode();
      expect(next2).toBe('contain');
      expect(service.metrics().fitMode).toBe('contain');
    });

    it('should manage snapshots deletion and clearing', () => {
      const service = new ScreenShareService();
      service.metrics.update(m => ({
        ...m,
        capturedFrames: ['data:image/png;base64,1', 'data:image/png;base64,2', 'data:image/png;base64,3']
      }));
      expect(service.metrics().capturedFrames.length).toBe(3);

      service.deleteSnapshot(1);
      expect(service.metrics().capturedFrames).toEqual(['data:image/png;base64,1', 'data:image/png;base64,3']);

      service.clearAllSnapshots();
      expect(service.metrics().capturedFrames).toEqual([]);
    });

    it('should safely return false when copying out-of-bounds snapshot', async () => {
      const service = new ScreenShareService();
      const result = await service.copySnapshotToClipboard(99);
      expect(result).toBe(false);
    });

    it('should compute final diagnostic summary when sharing terminates', () => {
      const service = new ScreenShareService();
      service.metrics.update(m => ({
        ...m,
        isSharing: true,
        surfaceType: 'monitor',
        resolution: { width: 1920, height: 1080, aspectRatio: '16:9' },
        measuredFps: 60,
        hasAudio: true
      }));

      service.stopSharing();
      const m = service.metrics();
      expect(m.isSharing).toBe(false);
      expect(m.diagnosticSummary.maxResolution).toBe('1920 × 1080');
      expect(m.diagnosticSummary.verdict).toBe('excellent');
      expect(m.diagnosticSummary.hadAudio).toBe(true);
    });
  });

  describe('DiagnosticHistoryService', () => {
    it('should initialize with seeded records and active logging preference', () => {
      const service = new DiagnosticHistoryService();
      expect(service.isHistoryEnabled()).toBe(true);
      expect(service.records().length).toBeGreaterThan(0);
      expect(service.stats().totalCount).toBe(service.records().length);
    });

    it('should save, filter, and delete diagnostic history records', () => {
      const service = new DiagnosticHistoryService();
      const countBefore = service.records().length;

      const record = service.saveRecord({
        sessionId: 'sess_test',
        moduleType: 'speed',
        testTitle: 'Custom Test Run',
        status: 'pass',
        primaryMetric: 'Down: 120 Mbps',
        details: { downloadMbps: 120, uploadMbps: 50, pingMs: 15, jitterMs: 2 }
      });

      expect(record).not.toBeNull();
      expect(service.records().length).toBe(countBefore + 1);

      // Filtering by speed module
      service.selectedModuleFilter.set('speed');
      const speedRecords = service.filteredRecords();
      expect(speedRecords.every(r => r.moduleType === 'speed')).toBe(true);
      expect(speedRecords.some(r => r.id === record!.id)).toBe(true);

      // Deleting the record
      service.deleteRecord(record!.id);
      expect(service.records().some(r => r.id === record!.id)).toBe(false);
    });

    it('should compute performance comparison deltas between two speed test sessions', () => {
      const service = new DiagnosticHistoryService();
      const base = service.saveRecord({
        sessionId: 'sess_1',
        moduleType: 'speed',
        testTitle: 'Speed Baseline',
        status: 'pass',
        primaryMetric: 'Down: 50.0 Mbps',
        details: { downloadMbps: 50.0, uploadMbps: 20.0, pingMs: 40, jitterMs: 8 }
      });

      const target = service.saveRecord({
        sessionId: 'sess_2',
        moduleType: 'speed',
        testTitle: 'Speed Comparison',
        status: 'pass',
        primaryMetric: 'Down: 100.0 Mbps',
        details: { downloadMbps: 100.0, uploadMbps: 40.0, pingMs: 20, jitterMs: 3 }
      });

      const comparison = service.compareRecords(base!.id, target!.id);
      expect(comparison).not.toBeNull();
      expect(comparison!.overallVerdict).toBe('improved');

      const downMetric = comparison!.metrics.find(m => m.label === 'Download Speed');
      expect(downMetric?.delta).toBe(50.0);
      expect(downMetric?.deltaPercent).toBe(100);
      expect(downMetric?.direction).toBe('improved');

      const pingMetric = comparison!.metrics.find(m => m.label === 'Latency (Ping)');
      expect(pingMetric?.delta).toBe(-20);
      expect(pingMetric?.direction).toBe('improved'); // Lower ping is improved!
    });

    it('should clear all history records when clearHistory is invoked', () => {
      const service = new DiagnosticHistoryService();
      expect(service.records().length).toBeGreaterThan(0);
      service.clearHistory();
      expect(service.records().length).toBe(0);
    });
  });

  describe('DiagnosticReportService', () => {
    it('should generate structured report with masked IP when requested', () => {
      const service = new DiagnosticReportService();
      const report = service.generateReport({
        maskIp: true,
        template: 'network'
      });

      expect(report.reportId).toBeDefined();
      expect(report.reportTitle).toContain('Network Performance');
      if (report.testResults.ip?.ip) {
        expect(report.testResults.ip.ip).toContain('xxx');
      }
    });

    it('should generate valid printable HTML containing branding and report ID', () => {
      const service = new DiagnosticReportService();
      const report = service.generateReport();
      const html = service.generatePrintableHtml(report, {
        template: 'full',
        includeModules: ['speed', 'ip', 'webcam'],
        maskIp: true,
        includeLocation: true,
        includeReadiness: true
      });

      expect(html).toContain('Acklet Device Studio');
      expect(html).toContain(report.reportId!);
      expect(html).toContain('@media print');
    });

    it('should format report as clean human-readable text', () => {
      const service = new DiagnosticReportService();
      const report = service.generateReport();
      const text = service.formatReportAsText(report);

      expect(text).toContain('ACKLET DEVICE STUDIO');
      expect(text).toContain('HARDWARE INVENTORY:');
      expect(text).toContain('TROUBLESHOOTING RECOMMENDATIONS:');
    });
  });
});

