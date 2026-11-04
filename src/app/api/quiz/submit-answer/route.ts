import { NextRequest, NextResponse } from 'next/server';
import { serverQuizStore } from '@/lib/quizServerStore';

export async function POST(req: NextRequest) {
  try {
    const { pin, answer } = await req.json();
    if (!pin || !answer || !answer.participantId) {
      return NextResponse.json({ error: 'Invalid answer payload' }, { status: 400 });
    }

    let state = serverQuizStore.liveStates.get(pin);
    if (!state) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const answers = state.answersSubmitted || [];
    const key = `${answer.participantId}_${answer.questionIndex ?? 0}`;
    const existingIdx = answers.findIndex((a: any) => `${a.participantId}_${a.questionIndex ?? 0}` === key);

    if (existingIdx >= 0) {
      answers[existingIdx] = answer;
    } else {
      answers.push(answer);
    }

    state.answersSubmitted = answers;

    // 참가자 점수 갱신
    if (typeof answer.score === 'number') {
      const participants = state.participants || [];
      const p = participants.find((part: any) => part.id === answer.participantId);
      if (p) {
        p.score = Math.max(p.score || 0, answer.score);
      }
    }

    state.updatedAt = Date.now();
    serverQuizStore.liveStates.set(pin, state);

    return NextResponse.json({ ok: true, liveState: state });
  } catch (err) {
    return NextResponse.json({ error: 'Submit answer failed' }, { status: 500 });
  }
}
