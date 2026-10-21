import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "스쿨패들(SchoolPad) - 우리 학교 실시간 협업 보드",
  description: "선생님과 학생이 함께 만드는 실시간 온라인 협업 담벼락 & 학습 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="min-h-screen flex flex-col bg-slate-50 antialiased selection:bg-blue-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
