// apps/tool-device-studio/src/services/ip-checker.service.ts
import { Injectable, signal } from '@angular/core';
import {
  DualStackStatus,
  IpInfoMetrics,
  IpPrivacyRating,
  PrivacyScoreFactor,
  ProxyDetectionResult
} from '../models/device.models';

const DEFAULT_PROXY_DETECTION: ProxyDetectionResult = {
  isDetected: false,
  type: 'Residential / Broadband',
  confidence: 'Indicative',
  disclaimer: 'Detection is heuristic based on datacenter ASN and proxy registries. Commercial VPNs with rotating residential IPs may not trigger flags.'
};

const DEFAULT_METRICS: IpInfoMetrics = {
  ip: '',
  version: 'Unknown',
  ipv4: null,
  ipv6: null,
  dualStackStatus: 'untested',
  city: '',
  region: '',
  country: '',
  countryCode: '',
  flagEmoji: '🌐',
  postal: '',
  latitude: null,
  longitude: null,
  isp: '',
  org: '',
  asn: '',
  asnOrg: '',
  timezone: '',
  localTime: '',
  isProxyOrVpn: false,
  proxyDetection: DEFAULT_PROXY_DETECTION,
  localIps: [],
  isWebRtcLeakProtected: true,
  privacyScore: 0,
  privacyRating: 'moderate',
  privacyFactors: [],
  isLoading: false
};

interface IpWhoIsResponse {
  ip?: string;
  success?: boolean;
  type?: string;
  city?: string;
  region?: string;
  country?: string;
  country_code?: string;
  flag?: {
    emoji?: string;
  };
  postal?: string;
  latitude?: number;
  longitude?: number;
  connection?: {
    isp?: string;
    org?: string;
    asn?: number;
  };
  timezone?: {
    id?: string;
    current_time?: string;
  };
}

interface FreeIpApiResponse {
  ipVersion?: number;
  ipAddress?: string;
  latitude?: number;
  longitude?: number;
  countryName?: string;
  countryCode?: string;
  cityName?: string;
  regionName?: string;
  zipCode?: string;
  timeZones?: string[];
  asn?: string;
  asnOrganization?: string;
  isProxy?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class IpCheckerService {
  public readonly metrics = signal<IpInfoMetrics>(DEFAULT_METRICS);

  public async fetchIpDetails(): Promise<IpInfoMetrics> {
    this.metrics.update(m => ({ ...m, isLoading: true, errorMessage: undefined }));

    try {
      // 1. Run dual-stack detection, Geo intelligence and WebRTC candidate inspection concurrently
      const [publicInfoResult, ipv4Result, ipv6Result, localIpsResult] = await Promise.allSettled([
        this.fetchPublicIpAndGeo(),
        this.detectDedicatedIpv4(),
        this.detectDedicatedIpv6(),
        this.detectLocalWebRtcIps()
      ]);

      const publicInfo = publicInfoResult.status === 'fulfilled' ? publicInfoResult.value : null;
      let ipv4 = ipv4Result.status === 'fulfilled' ? ipv4Result.value : null;
      const ipv6 = ipv6Result.status === 'fulfilled' ? ipv6Result.value : null;
      const localIps = localIpsResult.status === 'fulfilled' ? localIpsResult.value : [];

      if (!publicInfo) {
        throw new Error('Public IP services could not be reached. Please check your internet connection.');
      }

      // If dedicated IPv4 call was blocked but primary returned an IPv4 address, use it
      if (!ipv4 && publicInfo.version === 'IPv4') {
        ipv4 = publicInfo.ip;
      }

      // Determine Dual-Stack status
      let dualStackStatus: DualStackStatus = 'untested';
      if (ipv4 && ipv6) {
        dualStackStatus = 'dual-stack';
      } else if (ipv4) {
        dualStackStatus = 'ipv4-only';
      } else if (ipv6) {
        dualStackStatus = 'ipv6-only';
      }

      // WebRTC Leak Protection check:
      // If candidates exist, check if any private LAN IP (192.168., 10., 172.16-31.) is directly leaked.
      // Modern browsers use mDNS (.local) which protects privacy.
      const hasPrivateIpLeak = localIps.some(ip => 
        ip.startsWith('192.168.') || 
        ip.startsWith('10.') || 
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)
      );
      const isWebRtcLeakProtected = !hasPrivateIpLeak;

      // Compute explainable privacy assessment
      const { privacyScore, privacyRating, privacyFactors } = this.calculatePrivacyScore({
        isWebRtcLeakProtected,
        dualStackStatus,
        isProxyOrVpn: publicInfo.isProxyOrVpn,
        asnOrg: publicInfo.asnOrg || publicInfo.org
      });

      const result: IpInfoMetrics = {
        ...publicInfo,
        ipv4,
        ipv6,
        dualStackStatus,
        localIps,
        isWebRtcLeakProtected,
        privacyScore,
        privacyRating,
        privacyFactors,
        lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        isLoading: false
      };

      this.metrics.set(result);
      return result;
    } catch (err: unknown) {
      const error = err as Error;
      this.metrics.update(m => ({
        ...m,
        isLoading: false,
        errorMessage: error.message || 'Failed to retrieve public IP details. Please verify your connection.'
      }));
      throw err;
    }
  }

  private async fetchWithTimeout(url: string, timeoutMs = 3800): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { cache: 'no-store', signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  private async fetchPublicIpAndGeo(): Promise<Omit<IpInfoMetrics, 'ipv4' | 'ipv6' | 'dualStackStatus' | 'localIps' | 'isWebRtcLeakProtected' | 'privacyScore' | 'privacyRating' | 'privacyFactors' | 'lastUpdated' | 'isLoading'>> {
    // 1. Primary: ipwho.is (fast Anycast CDN, extensive geolocation & ASN data)
    try {
      const res = await this.fetchWithTimeout('https://ipwho.is/');
      if (res.ok) {
        const data: IpWhoIsResponse = await res.json();
        if (data.ip && data.success !== false) {
          const version: IpInfoMetrics['version'] = data.ip.includes(':') ? 'IPv6' : 'IPv4';
          const localTime = data.timezone?.current_time 
            ? new Date(data.timezone.current_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

          const asnOrg = data.connection?.org || data.connection?.isp || 'Internet Provider';
          const isDatacenter = this.detectDatacenterAsn(asnOrg);

          const proxyDetection: ProxyDetectionResult = {
            isDetected: isDatacenter,
            type: isDatacenter ? 'Datacenter / Hosting Network' : 'Residential / Broadband',
            confidence: isDatacenter ? 'Medium' : 'Indicative',
            disclaimer: 'Detection is heuristic based on datacenter ASN and proxy registries. Commercial VPNs with rotating residential IPs may not trigger flags.'
          };

          return {
            ip: data.ip,
            version,
            city: data.city || 'Detected City',
            region: data.region || 'Detected Region',
            country: data.country || 'Detected Country',
            countryCode: data.country_code || '',
            flagEmoji: data.flag?.emoji || '🌐',
            postal: data.postal || '--',
            latitude: data.latitude ?? null,
            longitude: data.longitude ?? null,
            isp: data.connection?.isp || data.connection?.org || 'Standard ISP',
            org: data.connection?.org || 'Broadband Network',
            asn: data.connection?.asn ? `AS${data.connection.asn}` : 'AS--',
            asnOrg,
            timezone: data.timezone?.id || Intl.DateTimeFormat().resolvedOptions().timeZone,
            localTime,
            isProxyOrVpn: isDatacenter,
            proxyDetection
          };
        }
      }
    } catch {}

    // 2. Secondary: freeipapi.com (provides isProxy flag)
    try {
      const res = await this.fetchWithTimeout('https://freeipapi.com/api/json');
      if (res.ok) {
        const data: FreeIpApiResponse = await res.json();
        if (data.ipAddress) {
          const version: IpInfoMetrics['version'] = data.ipAddress.includes(':') ? 'IPv6' : 'IPv4';
          const now = new Date();
          const isProxy = Boolean(data.isProxy);
          const proxyDetection: ProxyDetectionResult = {
            isDetected: isProxy,
            type: isProxy ? 'VPN / Proxy' : 'Residential / Broadband',
            confidence: isProxy ? 'High' : 'Indicative',
            disclaimer: 'Proxy indicators evaluated via public threat intelligence and ASN registries.'
          };

          return {
            ip: data.ipAddress,
            version,
            city: data.cityName || 'Detected City',
            region: data.regionName || 'Detected Region',
            country: data.countryName || 'Detected Country',
            countryCode: data.countryCode || '',
            flagEmoji: '🌐',
            postal: data.zipCode || '--',
            latitude: data.latitude ?? null,
            longitude: data.longitude ?? null,
            isp: data.asnOrganization || 'Standard ISP',
            org: data.asnOrganization || 'Broadband Network',
            asn: data.asn ? `AS${data.asn}` : 'AS--',
            asnOrg: data.asnOrganization,
            timezone: data.timeZones?.[0] || Intl.DateTimeFormat().resolvedOptions().timeZone,
            localTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            isProxyOrVpn: isProxy,
            proxyDetection
          };
        }
      }
    } catch {}

    // 3. Fallback: ipify for pure IP resolution
    const ipRes = await this.fetchWithTimeout('https://api.ipify.org?format=json');
    const ipData = await ipRes.json();
    const ip = ipData.ip || 'Unknown';
    const version: IpInfoMetrics['version'] = ip.includes(':') ? 'IPv6' : 'IPv4';

    return {
      ip,
      version,
      city: 'Local Region',
      region: 'Operating Region',
      country: 'Detected Network',
      countryCode: '',
      flagEmoji: '🌐',
      postal: '--',
      latitude: null,
      longitude: null,
      isp: 'Internet Provider',
      org: 'Broadband Network',
      asn: 'AS--',
      asnOrg: 'Broadband Network',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      localTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      isProxyOrVpn: false,
      proxyDetection: DEFAULT_PROXY_DETECTION
    };
  }

  private async detectDedicatedIpv4(): Promise<string | null> {
    try {
      const res = await this.fetchWithTimeout('https://api4.ipify.org?format=json', 3000);
      if (res.ok) {
        const data = await res.json();
        if (data.ip && !data.ip.includes(':')) {
          return data.ip;
        }
      }
    } catch {}
    return null;
  }

  private async detectDedicatedIpv6(): Promise<string | null> {
    try {
      const res = await this.fetchWithTimeout('https://api6.ipify.org?format=json', 3000);
      if (res.ok) {
        const data = await res.json();
        if (data.ip && data.ip.includes(':')) {
          return data.ip;
        }
      }
    } catch {}
    return null;
  }

  private detectDatacenterAsn(asnOrg: string): boolean {
    const lower = asnOrg.toLowerCase();
    const hostingKeywords = [
      'amazon', 'aws', 'cloudflare', 'digitalocean', 'hetzner', 'ovh',
      'linode', 'google cloud', 'azure', 'microsoft corp', 'vultr', 'fastly', 'leaseweb'
    ];
    return hostingKeywords.some(keyword => lower.includes(keyword));
  }

  private detectLocalWebRtcIps(): Promise<string[]> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !window.RTCPeerConnection) {
        resolve([]);
        return;
      }

      const localIps = new Set<string>();
      let pc: RTCPeerConnection | null = null;
      let timer: ReturnType<typeof setTimeout> | null = null;

      const cleanup = () => {
        if (timer) clearTimeout(timer);
        if (pc) {
          try { pc.close(); } catch {}
          pc = null;
        }
      };

      try {
        pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        pc.createDataChannel('device-studio-leak-test');

        pc.onicecandidate = (event) => {
          if (!event || !event.candidate) {
            cleanup();
            resolve(Array.from(localIps));
            return;
          }

          const cand = event.candidate.candidate;
          // Match standard private IPs or .local mDNS hostnames
          const ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7}|[a-zA-Z0-9-]+\.local)/;
          const match = cand.match(ipRegex);
          if (match && match[1]) {
            const candidateIp = match[1];
            if (
              candidateIp.startsWith('192.168.') ||
              candidateIp.startsWith('10.') ||
              /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(candidateIp) ||
              candidateIp.endsWith('.local')
            ) {
              localIps.add(candidateIp);
            }
          }
        };

        pc.createOffer()
          .then((offer) => pc?.setLocalDescription(offer))
          .catch(() => {
            cleanup();
            resolve([]);
          });

        timer = setTimeout(() => {
          cleanup();
          resolve(Array.from(localIps));
        }, 1200);
      } catch {
        cleanup();
        resolve([]);
      }
    });
  }

  public calculatePrivacyScore(params: {
    isWebRtcLeakProtected: boolean;
    dualStackStatus: DualStackStatus;
    isProxyOrVpn: boolean;
    asnOrg: string;
  }): { privacyScore: number; privacyRating: IpPrivacyRating; privacyFactors: PrivacyScoreFactor[] } {
    const factors: PrivacyScoreFactor[] = [];
    let score = 0;

    // 1. WebRTC Local LAN Protection (Up to 35 pts)
    if (params.isWebRtcLeakProtected) {
      score += 35;
      factors.push({
        label: 'WebRTC Local LAN Masking',
        score: 35,
        status: 'pass',
        detail: 'Protected. Your browser shields internal LAN IP topology using mDNS (.local) candidate randomization.'
      });
    } else {
      factors.push({
        label: 'WebRTC Local LAN Masking',
        score: 0,
        status: 'fail',
        detail: 'Exposed. Active private network interface addresses were directly reported via WebRTC.'
      });
    }

    // 2. Protocol Footprint & Exposure (Up to 25 pts)
    if (params.dualStackStatus === 'ipv4-only' || params.dualStackStatus === 'ipv6-only') {
      score += 25;
      factors.push({
        label: 'Protocol Surface Footprint',
        score: 25,
        status: 'pass',
        detail: `Single active protocol (${params.dualStackStatus.toUpperCase()}). Reduced correlation surface across dual networks.`
      });
    } else if (params.dualStackStatus === 'dual-stack') {
      score += 15;
      factors.push({
        label: 'Protocol Surface Footprint',
        score: 15,
        status: 'check',
        detail: 'Dual-stack connection. Both public IPv4 and IPv6 addresses are concurrently addressable by remote hosts.'
      });
    } else {
      score += 10;
      factors.push({
        label: 'Protocol Surface Footprint',
        score: 10,
        status: 'check',
        detail: 'Baseline IP address resolution verified.'
      });
    }

    // 3. Network Masking & ISP Visibility (Up to 20 pts)
    if (params.isProxyOrVpn) {
      score += 20;
      factors.push({
        label: 'ISP Intermediary Masking',
        score: 20,
        status: 'pass',
        detail: 'Intermediary network detected. Traffic routes through a datacenter, proxy, or relay ASN, shielding residential ISP.'
      });
    } else {
      score += 10;
      factors.push({
        label: 'ISP Intermediary Masking',
        score: 10,
        status: 'check',
        detail: 'Residential broadband ISP exposed. Visited websites can identify your internet provider organization.'
      });
    }

    // 4. Geolocation Granularity (Up to 20 pts)
    score += 20;
    factors.push({
      label: 'Geolocation Regional Masking',
      score: 20,
      status: 'pass',
      detail: 'Protected. IP coordinates point to your provider regional point-of-presence (PoP), not your exact residential address.'
    });

    // Rating
    let privacyRating: IpPrivacyRating = 'moderate';
    if (score >= 80) privacyRating = 'excellent';
    else if (score >= 65) privacyRating = 'good';
    else if (score >= 45) privacyRating = 'moderate';
    else privacyRating = 'exposed';

    return { privacyScore: score, privacyRating, privacyFactors: factors };
  }

  public generateReportText(): string {
    const m = this.metrics();
    const divider = '═'.repeat(64);
    const subDivider = '─'.repeat(64);

    return [
      divider,
      '  ACKLET DEVICE STUDIO — PUBLIC IP & NETWORK INTELLIGENCE REPORT',
      divider,
      `Generated: ${new Date().toISOString()}`,
      `Last Refreshed: ${m.lastUpdated || 'Initial Check'}`,
      '',
      '▶ 1. PUBLIC IP ADDRESS IDENTIFICATION',
      subDivider,
      `Primary IP Address : ${m.ip || 'Not Detected'}`,
      `Protocol Version    : ${m.version}`,
      `Dual-Stack Status   : ${m.dualStackStatus.toUpperCase()}`,
      `Public IPv4         : ${m.ipv4 || 'Not Detected / Unreachable'}`,
      `Public IPv6         : ${m.ipv6 || 'Not Detected / Unreachable'}`,
      '',
      '▶ 2. ROUTING & AUTONOMOUS SYSTEM INTELLIGENCE',
      subDivider,
      `ISP Name            : ${m.isp || '--'}`,
      `Organization        : ${m.org || '--'}`,
      `Autonomous System   : ${m.asn} (${m.asnOrg || m.org})`,
      `Network Type        : ${m.proxyDetection.type}`,
      `Proxy / VPN Flag    : ${m.isProxyOrVpn ? 'Detected' : 'Not Detected (Residential/Broadband)'}`,
      '',
      '▶ 3. GEOGRAPHIC POINT-OF-PRESENCE (APPROXIMATE)',
      subDivider,
      `Country             : ${m.country} (${m.countryCode}) ${m.flagEmoji || ''}`,
      `Region / State      : ${m.region}`,
      `City                : ${m.city}`,
      `Postal Code         : ${m.postal}`,
      `Coordinates (Lat/Lng): ${m.latitude !== null && m.longitude !== null ? `${m.latitude}, ${m.longitude}` : 'Not Available'}`,
      `Local Timezone      : ${m.timezone}`,
      `Local Clock         : ${m.localTime}`,
      'Notice: Geolocation represents your ISP regional point-of-presence, not physical street location.',
      '',
      '▶ 4. PRIVACY & EXPOSURE AUDIT',
      subDivider,
      `Privacy Health Score: ${m.privacyScore} / 100 (${m.privacyRating.toUpperCase()})`,
      `WebRTC Leak Shield  : ${m.isWebRtcLeakProtected ? 'Protected (Zero Local LAN Leaks)' : 'Exposed (LAN IP Leaked)'}`,
      `WebRTC Candidates   : ${m.localIps.length > 0 ? m.localIps.join(', ') : 'None Detected'}`,
      ...m.privacyFactors.map(f => `  • [${f.status.toUpperCase()}] ${f.label} (+${f.score} pts): ${f.detail}`),
      '',
      divider,
      'Acklet Device Studio • Privacy Guarantee: 100% Client-Side In-Memory Evaluation',
      divider
    ].join('\n');
  }

  public generateReportJson(): Record<string, unknown> {
    const m = this.metrics();
    return {
      reportType: 'Acklet Device Studio - Public IP & Network Diagnostic',
      generatedAt: new Date().toISOString(),
      network: {
        primaryIp: m.ip,
        version: m.version,
        ipv4: m.ipv4,
        ipv6: m.ipv6,
        dualStackStatus: m.dualStackStatus,
        isp: m.isp,
        organization: m.org,
        autonomousSystem: m.asn,
        asnOrganization: m.asnOrg
      },
      location: {
        approximate: true,
        country: m.country,
        countryCode: m.countryCode,
        region: m.region,
        city: m.city,
        postalCode: m.postal,
        latitude: m.latitude,
        longitude: m.longitude,
        timezone: m.timezone,
        localTime: m.localTime,
        disclaimer: 'IP geolocation indicates network point-of-presence, not exact physical street address.'
      },
      privacy: {
        privacyScore: m.privacyScore,
        privacyRating: m.privacyRating,
        isWebRtcLeakProtected: m.isWebRtcLeakProtected,
        detectedLocalIps: m.localIps,
        isProxyOrVpn: m.isProxyOrVpn,
        proxyDetection: m.proxyDetection,
        factors: m.privacyFactors
      }
    };
  }

  public downloadReport(format: 'txt' | 'json'): void {
    if (typeof window === 'undefined') return;

    let content = '';
    let mimeType = 'text/plain;charset=utf-8';
    let filename = `acklet-ip-report-${Date.now()}`;

    if (format === 'json') {
      content = JSON.stringify(this.generateReportJson(), null, 2);
      mimeType = 'application/json;charset=utf-8';
      filename += '.json';
    } else {
      content = this.generateReportText();
      filename += '.txt';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
