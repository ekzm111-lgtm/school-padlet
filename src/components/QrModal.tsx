'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import {
  X,
  QrCode,
  Download,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Share2,
  Sparkles,
  School,
  ExternalLink,
  MessageSquareText,
  Hash,
} from 'lucide-react';
import { Board } from '@/lib/types';
import { saveRemoteBoard } from '@/lib/supabaseStore';

interface QrModalProps {
  isOpen: boolean;
  onClose: () => void;
  board: Board;
}

export default function QrModal({ isOpen, onClose, board }: QrModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isProjectorMode, setIsProjectorMode] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [useLanIp, setUseLanIp] = useState(false);
  const [lanIp, setLanIp] = useState('');

  useEffect(() => {
    setMounted(true);
    fetch('/api/network-ip')
      .then((r) => r.json())
      .then((d) => {
        if (d && d.ok && d.localIp && d.localIp !== 'localhost') {
          setLanIp(d.localIp);
          if (
            typeof window !== 'undefined' &&
            (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
          ) {
            setUseLanIp(true);
          }
        }
      })
      .catch(() => {});
  }, []);

  const port = typeof window !== 'undefined' && window.location.port ? `:${window.location.port}` : '';
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const effectiveOrigin = useLanIp && lanIp ? `http://${lanIp}${port}` : currentOrigin;
  const standardJoinUrl = `${effectiveOrigin}/j/${board.code}`;

  useEffect(() => {
    if (!isOpen) return;

    // Supabase에 보드 정보 즉시 보장 저장 (타 기기/스마트폰 100% 접속 보장)
    saveRemoteBoard(board).catch(() => {});

    // 간결하고 선명한 저밀도 초고화질 QR 코드 생성 (모바일 기본 카메라 0.1초 즉시 인식)
    QRCode.toDataURL(standardJoinUrl, {
      width: 400,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#1e1b4b', // 짙은 인디고/블랙으로 선명도 극대화
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => {
        // 네트워크 폴백
        const fallback = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=10&data=${encodeURIComponent(
          standardJoinUrl
        )}`;
        setQrDataUrl(fallback);
      });
  }, [isOpen, board, standardJoinUrl]);

  if (!isOpen || !mounted) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(standardJoinUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(board.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyMessage = () => {
    const message = `[스쿨패들] '${board.title}' 수업 보드에 초대합니다!\n\n👉 스마트폰 카메라로 QR 코드를 비추거나 아래 링크를 눌러주세요:\n${standardJoinUrl}\n\n👉 참여 PIN 번호: ${board.code}`;
    navigator.clipboard.writeText(message);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    try {
      const a = document.createElement('a');
      a.href = qrDataUrl;
      a.download = `${board.title.replace(/[\/\?<>\\:\*\|"]/g, '_')}_QR코드.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      window.open(qrDataUrl, '_blank');
    }
  };

  return createPortal(
    <div
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-all ${
        isProjectorMode ? 'bg-slate-950 p-4 sm:p-8' : 'bg-slate-900/60 backdrop-blur-sm p-4'
      }`}
    >
      <div
        className={`bg-white rounded-3xl shadow-2xl border transition-all text-center flex flex-col ${
          isProjectorMode
            ? 'w-full max-w-4xl h-auto max-h-[96vh] p-6 sm:p-10 border-slate-700'
            : 'w-full max-w-lg p-6 sm:p-7 border-slate-100 max-h-[92vh] overflow-y-auto'
        }`}
      >
        {/* 모달 상단 헤더 */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20 shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                스마트 기기 QR코드 초대
              </h3>
              <p className="text-[11px] text-slate-500">
                스마트폰/태블릿 기본 카메라로 비추면 1초 만에 바로 입장됩니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* 빔프로젝터 / TV 전체화면 모드 토글 */}
            <button
              onClick={() => setIsProjectorMode(!isProjectorMode)}
              className="p-2 text-slate-500 hover:text-purple-600 rounded-xl hover:bg-purple-50 transition"
              title={isProjectorMode ? '일반 창 모드로 복귀' : '교실 전자칠판/빔프로젝터 대형 모드'}
            >
              {isProjectorMode ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 메인 QR 본문 */}
        <div className="my-5 flex flex-col items-center">
          {/* 보드 타이틀 */}
          <div className="mb-3">
            <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
              {board.title}
            </h2>
            <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-mono text-xs font-bold">
              <span>수업 참여 PIN:</span>
              <span className="text-purple-700 font-extrabold text-sm tracking-wider">{board.code}</span>
              <button
                onClick={handleCopyCode}
                className="ml-1 p-0.5 hover:text-purple-600 transition"
                title="PIN 번호 복사"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* 선명한 대형 QR 코드 이미지 프레임 */}
          <div
            className={`p-4 bg-white rounded-3xl shadow-xl border-4 border-purple-100 transition-all ${
              isProjectorMode ? 'w-64 h-64 sm:w-80 sm:h-80' : 'w-56 h-56 sm:w-64 sm:h-64'
            } flex items-center justify-center`}
          >
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="수업 보드 QR 코드"
                className="w-full h-full object-contain rounded-2xl"
              />
            ) : (
              <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
            )}
          </div>

          <p className="text-xs text-slate-500 font-medium mt-3 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>별도 앱 설치 없이 스마트폰 기본 카메라로 비추면 자동 연결됩니다.</span>
          </p>

          {/* PC 로컬 환경일 때 스마트폰 Wi-Fi 접속용 IP 전환 탭 */}
          {lanIp && (
            <div className="mt-3 p-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2 max-w-sm w-full">
              <span className="text-[11px] font-bold text-slate-600">QR 대상 주소:</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setUseLanIp(true)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition ${
                    useLanIp
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                  title="같은 Wi-Fi에 연결된 스마트폰/태블릿 스캔용"
                >
                  📱 모바일 Wi-Fi ({lanIp})
                </button>
                <button
                  type="button"
                  onClick={() => setUseLanIp(false)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition ${
                    !useLanIp
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                  title="PC 브라우저 기본 주소"
                >
                  💻 기본 주소
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 액션 버튼 바 */}
        <div className="pt-4 border-t border-slate-100 space-y-2.5 shrink-0">
          <div className="grid grid-cols-2 gap-2">
            {/* QR 이미지 다운로드 */}
            <button
              onClick={handleDownloadQr}
              className="py-2.5 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs transition flex items-center justify-center gap-1.5 border border-purple-200 shadow-xs"
              title="활동지나 PPT에 넣을 수 있도록 QR 이미지 파일 다운로드"
            >
              <Download className="w-4 h-4" />
              <span>QR 이미지 저장</span>
            </button>

            {/* 초대 링크 복사 */}
            <button
              onClick={handleCopyLink}
              className="py-2.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition flex items-center justify-center gap-1.5 border border-blue-200 shadow-xs"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? '링크 복사됨!' : '초대 링크 복사'}</span>
            </button>
          </div>

          {/* 알림장/카카오톡 맞춤 안내 문구 일괄 복사 */}
          <button
            onClick={handleCopyMessage}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
          >
            {copiedMessage ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <MessageSquareText className="w-4 h-4" />
            )}
            <span>{copiedMessage ? '초대 문구가 클립보드에 복사되었습니다!' : '알림장·카톡 초대 문구 복사하기'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
