'use client';

import { useState } from 'react';
import { X, Copy, Check, QrCode, Share2, Sparkles, Hash } from 'lucide-react';
import { Board } from '@/lib/types';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  board: Board;
}

export default function ShareModal({ isOpen, onClose, board }: ShareModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    currentUrl
  )}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(board.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 text-center animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-800 text-left">수업 보드 공유하기</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          {/* 6자리 참여 핀코드 강조 카드 */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
            <div className="text-[11px] font-bold text-blue-700 mb-1">학생 간편 참여 PIN 코드</div>
            <div className="text-3xl font-mono font-black text-slate-900 tracking-widest my-1">
              {board.code}
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              학생들이 메인 화면에서 이 6자리 숫자만 입력하면 즉시 들어옵니다.
            </p>
            <button
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? '복사 완료!' : '참여코드 복사'}</span>
            </button>
          </div>

          {/* QR 코드 표시 (전자칠판 투사용) */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center">
            <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-slate-500" />
              <span>교실 전자칠판용 QR 코드</span>
            </div>
            <div className="p-2 bg-white rounded-xl shadow-xs border border-slate-200">
              <img src={qrApiUrl} alt="수업 보드 QR 코드" className="w-36 h-36 mx-auto rounded-lg" />
            </div>
            <p className="text-[10px] text-slate-400 mt-2">태블릿이나 스마트폰 카메라로 비추면 바로 열립니다.</p>
          </div>

          {/* 링크 복사 */}
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={currentUrl}
              className="flex-1 px-3 py-2 bg-slate-100 rounded-xl text-xs text-slate-600 font-mono border border-slate-200 select-all"
            />
            <button
              onClick={handleCopyLink}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? '완료' : '링크 복사'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
