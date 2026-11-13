// apps/tool-device-studio/src/models/device.models.ts

export type DeviceStudioTab = 
  | 'landing' 
  | 'webcam' 
  | 'microphone' 
  | 'speaker' 
  | 'speed' 
  | 'ip' 
  | 'screen'
  | 'history';

export interface MediaDeviceItem {
  deviceId: string;
  label: string;
  kind: 'videoinput' | 'audioinput' | 'audiooutput';
  groupId?: string;
}

export type CameraClarityRating = 'soft' | 'moderate' | 'sharp';
export type CameraColorTemp = 'warm' | 'neutral' | 'cool';
export type CameraQualityGrade = 'A+' | 'A' | 'B' | 'C' | 'D';

export interface CameraCapabilitiesInfo {
  zoom?: { min: number; max: number; step?: number };
  focusMode?: string[];
  exposureMode?: string[];
  whiteBalanceMode?: string[];
  frameRate?: { min: number; max: number };
  aspectRatio?: { min: number; max: number };
  torch?: boolean;
}

export interface ResolutionComparisonItem {
  id: string;
  label: string;
  category: string;
  width: number;
  height: number;
  aspectRatio: string;
  isCurrent: boolean;
  isAchieved: boolean;
  description: string;
  targetCallApps: string;
}

export interface CameraQualityAssessment {
  score: number; // 0 - 100 heuristic
  grade: CameraQualityGrade;
  title: string;
  summary: string;
  clarityScore: number; // 0 - 100 heuristic
  clarityRating: CameraClarityRating;
  colorTemperature: CameraColorTemp;
  colorTempKelvinApprox: number;
  meetingRecommendation: 'optimal' | 'recommended' | 'acceptable' | 'needs-improvement';
}

export interface WebcamMetrics {
  activeDeviceId: string;
  activeDeviceLabel: string;
  isStreaming: boolean;
  isMirrored: boolean;
  streamState: 'active' | 'paused' | 'stopped';
  resolution: {
    width: number;
    height: number;
    label: string;
    aspectRatio: string;
  };
  frameRate: number;
  brightness: number; // 0 - 100
  exposureRating: 'underexposed' | 'good' | 'overexposed';
  facingMode: string;
  permissionStatus: 'prompt' | 'granted' | 'denied' | 'unsupported';
  errorMessage?: string;
  snapshots: string[];
  capabilities?: CameraCapabilitiesInfo;
  qualityAssessment: CameraQualityAssessment;
  resolutionLadder: ResolutionComparisonItem[];
}

export type MicClarityRating = 'clear' | 'moderate' | 'muffled';
export type MicNoiseFloorRating = 'silent' | 'quiet' | 'moderate' | 'noisy';
export type MicQualityGrade = 'A+' | 'A' | 'B' | 'C' | 'D';
export type RecordingStatus = 'idle' | 'recording' | 'recorded' | 'playing';

export interface MicQualityAssessment {
  score: number; // 0 - 100 heuristic
  grade: MicQualityGrade;
  title: string;
  summary: string;
  clarityRating: MicClarityRating;
  clarityPercent: number; // 0 - 100
  noiseFloorDb: number; // estimated ambient noise floor in dBFS
  noiseFloorRating: MicNoiseFloorRating;
  clippingCount: number;
  meetingRecommendation: 'optimal' | 'recommended' | 'acceptable' | 'needs-improvement';
}

export interface RecordingMetadata {
  status: RecordingStatus;
  durationSeconds: number; // current elapsed recording or playback seconds
  maxDurationSeconds: number;
  blobUrl?: string;
  blobSize: number;
  mimeType: string;
  timestamp?: string;
}

export interface MicrophoneMetrics {
  activeDeviceId: string;
  activeDeviceLabel: string;
  isStreaming: boolean;
  streamState: 'active' | 'paused' | 'stopped';
  isMuted: boolean;
  volumeRms: number; // 0 - 100
  peakDb: number; // dBFS (-60 to 0)
  peakHoldDb: number; // decaying peak-hold indicator
  isClipping: boolean;
  isSilent: boolean; // silence detection status
  silenceDurationMs: number;
  sampleRate: number;
  channelCount: number;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
  permissionStatus: 'prompt' | 'granted' | 'denied' | 'unsupported';
  errorMessage?: string;
  qualityAssessment: MicQualityAssessment;
  recording: RecordingMetadata;
  levelHistory: number[]; // mini rolling buffer (last 32 samples, 0-100)
  // Backwards compatibility properties
  isRecordingLoopback: boolean;
  isPlayingLoopback: boolean;
  hasRecordedSample: boolean;
  loopbackAudioUrl?: string;
}

export type SpeakerTestMode = 
  | 'none'
  | 'left'
  | 'right'
  | 'stereo'
  | 'alternate'
  | 'sweep'
  | 'bass'
  | 'mid'
  | 'treble'
  | 'white-noise'
  | 'pink-noise'
  | 'brown-noise';

export interface SpeakerConfirmationStatus {
  leftConfirmed: boolean | null;
  rightConfirmed: boolean | null;
  stereoConfirmed: boolean | null;
  frequenciesConfirmed: boolean | null;
}

export interface SpeakerDiagnosticSummary {
  verdict: 'verified' | 'partial' | 'untested' | 'issue';
  verdictTitle: string;
  verdictDescription: string;
  stereoSeparationScore: number; // 0 - 100
  latencyMs?: number;
  sampleRate: number;
  outputSinkSupported: boolean;
}

export interface SpeakerMetrics {
  isPlaying: boolean;
  currentMode: SpeakerTestMode;
  currentFrequency: number;
  masterVolume: number; // 0 - 100
  panValue: number; // -1.0 to 1.0 (left to right)
  isMuted: boolean;
  activeOutputDeviceId?: string;
  activeOutputDeviceLabel?: string;
  sweepProgress: number; // 0 - 100
  sweepRunning: boolean;
  alternatingChannel?: 'left' | 'right';
  confirmations: SpeakerConfirmationStatus;
  diagnosticSummary: SpeakerDiagnosticSummary;
}

export type SpeedTestPhase = 'idle' | 'ping' | 'download' | 'upload' | 'completed' | 'error';
export type SpeedQualityRating = 'gigabit' | 'ultra' | 'fast' | 'good' | 'moderate' | 'slow' | 'none';

export interface SpeedSuitabilityAssessment {
  conferencing: { status: 'pass' | 'check' | 'fail'; label: string; desc: string };
  gaming: { status: 'pass' | 'check' | 'fail'; label: string; desc: string };
  streaming4k: { status: 'pass' | 'check' | 'fail'; label: string; desc: string };
  browsing: { status: 'pass' | 'check' | 'fail'; label: string; desc: string };
  overallScore: number; // 0 - 100
  stabilityRating: 'excellent' | 'good' | 'fair' | 'unstable';
  summaryText: string;
}

export interface SpeedTestHistoryItem {
  id: string;
  timestamp: string;
  downloadMbps: number;
  uploadMbps: number;
  pingMs: number;
  jitterMs: number;
  qualityRating: SpeedQualityRating;
}

export interface NetworkConnectionTelemetry {
  effectiveType?: string;
  downlinkEstimatedMbps?: number;
  rttEstimatedMs?: number;
  saveData?: boolean;
  type?: string;
}

export interface SpeedTestMetrics {
  status: SpeedTestPhase;
  pingMs: number | null;
  minPingMs: number | null;
  maxPingMs: number | null;
  jitterMs: number | null;
  downloadMbps: number | null;
  uploadMbps: number | null;
  currentInstantSpeedMbps: number;
  progressPercent: number;
  currentPhaseText: string;
  qualityRating: SpeedQualityRating;
  speedHistory: { time: number; speed: number; phase: 'download' | 'upload' }[];
  suitability: SpeedSuitabilityAssessment;
  telemetry: NetworkConnectionTelemetry;
  testHistory: SpeedTestHistoryItem[];
  errorMessage?: string;
}

export type DualStackStatus = 'dual-stack' | 'ipv4-only' | 'ipv6-only' | 'untested';
export type IpPrivacyRating = 'excellent' | 'good' | 'moderate' | 'exposed';

export interface PrivacyScoreFactor {
  label: string;
  score: number;
  status: 'pass' | 'check' | 'fail';
  detail: string;
}

export interface ProxyDetectionResult {
  isDetected: boolean;
  type: string;
  confidence: 'High' | 'Medium' | 'Low' | 'Indicative';
  disclaimer: string;
}

export interface IpInfoMetrics {
  ip: string;
  version: 'IPv4' | 'IPv6' | 'Unknown';
  ipv4: string | null;
  ipv6: string | null;
  dualStackStatus: DualStackStatus;
  city: string;
  region: string;
  country: string;
  countryCode: string;
  flagEmoji?: string;
  postal: string;
  latitude: number | null;
  longitude: number | null;
  isp: string;
  org: string;
  asn: string;
  asnOrg?: string;
  timezone: string;
  localTime: string;
  isProxyOrVpn: boolean;
  proxyDetection: ProxyDetectionResult;
  localIps: string[];
  isWebRtcLeakProtected: boolean;
  privacyScore: number;
  privacyRating: IpPrivacyRating;
  privacyFactors: PrivacyScoreFactor[];
  lastUpdated?: string;
  isLoading: boolean;
  errorMessage?: string;
}

export type ScreenQualityTier = '4k' | '1440p' | '1080p' | '720p' | 'sd' | 'none';
export type ScreenFitMode = 'contain' | 'cover';

export interface ScreenQualityAssessment {
  tier: ScreenQualityTier;
  tierLabel: string;
  measuredFps: number;
  targetFps: number;
  fpsStability: 'smooth-60' | 'stable-30' | 'variable' | 'low';
  textClarity: 'exceptional' | 'crisp' | 'acceptable' | 'soft';
  audioStatusText: string;
  summaryText: string;
}

export interface ScreenDiagnosticSummary {
  testedAt?: string;
  durationSeconds: number;
  maxResolution: string;
  averageFps: number;
  surfaceUsed: 'monitor' | 'window' | 'browser' | 'unknown';
  hadAudio: boolean;
  verdict: 'excellent' | 'good' | 'fair' | 'untested';
}

export interface ScreenShareMetrics {
  isSharing: boolean;
  surfaceType: 'monitor' | 'window' | 'browser' | 'unknown';
  resolution: {
    width: number;
    height: number;
    aspectRatio: string;
  };
  frameRate: number;
  measuredFps: number;
  hasAudio: boolean;
  audioTrackLabel?: string;
  cursorMode: string;
  isMuted: boolean;
  fitMode: ScreenFitMode;
  permissionStatus: 'prompt' | 'granted' | 'denied' | 'unsupported';
  errorMessage?: string;
  capturedFrames: string[];
  qualityAssessment: ScreenQualityAssessment;
  diagnosticSummary: ScreenDiagnosticSummary;
}

export type CheckStatus = 'pending' | 'testing' | 'pass' | 'warn' | 'fail';

export interface MeetingReadinessResult {
  camera: CheckStatus;
  cameraDetail?: string;
  mic: CheckStatus;
  micDetail?: string;
  speaker: CheckStatus;
  speakerDetail?: string;
  network: CheckStatus;
  networkDetail?: string;
  screenShare: CheckStatus;
  screenShareDetail?: string;
  overallScore: number; // 0 - 100
  summaryText: string;
  appsReadiness: {
    zoom: boolean;
    meet: boolean;
    teams: boolean;
    webex: boolean;
  };
}

export interface DeviceStudioReport {
  reportId?: string;
  reportTitle?: string;
  generatedAt: string;
  userAgent: string;
  os: string;
  browser: string;
  screenResolution: string;
  overallHealthScore: number;
  modulesTested: string[];
  hardwareInventory: {
    cameras: MediaDeviceItem[];
    microphones: MediaDeviceItem[];
    speakers: MediaDeviceItem[];
  };
  testResults: {
    webcam?: Partial<WebcamMetrics>;
    microphone?: Partial<MicrophoneMetrics>;
    speaker?: Partial<SpeakerMetrics>;
    speed?: Partial<SpeedTestMetrics>;
    ip?: Partial<IpInfoMetrics>;
    screen?: Partial<ScreenShareMetrics>;
  };
  readiness?: MeetingReadinessResult;
  troubleshooting?: string[];
}

export type DiagnosticModuleType = 
  | 'webcam' 
  | 'microphone' 
  | 'speaker' 
  | 'speed' 
  | 'ip' 
  | 'screen' 
  | 'readiness' 
  | 'health';

export type DiagnosticResultStatus = 'pass' | 'warn' | 'fail' | 'info';

export interface DiagnosticHistoryRecord {
  id: string;
  sessionId: string;
  moduleType: DiagnosticModuleType;
  testTitle: string;
  status: DiagnosticResultStatus;
  testedAt: string;
  timestampFormatted: string;
  durationSeconds?: number;
  primaryMetric: string;
  secondaryMetric?: string;
  details: Record<string, unknown>;
  warnings?: string[];
  recommendations?: string[];
  browserInfo?: string;
  osInfo?: string;
}

export interface DiagnosticComparisonMetric {
  label: string;
  baseValue: string | number;
  targetValue: string | number;
  delta?: number;
  deltaPercent?: number;
  direction?: 'improved' | 'regressed' | 'neutral';
  unit?: string;
}

export interface DiagnosticComparisonResult {
  moduleType: DiagnosticModuleType;
  baseRecord: DiagnosticHistoryRecord;
  targetRecord: DiagnosticHistoryRecord;
  metrics: DiagnosticComparisonMetric[];
  overallVerdict: 'improved' | 'regressed' | 'consistent';
  summaryText: string;
}

export type ReportTemplateType = 'full' | 'network' | 'audio' | 'camera' | 'readiness';

export interface ReportExportOptions {
  template: ReportTemplateType;
  includeModules: DiagnosticModuleType[];
  maskIp: boolean;
  includeLocation: boolean;
  includeReadiness: boolean;
}

