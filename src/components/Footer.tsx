'use client';

import React from 'react';
import Link from 'next/link';
import {
  School,
  Sparkles,
  Gamepad2,
  Hash,
  ShieldCheck,
  QrCode,
  ArrowUp,
  Heart,
  CheckCircle2,
  Layers,
  Users,
} from 'lucide-react';

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="w-full bg-slate-900 text-slate-300 border-t border-slate-800 transition-colors mt-auto">
      {/* 상단 퀵 상태 바 */}
      <div className="border-b border-slate-800/80 bg-slate-950/60 py-3 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-medium text-slate-300">클라우드 실시간 동기화 정상 작동 중</span>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <span className="text-slate-400 hidden sm:inline">모든 기기(PC, 태블릿, 모바일) 웹 브라우저 완벽 지원</span>
          </div>

          <button
            onClick={scrollToTop}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition text-xs font-medium ml-auto"
            title="페이지 맨 위로 이동"
          >
            <span>맨 위로</span>
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 메인 푸터 콘텐츠 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10">
          {/* 1열: 서비스 로고 및 소개 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <School className="w-5 h-5" />
              </div>
              <div>
                <span className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                  스쿨패들 <span className="text-xs font-bold text-blue-400 tracking-normal">SchoolPad</span>
                </span>
                <p className="text-[10px] text-slate-400 font-medium">우리 학교 실시간 협업 담벼락 & 학습 플랫폼</p>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              선생님과 학생들이 교실 안팎에서 함께 아이디어를 나누고 실시간으로 협력하는 인터랙티브 교육 공간입니다. 별도의 프로그램 설치 없이 즉시 참여할 수 있습니다.
            </p>

            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-950/60 border border-blue-800/40 text-[11px] font-semibold text-blue-300">
                <Sparkles className="w-3 h-3 text-blue-400" /> 수업용 무료
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-950/60 border border-indigo-800/40 text-[11px] font-semibold text-indigo-300">
                <Users className="w-3 h-3 text-indigo-400" /> 실시간 참여
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-950/60 border border-emerald-800/40 text-[11px] font-semibold text-emerald-300">
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> 교육 안전
              </span>
            </div>
          </div>

          {/* 2열: 주요 서비스 바로가기 */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              주요 기능 및 이동
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <Link href="/" className="hover:text-blue-400 transition flex items-center gap-1.5">
                  <span className="text-slate-600">›</span> 공개 수업 보드 둘러보기
                </Link>
              </li>
              <li>
                <Link href="/quiz" className="hover:text-purple-400 transition flex items-center gap-1.5">
                  <Gamepad2 className="w-3.5 h-3.5 text-purple-400" /> 퀴즈앤(QuizN) 라이브 대결
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-blue-400 transition flex items-center gap-1.5">
                  <span className="text-slate-600">›</span> 구글 계정 간편 로그인 / 전환
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-amber-400 transition flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> 학교 관리자 센터
                </Link>
              </li>
            </ul>
          </div>

          {/* 3열: 교실 활용 & 핵심 장점 */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3.5 flex items-center gap-1.5">
              <QrCode className="w-3.5 h-3.5 text-indigo-400" />
              스마트 교실 지원
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                <span><strong>QR코드 원터치 접속:</strong> 카메라 스캔만으로 학생 1초 입장</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                <span><strong>다양한 레이아웃:</strong> 모둠별 칸반, 자유 캔버스, 격자 지원</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                <span><strong>미디어 & 링크 첨부:</strong> 유튜브, 웹문서 썸네일 자동 추출</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                <span><strong>수업 안심 잠금:</strong> 교사 보드 잠금 및 권한 분배 기능</span>
              </li>
            </ul>
          </div>

          {/* 4열: 권한 및 보안 안내 */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3.5 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              권한 및 교육 보호
            </h4>
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-2 text-slate-400">
              <p className="leading-relaxed">
                <strong className="text-slate-200">역할 기반 안심 보안:</strong> 교사는 본인 수업 보드와 게시물을 안전하게 관리하며, 학생은 자신의 소중한 의견을 작성하고 소통할 수 있습니다.
              </p>
              <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                <span>클라우드 보안 암호화</span>
                <span className="text-emerald-400 font-semibold">보호됨</span>
              </div>
            </div>
          </div>
        </div>

        {/* 최하단 저작권 및 안내 */}
        <div className="border-t border-slate-800/80 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1">
            <span>© 2026 <strong>SchoolPad (스쿨패들)</strong>. All rights reserved.</span>
            <span className="hidden sm:inline text-slate-700">|</span>
            <span>교육 현장의 참여형 수업과 소통을 응원합니다.</span>
          </div>

          <div className="flex items-center gap-1 text-slate-400 text-xs">
            <span>Made with</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline" />
            <span>for Happy Learning</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
