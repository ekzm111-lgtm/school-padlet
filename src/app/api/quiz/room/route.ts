import { NextRequest, NextResponse } from 'next/server';
import { getQuizRoomServer, saveQuizRoomServer, getQuizLiveStateServer } from '@/lib/quizServerStore';

export async function GET(req: NextRequest) {
  const pin = req.nextUrl.searchParams.get('pin') || '';
  if (!pin) {
    return NextResponse.json({ error: 'PIN required' }, { status: 400 });
  }

  const room = await getQuizRoomServer(pin);
  if (room) {
    return NextResponse.json({ ok: true, room });
  }

  return NextResponse.json({ error: 'Room not found' }, { status: 404 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || !body.pin) {
      return NextResponse.json({ error: 'Invalid room data' }, { status: 400 });
    }

    await saveQuizRoomServer(body.pin, body);
    // 방 생성 시 초기 라이브 상태도 확실히 초기화
    await getQuizLiveStateServer(body.pin);

    return NextResponse.json({ ok: true, room: body });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to save room' }, { status: 500 });
  }
}
