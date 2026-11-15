'use client';

import React, { useState } from 'react';
import {
  Gamepad2,
  X,
  Play,
  Sparkles,
  ClipboardPaste,
  Copy,
  Check,
  CheckCircle2,
  Code,
  Music,
  HelpCircle,
  Users,
  Bot,
  BookOpen,
} from 'lucide-react';
import { ExamInfo, Question } from '@/types/exam';
import { Board, User } from '@/lib/types';
import {
  QUIZ_PRESETS,
  QuizPresetItem,
  SAMPLE_BATCH_TEXT,
  AI_QUIZ_PROMPT_TEMPLATE,
} from '@/data/quizPresets';
import { createQuizRoom } from '@/utils/quizStorage';

interface BoardQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  board: Board;
  currentUser: User | null;
  isTeacherOrAdmin: boolean;
  activeQuizPin?: string | null;
  onStartLive: (pin: string, with100Bots?: boolean) => void;
  onJoinAsStudent: (pin: string) => void;
}

export default function BoardQuizModal({
  isOpen,
  onClose,
  board,
  currentUser,
  isTeacherOrAdmin,
  activeQuizPin,
  onStartLive,
  onJoinAsStudent,
}: BoardQuizModalProps) {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('general');
  const [showBatchText, setShowBatchText] = useState(false);
  const [batchText, setBatchText] = useState(SAMPLE_BATCH_TEXT);
  const [copiedSample, setCopiedSample] = useState(false);
  const [copiedAiPrompt, setCopiedAiPrompt] = useState(false);
  const [customQuestions, setCustomQuestions] = useState<Question[] | null>(null);
  const [with100Bots, setWith100Bots] = useState(false);

  if (!isOpen) return null;

  const currentPreset = QUIZ_PRESETS.find((p) => p.id === selectedPresetId) || QUIZ_PRESETS[0];
  const activeQuestions = customQuestions || currentPreset.questions;
  const activeExamInfo = currentPreset.examInfo;

  // 텍스트 일괄 붙여넣기 파싱
  const handleApplyBatchText = () => {
    if (!batchText.trim()) return;
    try {
      const blocks = batchText.split(/---|\n\n\n/).map((b) => b.trim()).filter(Boolean);
      const parsedQuestions: Question[] = [];

      blocks.forEach((block, idx) => {
        const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
        if (lines.length < 2) return;

        let title = lines[0].replace(/^\d+[\.\)]\s*/, '');
        let points = 5;
        const ptMatch = title.match(/\[(\d+)점\]/);
        if (ptMatch) {
          points = parseInt(ptMatch[1], 10);
          title = title.replace(/\[\d+점\]/, '').trim();
        }

        const options: string[] = [];
        let correctAnswer = '1';
        let explanation = '';

        lines.slice(1).forEach((line) => {
          if (line.startsWith('정답:') || line.startsWith('답:') || line.startsWith('정답 :')) {
            const num = line.replace(/[^0-9]/g, '');
            if (num) correctAnswer = num;
          } else if (line.includes('해설:') || line.includes('💡')) {
            explanation = line.replace(/^[💡\s]*해설:\s*/, '').trim();
          } else if (line.match(/^[\(①②③④⑤\d]/)) {
            const opt = line.replace(/^[\(①②③④⑤\d\)\.\s]+/, '').trim();
            if (opt) options.push(opt);
          }
        });

        if (options.length === 0) {
          options.push('O (그렇다)', 'X (아니다)');
        }

        parsedQuestions.push({
          id: `custom_q_${Date.now()}_${idx}`,
          category: '사용자 출제',
          type: 'multiple-choice',
          points,
          title,
          hasScore: false,
          scoreAbc: '',
          hasAudio: false,
          options,
          correctAnswer,
          explanation: explanation || '선생님이 출제하신 문제의 정답입니다.',
          difficulty: '중',
        });
      });

      if (parsedQuestions.length > 0) {
        setCustomQuestions(parsedQuestions);
        setShowBatchText(false);
        alert(`🎉 ${parsedQuestions.length}문항이 성공적으로 파싱되어 준비되었습니다!`);
      } else {
        alert('문제를 인식하지 못했습니다. 표준 샘플 양식을 확인해 주세요.');
      }
    } catch (e) {
      alert('문제 파싱 중 오류가 발생했습니다.');
    }
  };

  const handleStart = () => {
    const examInfoToUse: ExamInfo = {
      ...activeExamInfo,
      schoolName: board.title,
      subject: currentPreset.title,
    };
    const room = createQuizRoom(examInfoToUse, activeQuestions, 20, true);
    onStartLive(room.pin, with100Bots);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
        {/* 상단 헤더 */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-800 tracking-tight">
                  이 보드 전용 실시간 퀴즈
                </h3>
                <span className="text-[10px] bg-purple-600 text-white px-2 py-0.5 rounded-full font-black">
                  QuizN Live
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                [{board.title}] 보드 참여 학생들과 실시간 퀴즈 대결을 시작합니다.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 학생 화면: 현재 진행 중인 퀴즈가 있는 경우 바로 입장 */}
        {!isTeacherOrAdmin && activeQuizPin ? (
          <div className="p-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/20 animate-bounce">
              <Gamepad2 className="w-9 h-9" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                선생님이 퀴즈를 시작했습니다!
              </span>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                지금 바로 퀴즈 대결에 입장하세요!
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                별도의 PIN 번호 입력 없이 버튼 하나로 1초 만에 입장합니다.
              </p>
            </div>

            <button
              onClick={() => {
                onJoinAsStudent(activeQuizPin);
                onClose();
              }}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-sm shadow-lg shadow-indigo-500/25 active:scale-98 transition flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>🎮 퀴즈 대결 입장하기</span>
            </button>
          </div>
        ) : !isTeacherOrAdmin ? (
          <div className="p-12 text-center text-slate-500 text-xs space-y-2">
            <Gamepad2 className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-700 text-sm">현재 진행 중인 퀴즈가 없습니다.</p>
            <p className="text-slate-400">선생님이 이 보드에서 실시간 퀴즈를 시작하면 화면에 알림이 나타납니다.</p>
          </div>
        ) : (
          /* 선생님/관리자 설정 및 출제 화면 */
          <div className="flex-1 overflow-y-auto p-5 space-y-5 no-scrollbar">
            {/* 1. 프리셋 퀴즈 선택 (4종 공식 샘플) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>수업 맞춤 퀴즈 패키지 선택</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowBatchText(!showBatchText)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 hover:underline"
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  <span>{showBatchText ? '패키지 목록 보기' : '📝 텍스트 일괄 붙여넣기 출제'}</span>
                </button>
              </div>

              {!showBatchText ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {QUIZ_PRESETS.map((preset) => {
                    const isSelected = selectedPresetId === preset.id && !customQuestions;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setSelectedPresetId(preset.id);
                          setCustomQuestions(null);
                        }}
                        className={`p-3 rounded-2xl border text-left transition relative flex flex-col justify-between gap-2 shadow-2xs ${
                          isSelected
                            ? 'bg-indigo-50/70 border-indigo-500 ring-2 ring-indigo-300/60'
                            : 'bg-white hover:bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${preset.badgeColor}`}>
                              {preset.badge}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {preset.questions.length}문항
                            </span>
                          </div>
                          <div className="font-extrabold text-xs text-slate-800 line-clamp-1">
                            {preset.title}
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                            {preset.description}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="flex items-center gap-1 text-[11px] text-indigo-600 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>선택됨 (준비 완료)</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* 텍스트 일괄 붙여넣기 에디터 */
                <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 animate-in fade-in duration-150">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-700">
                      메모장 문제 텍스트 복사/붙여넣기
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(SAMPLE_BATCH_TEXT);
                          setCopiedSample(true);
                          setTimeout(() => setCopiedSample(false), 2000);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 text-[11px] font-bold transition flex items-center gap-1 shadow-2xs"
                      >
                        {copiedSample ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedSample ? '복사됨!' : '표준 양식 복사'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(AI_QUIZ_PROMPT_TEMPLATE);
                          setCopiedAiPrompt(true);
                          setTimeout(() => setCopiedAiPrompt(false), 2000);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-[11px] font-bold transition flex items-center gap-1 shadow-2xs"
                      >
                        {copiedAiPrompt ? <Check className="w-3 h-3 text-emerald-500" /> : <Sparkles className="w-3 h-3 text-amber-500" />}
                        <span>{copiedAiPrompt ? '복사됨!' : 'AI 프롬프트 복사'}</span>
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows={7}
                    value={batchText}
                    onChange={(e) => setBatchText(e.target.value)}
                    placeholder="여기에 문제 텍스트를 붙여넣으세요..."
                    className="w-full p-3 rounded-xl border border-slate-200 text-xs font-mono bg-white focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
                  />

                  <button
                    type="button"
                    onClick={handleApplyBatchText}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition active:scale-98"
                  >
                    붙여넣은 텍스트 문제로 1초 적용하기
                  </button>
                </div>
              )}
            </div>

            {/* 2. 문제 미리보기 요약 */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between font-bold text-slate-700">
                <span>선택된 문제 세트: {customQuestions ? '사용자 직접 출제' : currentPreset.title}</span>
                <span className="text-indigo-600 font-extrabold">{activeQuestions.length}문항</span>
              </div>
              <div className="space-y-1 text-slate-500 text-[11px]">
                {activeQuestions.slice(0, 3).map((q, i) => (
                  <div key={q.id} className="truncate">
                    {i + 1}. {q.title}
                  </div>
                ))}
                {activeQuestions.length > 3 && (
                  <div className="text-slate-400">... 외 {activeQuestions.length - 3}문항 더 있음</div>
                )}
              </div>
            </div>

            {/* 3. 100명 모의 학생 시뮬레이션 체크박스 */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-50/70 to-indigo-50/70 border border-purple-200/80 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-black text-purple-900 flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-purple-600" />
                  <span>100명 가상 학생 동시 응시 시뮬레이션</span>
                </span>
                <p className="text-[11px] text-slate-500">
                  컴퓨터 100대 없이도 100명의 가상 학생이 자동 입장하고 랜덤 응시하여 순위표를 테스트합니다.
                </p>
              </div>
              <input
                type="checkbox"
                checked={with100Bots}
                onChange={(e) => setWith100Bots(e.target.checked)}
                className="w-5 h-5 accent-purple-600 rounded cursor-pointer shrink-0 ml-3"
              />
            </div>

            {/* 시작 버튼 */}
            <button
              onClick={handleStart}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-sm shadow-lg shadow-indigo-500/25 active:scale-98 transition flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>
                {with100Bots
                  ? '🚀 100명 가상 학생과 함께 라이브 퀴즈 시작하기'
                  : '🚀 이 보드에서 실시간 라이브 퀴즈 시작하기'}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
