'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled app error caught by ErrorBoundary:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-4 selection:bg-rose-500">
      <div className="max-w-md w-full bg-slate-800/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 text-center shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
          <AlertTriangle size={32} />
        </div>

        <h2 className="text-xl font-black text-slate-100 tracking-tight">
          일시적인 오류가 발생했습니다
        </h2>

        <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
          화면을 불러오는 도중 예기치 못한 문제가 발생했습니다.
          데이터는 안전하게 보존되어 있으니 다시 시도해 주세요.
        </p>

        {error?.message && (
          <div className="mt-4 p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] font-mono text-rose-300 text-left overflow-x-auto max-h-24">
            {error.message}
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row items-center gap-2.5">
          <button
            onClick={() => reset()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition"
          >
            <RefreshCw size={16} />
            <span>화면 다시 불러오기</span>
          </button>

          <Link
            href="/"
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-slate-700 hover:bg-slate-600 active:scale-98 text-slate-200 font-bold text-sm transition"
          >
            <Home size={16} />
            <span>홈으로 이동</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
