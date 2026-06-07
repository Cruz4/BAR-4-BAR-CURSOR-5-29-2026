import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Marketing Capture',
  robots: { index: false, follow: false },
};

export default function MarketingCaptureLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-black overflow-hidden">{children}</div>;
}
