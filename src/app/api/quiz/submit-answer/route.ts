import { NextRequest, NextResponse } from 'next/server';
import { submitQuizAnswerServer } from '@/lib/quizServerStore';

export async function POST(req: NextRequest) {
  try {
    const { pin, answer } = await req.json();
    if (!pin || !answer || !answer.participantId) {
      return NextResponse.json({ error: 'Invalid answer payload' }, { status: 400 });
    }

    const state = await submitQuizAnswerServer(pin, answer);
    return NextResponse.json({ ok: true, liveState: state });
  } catch (err) {
    return NextResponse.json({ error: 'Submit answer failed' }, { status: 500 });
  }
}
