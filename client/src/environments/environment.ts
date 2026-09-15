/**
 * Global App & Network Environment Configuration
 * Uses dynamic browser origin (window.location.origin) for seamless cross-device & ngrok compatibility.
 */
export const environment = {
  production: false,
  networkHost: typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1',
  port: 4200,

  /**
   * Dynamically resolves the current origin (e.g. https://abc.ngrok-free.dev or http://localhost:4200)
   */
  getOrigin(): string {
    if (typeof window !== 'undefined' && window.location) {
      return window.location.origin;
    }
    return 'http://localhost:4200';
  },

  /**
   * Helper to get full AirVault workspace URL for pairing QR codes
   */
  getAirVaultUrl(): string {
    return `${this.getOrigin()}/tools/app/airvault`;
  }
};
