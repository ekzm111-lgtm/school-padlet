import { NextRequest, NextResponse } from 'next/server';
import { serverQuizStore } from '@/lib/quizServerStore';

export async function GET(req: NextRequest) {
  const pin = req.nextUrl.searchParams.get('pin') || '';
  if (!pin) {
    return NextResponse.json({ error: 'PIN required' }, { status: 400 });
  }

  const room = serverQuizStore.rooms.get(pin);
  if (room) {
    return NextResponse.json({ ok: true, room });
  }

  // 아직 메모리에 없다면 가장 최근 생성된 룸 기반으로 pin 자동 복원 지원
  if (serverQuizStore.rooms.size > 0) {
    const all = Array.from(serverQuizStore.rooms.values());
    const latest = all[all.length - 1];
    const recovered = { ...latest, pin, isActive: true };
    serverQuizStore.rooms.set(pin, recovered);
    return NextResponse.json({ ok: true, room: recovered });
  }

  return NextResponse.json({ error: 'Room not found' }, { status: 404 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || !body.pin) {
      return NextResponse.json({ error: 'Invalid room data' }, { status: 400 });
    }

    serverQuizStore.rooms.set(body.pin, body);

    if (!serverQuizStore.liveStates.has(body.pin)) {
      serverQuizStore.liveStates.set(body.pin, {
        pin: body.pin,
        status: 'waiting',
        currentQuestionIndex: 0,
        timeLeft: body.timePerQuestion || 20,
        revealAnswer: false,
        participants: [],
        answersSubmitted: [],
        updatedAt: Date.now(),
      });
    }

    return NextResponse.json({ ok: true, room: body });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to save room' }, { status: 500 });
  }
}
