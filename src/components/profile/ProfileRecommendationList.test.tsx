/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { seedRecommendations } from "@/data/seed";
import { ProfileRecommendationList } from "./ProfileRecommendationList";

vi.mock("next/image", () => ({
  default: ({ alt }: { alt?: string }) => <div aria-label={alt} data-testid="mock-next-image" />,
}));

vi.mock("@/components/recommendations/OwnerRecommendationActions", () => ({
  OwnerRecommendationActions: ({ recommendationId }: { recommendationId: string }) => (
    <div data-testid={`owner-actions-${recommendationId}`} />
  ),
}));

describe("ProfileRecommendationList", () => {
  it("shows an empty state when the user has no publications", () => {
    render(<ProfileRecommendationList recommendations={[]} />);

    expect(screen.getByText("Você ainda não publicou recomendações.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /criar recomendação/i })).toHaveAttribute("href", "/recommend/new");
  });

  it("shows publication count, statuses, and owner actions", () => {
    const recommendations = seedRecommendations.filter((recommendation) => recommendation.author.id === "user-bia");

    render(<ProfileRecommendationList recommendations={recommendations} />);

    expect(screen.getByText("2 publicações")).toBeInTheDocument();
    expect(screen.getByText("Publicada")).toBeInTheDocument();
    expect(screen.getByText("Em revisão")).toBeInTheDocument();
    expect(screen.getByTestId("owner-actions-rec-001")).toBeInTheDocument();
    expect(screen.getByTestId("owner-actions-rec-005")).toBeInTheDocument();
  });
});