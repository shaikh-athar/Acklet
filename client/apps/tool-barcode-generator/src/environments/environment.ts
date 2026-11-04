// apps/tool-barcode-generator/src/environments/environment.ts
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8080/api/v1',
  verifyBaseUrl: 'http://barcode.localhost:4200',
  baseDomain: 'localhost',
  protocol: 'http',
  port: 4200,
  features: {
    adsEnabled: false
  }
};

