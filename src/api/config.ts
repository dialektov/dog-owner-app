// Базовый URL API. Для эмулятора Android: 10.0.2.2:8080
// Для эмулятора iOS: localhost:8080
// Для физического устройства: IP вашего компьютера в локальной сети
export const API_BASE_URL = __DEV__
  ? 'http://localhost:8080'
  : 'https://api.dogpaw.app';
