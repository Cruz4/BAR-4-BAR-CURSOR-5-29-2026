import { notFound } from 'next/navigation';
import { MarketingCaptureSceneView } from '@/components/marketing/capture-scenes';
import {
  MARKETING_CAPTURE_SCENES,
  isMarketingCaptureScene,
} from '@/lib/marketing-capture-scenes';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return MARKETING_CAPTURE_SCENES.map((scene) => ({ scene }));
}

export default async function MarketingCapturePage({
  params,
}: {
  params: Promise<{ scene: string }>;
}) {
  const { scene } = await params;
  if (!isMarketingCaptureScene(scene)) {
    notFound();
  }
  return <MarketingCaptureSceneView scene={scene} />;
}
