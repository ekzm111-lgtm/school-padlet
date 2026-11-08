import { NextRequest, NextResponse } from 'next/server';
import { getCurrentQuizServer, saveCurrentQuizServer } from '@/lib/quizServerStore';

export async function GET() {
  try {
    const current = await getCurrentQuizServer();
    return NextResponse.json({ ok: true, data: current });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Failed to fetch current quiz' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || !body.examInfo || !body.questions) {
      return NextResponse.json({ ok: false, error: 'Invalid quiz payload' }, { status: 400 });
    }

    await saveCurrentQuizServer({
      examInfo: body.examInfo,
      questions: body.questions,
      subject: body.subject || 'music',
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Failed to save current quiz' }, { status: 500 });
  }
}
