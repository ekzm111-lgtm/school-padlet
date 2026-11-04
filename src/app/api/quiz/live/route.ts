import { NextRequest, NextResponse } from 'next/server';
import { serverQuizStore } from '@/lib/quizServerStore';

export async function GET(req: NextRequest) {
  const pin = req.nextUrl.searchParams.get('pin') || '';
  if (!pin) {
    return NextResponse.json({ error: 'PIN required' }, { status: 400 });
  }

  let state = serverQuizStore.liveStates.get(pin);
  if (!state) {
    const room = serverQuizStore.rooms.get(pin);
    state = {
      pin,
      status: 'waiting',
      currentQuestionIndex: 0,
      timeLeft: room?.timePerQuestion || 20,
      revealAnswer: false,
      participants: [],
      answersSubmitted: [],
      updatedAt: Date.now(),
    };
    serverQuizStore.liveStates.set(pin, state);
  }

  const now = Date.now();
  const serverElapsedSec =
    state.status === 'question' && state.questionStartedAt
      ? Math.max(0, Math.floor((now - state.questionStartedAt) / 1000))
      : 0;

  return NextResponse.json({ ok: true, liveState: state, serverElapsedSec });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || !body.pin) {
      return NextResponse.json({ error: 'Invalid state data' }, { status: 400 });
    }

    const current = serverQuizStore.liveStates.get(body.pin) || {
      pin: body.pin,
      status: 'waiting',
      currentQuestionIndex: 0,
      timeLeft: 20,
      revealAnswer: false,
      participants: [],
      answersSubmitted: [],
      updatedAt: Date.now(),
    };

    // 참가자 목록 병합 (점수 높은 값 우선 보존)
    const participantMap = new Map();
    (current.participants || []).forEach((p: any) => participantMap.set(p.id, p));
    if (Array.isArray(body.participants)) {
      body.participants.forEach((p: any) => {
        if (p && p.id) {
          const prev = participantMap.get(p.id);
          const safeScore = Math.max(prev?.score || 0, p.score || 0);
          participantMap.set(p.id, { ...prev, ...p, score: safeScore });
        }
      });
    }

    let nextAnswers = current.answersSubmitted || [];
    if (Array.isArray(body.answersSubmitted) && body.answersSubmitted.length > 0) {
      const answerMap = new Map();
      nextAnswers.forEach((a: any) => answerMap.set(`${a.participantId}_${a.questionIndex ?? 0}`, a));
      body.answersSubmitted.forEach((a: any) => {
        if (a && a.participantId) {
          answerMap.set(`${a.participantId}_${a.questionIndex ?? 0}`, a);
        }
      });
      nextAnswers = Array.from(answerMap.values());
    }

    const mergedState = {
      ...current,
      ...body,
      participants: Array.from(participantMap.values()),
      answersSubmitted: nextAnswers,
      updatedAt: Date.now(),
    };

    serverQuizStore.liveStates.set(body.pin, mergedState);
    return NextResponse.json({ ok: true, liveState: mergedState });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update live state' }, { status: 500 });
  }
}
