import { NextRequest, NextResponse } from 'next/server';
import { serverQuizStore } from '@/lib/quizServerStore';

export async function POST(req: NextRequest) {
  try {
    const { pin, participant } = await req.json();
    if (!pin || !participant || !participant.id) {
      return NextResponse.json({ error: 'Invalid join payload' }, { status: 400 });
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
    }

    const participants = state.participants || [];
    const existingIdx = participants.findIndex((p: any) => p.id === participant.id);
    if (existingIdx >= 0) {
      participants[existingIdx] = { ...participants[existingIdx], ...participant };
    } else {
      participants.push(participant);
    }

    state.participants = participants;
    state.updatedAt = Date.now();
    serverQuizStore.liveStates.set(pin, state);

    return NextResponse.json({ ok: true, liveState: state });
  } catch (err) {
    return NextResponse.json({ error: 'Join failed' }, { status: 500 });
  }
}
