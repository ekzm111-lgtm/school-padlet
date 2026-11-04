// 로컬 네트워크 IP 및 QR 접속 URL 관리 유틸리티

export const DETECTED_LAN_IP = '10.131.1.19';
const STORAGE_KEY_CUSTOM_IP = 'quiz_custom_host_ip';

export function getHostIp(): string {
  if (typeof window === 'undefined') return 'localhost';
  const custom = localStorage.getItem(STORAGE_KEY_CUSTOM_IP);
  if (custom && custom.trim()) {
    return custom.trim();
  }

  const hostname = window.location.hostname;
  if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
    return DETECTED_LAN_IP;
  }
  return hostname;
}

export function setCustomHostIp(ip: string): void {
  if (typeof window === 'undefined') return;
  if (!ip || !ip.trim() || ip.trim() === DETECTED_LAN_IP) {
    localStorage.removeItem(STORAGE_KEY_CUSTOM_IP);
  } else {
    localStorage.setItem(STORAGE_KEY_CUSTOM_IP, ip.trim());
  }
}

export function isLocalFileProtocol(): boolean {
  return typeof window !== 'undefined' && window.location.protocol === 'file:';
}

export function getApiBaseUrl(): string {
  return '';
}

export function getStudentJoinUrl(pin: string, customIp?: string): string {
  if (typeof window !== 'undefined' && window.location.origin && window.location.protocol !== 'file:') {
    // Vercel 배포 도메인이나 실제 호스트 환경이면 해당 origin 기준으로 바로 생성
    if (!window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
      return `${window.location.origin}/quiz?pin=${pin}`;
    }
  }
  const host = customIp || getHostIp();
  const port = (typeof window !== 'undefined' && window.location.port) ? `:${window.location.port}` : '';
  const proto = (typeof window !== 'undefined' && window.location.protocol.startsWith('https')) ? 'https' : 'http';
  return `${proto}://${host}${port}/quiz?pin=${pin}`;
}
