import { NextRequest, NextResponse } from 'next/server';
import {
  getQuizResultsServer,
  getAllQuizResultsServer,
  saveQuizResultServer,
  clearQuizResultsServer,
} from '@/lib/quizServerStore';

export async function GET(req: NextRequest) {
  try {
    const pin = req.nextUrl.searchParams.get('pin');
    if (pin) {
      const results = await getQuizResultsServer(pin);
      return NextResponse.json({ ok: true, results });
    }
    const resultsByPin = await getAllQuizResultsServer();
    return NextResponse.json({ ok: true, resultsByPin });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || !body.pin) {
      return NextResponse.json({ error: 'Invalid result data' }, { status: 400 });
    }
    await saveQuizResultServer(body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to save result' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const pin = req.nextUrl.searchParams.get('pin');
    if (!pin) {
      return NextResponse.json({ error: 'PIN required' }, { status: 400 });
    }
    await clearQuizResultsServer(pin);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to clear results' }, { status: 500 });
  }
}
