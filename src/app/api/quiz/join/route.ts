import { NextRequest, NextResponse } from 'next/server';
import { joinQuizParticipantServer } from '@/lib/quizServerStore';

export async function POST(req: NextRequest) {
  try {
    const { pin, participant } = await req.json();
    if (!pin || !participant || !participant.id) {
      return NextResponse.json({ error: 'Invalid join payload' }, { status: 400 });
    }

    const state = await joinQuizParticipantServer(pin, participant);

    return NextResponse.json({ ok: true, liveState: state });
  } catch (err) {
    return NextResponse.json({ error: 'Join failed' }, { status: 500 });
  }
}
