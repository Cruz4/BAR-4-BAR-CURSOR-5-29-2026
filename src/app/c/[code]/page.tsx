import { redirect, notFound } from 'next/navigation';
import { resolveShareCampaign } from '@/lib/server/share-attribution';

type PageProps = {
  params: Promise<{ code: string }>;
};

/**
 * Opaque campaign landing — resolves shareCampaigns/{code} and redirects to targetPath.
 * Keeps raw UIDs out of public share URLs.
 */
export default async function ShareCampaignRedirectPage({ params }: PageProps) {
  const { code } = await params;
  const campaign = await resolveShareCampaign(code);
  if (!campaign) notFound();
  redirect(campaign.targetPath);
}
