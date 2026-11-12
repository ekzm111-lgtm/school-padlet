import { NextResponse } from 'next/server';
import os from 'os';

export const dynamic = 'force-dynamic';

export async function GET() {
  const interfaces = os.networkInterfaces();
  let localIp = 'localhost';

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        localIp = iface.address;
        break;
      }
    }
    if (localIp !== 'localhost') break;
  }

  return NextResponse.json({
    ok: true,
    localIp,
  });
}
