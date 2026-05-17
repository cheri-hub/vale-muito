import { DiscoveryExperience } from "@/components/discovery/DiscoveryExperience";
import { listRecommendationsForPublicRead } from "@/repositories/recommendations";

export default async function Home() {
  const recommendations = await listRecommendationsForPublicRead();

  return <DiscoveryExperience recommendations={recommendations} />;
}
