// 온라인 실시간 웹 접속 URL 관리 유틸리티 (오프라인 사설망 종속성 제거)

export function getHostIp(): string {
  if (typeof window === 'undefined') return '';
  return window.location.host;
}

export function setCustomHostIp(_ip: string): void {
  // 온라인 전용: 사설 IP 설정 불필요 (호환성 유지용 빈 함수)
}

export function isLocalFileProtocol(): boolean {
  return false;
}

export function getApiBaseUrl(): string {
  return '';
}

export function getStudentJoinUrl(pin: string, _customIp?: string): string {
  if (typeof window !== 'undefined' && window.location.origin) {
    return `${window.location.origin}/quiz?pin=${pin}`;
  }
  return `/quiz?pin=${pin}`;
}
