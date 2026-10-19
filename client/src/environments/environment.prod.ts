export const environment = {
  production: true,
  apiBaseUrl: 'https://api.acklet.com/api/v1',
  baseDomain: 'acklet.com',
  protocol: 'https',
  port: null,
  networkHost: typeof window !== 'undefined' ? window.location.hostname : 'acklet.com',
  getOrigin(): string {
    if (typeof window !== 'undefined' && window.location) {
      return window.location.origin;
    }
    return 'https://acklet.com';
  },
  getAirVaultUrl(): string {
    return `${this.getOrigin()}/tools/app/airvault`;
  },
  features: {
    adsEnabled: true
  }
};
