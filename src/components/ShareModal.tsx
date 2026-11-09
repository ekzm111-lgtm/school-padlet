'use client';

import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Check, QrCode, Share2, Sparkles, Hash, Link2, MessageSquareText } from 'lucide-react';
import { Board } from '@/lib/types';
import { saveRemoteBoard } from '@/lib/supabaseStore';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  board: Board;
}

export default function ShareModal({ isOpen, onClose, board }: ShareModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedShort, setCopiedShort] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const standardJoinUrl = `${origin}/j/${board.code}`;

  useEffect(() => {
    if (!isOpen) return;

    // Supabase에 보드 정보 즉시 보장 저장
    saveRemoteBoard(board).catch(() => {});

    // 간결하고 선명한 저밀도 초고화질 QR 코드 생성 (모바일 기본 카메라 0.1초 즉시 인식)
    QRCode.toDataURL(standardJoinUrl, {
      width: 320,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => {
        const fallback = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
          standardJoinUrl
        )}`;
        setQrDataUrl(fallback);
      });
  }, [isOpen, board, standardJoinUrl]);

  if (!isOpen) return null;

  const handleCopyShortLink = () => {
    navigator.clipboard.writeText(standardJoinUrl);
    setCopiedShort(true);
    setTimeout(() => setCopiedShort(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(board.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // 카톡 / 알림장용 깔끔한 초대 문구 복사
  const handleCopyInviteMessage = () => {
    const message = `[스쿨패들] '${board.title}' 수업 보드에 초대합니다!\n\n👉 초단축 링크: ${standardJoinUrl}\n👉 참여 PIN 번호: ${board.code}\n\n스마트폰이나 태블릿에서 링크를 누르면 1초 만에 입장됩니다.`;
    navigator.clipboard.writeText(message);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 text-center animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Share2 className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-800 text-left">수업 보드 초대 및 단축 링크</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {/* 🌟 1. 초단축 링크 (Short URL) 강조 박스 */}
          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 text-left space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                <Link2 className="w-4 h-4 text-blue-600" />
                <span>초단축 초대 링크</span>
              </span>
              <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                간편 접속
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={standardJoinUrl}
                className="flex-1 px-3 py-2 bg-white rounded-xl text-xs font-mono font-bold text-blue-700 border border-blue-200 select-all outline-none"
              />
              <button
                onClick={handleCopyShortLink}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-1 shrink-0"
              >
                {copiedShort ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedShort ? '복사완료' : '링크 복사'}</span>
              </button>
            </div>
          </div>

          {/* 2. 6자리 참여 핀코드 (메인 화면 번호 입력용) */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div className="text-left">
              <div className="text-[11px] font-bold text-slate-500">학생 참여코드 (PIN)</div>
              <div className="text-2xl font-mono font-black text-slate-900 tracking-wider">
                {board.code}
              </div>
            </div>
            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1"
            >
              {copiedCode ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copiedCode ? '복사됨' : '번호 복사'}</span>
            </button>
          </div>

          {/* 3. QR 코드 (전자칠판 및 교실 투사용) */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center">
            <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-slate-500" />
              <span>교실 전자칠판용 1초 접속 QR 코드</span>
            </div>
            <div className="p-2 bg-white rounded-xl shadow-xs border border-slate-200 flex items-center justify-center w-36 h-36">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="수업 보드 QR 코드" className="w-32 h-32 mx-auto rounded-lg" />
              ) : (
                <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5">스마트폰이나 태블릿 카메라로 비추면 바로 열립니다.</p>
          </div>

          {/* 4. 알림장 / 카카오톡 맞춤 초대 메시지 일괄 복사 */}
          <button
            onClick={handleCopyInviteMessage}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
          >
            {copiedMessage ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <MessageSquareText className="w-3.5 h-3.5" />}
            <span>{copiedMessage ? '초대 문구가 복사되었습니다!' : '알림장·카톡 초대 문구 복사하기'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
