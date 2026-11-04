import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import type { QuizRoom } from '@/types/quiz';
import type { ExamInfo, Question } from '@/types/exam';
import { createQuizRoom } from '@/utils/quizStorage';
import { getHostIp, getStudentJoinUrl, setCustomHostIp } from '@/utils/hostNetwork';
import {
  X,
  QrCode,
  Copy,
  Check,
  Play,
  Users,
  Clock,
  Sparkles,
  ExternalLink,
  Smartphone,
  ShieldCheck,
  Settings,
} from 'lucide-react';

interface QuizLobbyModalProps {
  isOpen: boolean;
  onClose: () => void;
  examInfo: ExamInfo;
  questions: Question[];
  onStartAsPlayer: (pin: string) => void;
  onStartAsHost?: (pin: string) => void;
  onOpenLeaderboard: (pin: string) => void;
}

export const QuizLobbyModal: React.FC<QuizLobbyModalProps> = ({
  isOpen,
  onClose,
  examInfo,
  questions,
  onStartAsPlayer,
  onStartAsHost,
  onOpenLeaderboard,
}) => {
  const [room, setRoom] = useState<QuizRoom | null>(null);
  const [timePerQuestion, setTimePerQuestion] = useState<number>(20);
  const [allowAnonymous, setAllowAnonymous] = useState<boolean>(true);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // 룸 생성 또는 갱신
  useEffect(() => {
    if (isOpen && questions.length > 0) {
      const newRoom = createQuizRoom(examInfo, questions, timePerQuestion, allowAnonymous);
      setRoom(newRoom);
    }
  }, [isOpen, examInfo, questions]);

  // 설정 변경 시 룸 정보 업데이트
  const handleUpdateSettings = (newTime: number, newAnon: boolean) => {
    setTimePerQuestion(newTime);
    setAllowAnonymous(newAnon);
    if (questions.length > 0) {
      const updated = createQuizRoom(examInfo, questions, newTime, newAnon);
      setRoom(updated);
    }
  };

  // 네트워크 IP 상태
  const [currentHostIp, setCurrentHostIp] = useState<string>(getHostIp());
  const [isEditingIp, setIsEditingIp] = useState(false);
  const [tempIpInput, setTempIpInput] = useState<string>(getHostIp());

  const joinUrl = room ? getStudentJoinUrl(room.pin, currentHostIp) : '';

  // QR 코드 이미지 생성 (실제 LAN IP 기반)
  useEffect(() => {
    if (!room || !joinUrl) return;

    QRCode.toDataURL(joinUrl, {
      width: 260,
      margin: 1.5,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR code generation failed:', err));
  }, [room, joinUrl]);

  if (!isOpen || !room) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert(`초대 주소:\n${joinUrl}`);
    }
  };

  const handleSaveIp = () => {
    const trimmed = tempIpInput.trim();
    if (trimmed) {
      setCustomHostIp(trimmed);
      setCurrentHostIp(trimmed);
      setIsEditingIp(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-700 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-black tracking-wider uppercase flex items-center gap-1.5">
              <Sparkles size={13} className="text-amber-300" />
              QuizN LIVE CHALLENGE
            </span>
            <span className="text-xs text-purple-200 font-medium">
              모바일 · 태블릿 · PC 동시 참여
            </span>
          </div>

          <h2 className="text-2xl font-black tracking-tight leading-tight">
            🎯 퀴즈앤 인터랙티브 라이브 룸
          </h2>
          <p className="text-xs text-purple-100 mt-1">
            {room.title} · 총 <strong className="text-amber-300 font-bold">{questions.length}</strong>문항
          </p>
        </div>

        {/* 바디 */}
        <div className="p-6 md:p-8 space-y-6">
          {/* PIN 코드 및 QR 코드 메인 박스 */}
          <div className="bg-slate-50 border-2 border-indigo-100 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-6 justify-between shadow-inner">
            {/* 좌측: PIN 번호 안내 */}
            <div className="flex-1 text-center md:text-left space-y-3">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                참여 핀 코드 (PIN CODE)
              </div>
              <div className="text-5xl md:text-6xl font-black text-indigo-900 tracking-wider font-mono select-all bg-white py-2 px-4 rounded-2xl border border-indigo-200 shadow-xs inline-block">
                {room.pin.slice(0, 3)} {room.pin.slice(3)}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                스마트폰 카메라로 우측의 <strong className="text-indigo-600 font-bold">QR 코드</strong>를 비추거나,
                아래 링크를 공유하여 참여하세요!
              </p>

              {/* 스마트폰 접속 주소 박스 및 IP 설정 */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1.5 text-left">
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold">
                  <span className="flex items-center gap-1">
                    <Smartphone size={12} className="text-indigo-600" />
                    접속 주소 (LAN IP):
                  </span>
                  <button
                    onClick={() => setIsEditingIp(!isEditingIp)}
                    className="text-[10px] text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5"
                  >
                    <Settings size={10} />
                    <span>IP 변경</span>
                  </button>
                </div>

                {isEditingIp ? (
                  <div className="flex gap-1.5 pt-0.5">
                    <input
                      type="text"
                      value={tempIpInput}
                      onChange={(e) => setTempIpInput(e.target.value)}
                      placeholder="예: 10.131.1.19"
                      className="bg-white border border-indigo-400 text-slate-900 text-xs px-2 py-1 rounded-lg flex-1 font-mono"
                    />
                    <button
                      onClick={handleSaveIp}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold"
                    >
                      저장
                    </button>
                  </div>
                ) : (
                  <code className="text-xs font-mono text-slate-700 block truncate select-all bg-white p-1 rounded-md border border-slate-200">
                    {joinUrl}
                  </code>
                )}
              </div>

              {/* 링크 복사 버튼 */}
              <div className="pt-1 flex items-center gap-2">
                <button
                  onClick={handleCopyLink}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-xs ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? '초대 링크 복사 완료!' : '초대 링크 복사하기'}</span>
                </button>

                <a
                  href={joinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 text-slate-500 hover:text-indigo-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
                  title="새 탭에서 참가자로 열기"
                >
                  <ExternalLink size={16} />
                </a>
              </div>
            </div>

            {/* 우측: 고화질 QR 코드 */}
            <div className="shrink-0 flex flex-col items-center bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Quiz Join QR Code"
                  className="w-40 h-40 object-contain rounded-xl"
                />
              ) : (
                <div className="w-40 h-40 flex items-center justify-center bg-slate-100 rounded-xl text-slate-400">
                  <QrCode size={40} className="animate-spin" />
                </div>
              )}
              <span className="text-[11px] font-bold text-slate-500 mt-2 flex items-center gap-1">
                <Smartphone size={13} className="text-indigo-600" />
                스마트폰 카메라 스캔
              </span>
            </div>
          </div>

          {/* 룸 옵션 설정 */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* 제한시간 설정 */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 flex items-center gap-1.5">
                <Clock size={14} className="text-indigo-600" />
                문제당 제한시간 (타이머)
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { sec: 0, label: '무제한' },
                  { sec: 15, label: '15초' },
                  { sec: 20, label: '20초' },
                  { sec: 30, label: '30초' },
                ].map((item) => (
                  <button
                    key={item.sec}
                    onClick={() => handleUpdateSettings(item.sec, allowAnonymous)}
                    className={`py-1.5 px-2 rounded-lg font-bold border transition text-center ${
                      timePerQuestion === item.sec
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 익명 참여 설정 */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-600" />
                익명 참여 모드
              </label>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => handleUpdateSettings(timePerQuestion, !allowAnonymous)}
                  className={`flex-1 py-1.5 px-3 rounded-lg font-bold border transition text-center ${
                    allowAnonymous
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}
                >
                  {allowAnonymous ? '✓ 익명 닉네임 허용됨' : '실명/학번 필수 입력'}
                </button>
              </div>
            </div>
          </div>

          {/* 하단 실행 버튼 그룹 */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              onClick={() => onOpenLeaderboard(room.pin)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
            >
              <Users size={15} />
              <span>순위/리더보드 게시판</span>
            </button>

            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
              {onStartAsHost && (
                <button
                  onClick={() => {
                    onClose();
                    onStartAsHost(room.pin);
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black shadow-md hover:shadow-lg transition transform hover:-translate-y-0.5"
                  title="전자칠판/TV에 띄우는 교사용 화면으로 시작합니다."
                >
                  <Sparkles size={15} className="fill-slate-950" />
                  <span>🖥️ 선생님 화면으로 진행 (칠판/TV)</span>
                </button>
              )}

              <button
                onClick={() => {
                  onClose();
                  onStartAsPlayer(room.pin);
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-black shadow-md hover:shadow-lg transition transform hover:-translate-y-0.5"
                title="학생 폰 화면 형태로 직접 문제풀이를 진행합니다."
              >
                <Play size={15} fill="white" />
                <span>📱 학생 모드로 풀기</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
