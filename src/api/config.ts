// Для удобства локальной разработки URL можно задать через .env:
// EXPO_PUBLIC_API_BASE_URL=http://192.168.x.x:8080
// На физическом устройстве обязательно указывайте IP вашего компьютера в LAN.
const envBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

export const API_BASE_URL = envBaseUrl
  ? envBaseUrl
  : (__DEV__ ? 'http://localhost:8080' : 'https://api.dogpaw.app');
