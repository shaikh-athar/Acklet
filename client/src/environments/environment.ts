export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8080/api/v1',
  baseDomain: 'localhost',
  protocol: 'http',
  port: 4200,
  networkHost: typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1',
  getOrigin(): string {
    if (typeof window !== 'undefined' && window.location) {
      return window.location.origin;
    }
    return 'http://localhost:4200';
  },
  getAirVaultUrl(): string {
    return `${this.getOrigin()}/tools/app/airvault`;
  },
  features: {
    adsEnabled: false
  }
};
