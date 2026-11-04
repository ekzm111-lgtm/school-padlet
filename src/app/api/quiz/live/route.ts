import { NextRequest, NextResponse } from 'next/server';
import { getQuizLiveStateServer, saveQuizLiveStateServer } from '@/lib/quizServerStore';

export async function GET(req: NextRequest) {
  const pin = req.nextUrl.searchParams.get('pin') || '';
  if (!pin) {
    return NextResponse.json({ error: 'PIN required' }, { status: 400 });
  }

  const state = await getQuizLiveStateServer(pin);

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

    const mergedState = await saveQuizLiveStateServer(body.pin, body);
    return NextResponse.json({ ok: true, liveState: mergedState });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update live state' }, { status: 500 });
  }
}
