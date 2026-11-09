import { NextRequest, NextResponse } from 'next/server';
import {
  getQuizPackagesServer,
  saveQuizPackageServer,
  deleteQuizPackageServer,
} from '@/lib/quizServerStore';

export async function GET() {
  try {
    const packages = await getQuizPackagesServer();
    return NextResponse.json({ ok: true, packages });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch packages' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || !body.id) {
      return NextResponse.json({ error: 'Invalid package data' }, { status: 400 });
    }
    await saveQuizPackageServer(body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to save package' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Package ID required' }, { status: 400 });
    }
    await deleteQuizPackageServer(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete package' }, { status: 500 });
  }
}
