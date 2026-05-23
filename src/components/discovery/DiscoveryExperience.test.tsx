/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Recommendation } from "@/domain/recommendations";
import { DiscoveryExperience } from "./DiscoveryExperience";

vi.mock("./DiscoveryMap", () => ({
  DiscoveryMap: () => <div data-testid="discovery-map" />,
}));

const baseRecommendation: Recommendation = {
  id: "rec-1",
  dishName: "Pastel de queijo",
  placeName: "Pastelaria Central",
  category: "lanche",
  city: "Piracicaba",
  neighborhood: "Centro",
  address: "Rua Boa, 123",
  latitude: -22.725,
  longitude: -47.649,
  pricePaid: 18,
  priceBand: "ate-30",
  valueScore: 5,
  tags: ["pastel"],
  summary: "Pastel sequinho e bem recheado.",
  whyWorthIt: "A porção é generosa e o preço compensa bastante.",
  imageUrl: "https://example.com/pastel.jpg",
  imageAlt: "Pastel de queijo",
  author: {
    id: "user-1",
    name: "Usuário Vale Muito",
    handle: "@usuario",
    role: "member",
  },
  status: "active",
  reportCount: 0,
  createdAt: "2026-05-23T12:00:00.000Z",
};

describe("DiscoveryExperience", () => {
  afterEach(() => {
    cleanup();
  });

  it("does not show a fake average rating when there are no recommendations", () => {
    render(<DiscoveryExperience recommendations={[]} />);

    const metric = screen.getByText("nota média").closest("div");

    expect(metric).not.toBeNull();
    expect(within(metric as HTMLElement).getByText("—")).toBeInTheDocument();
    expect(screen.queryByText("4.6")).not.toBeInTheDocument();
  });

  it("shows the average rating from the current recommendations", () => {
    render(
      <DiscoveryExperience
        recommendations={[
          baseRecommendation,
          { ...baseRecommendation, id: "rec-2", neighborhood: "Paulista", valueScore: 3 },
        ]}
      />,
    );

    const metric = screen.getByText("nota média").closest("div");

    expect(metric).not.toBeNull();
    expect(within(metric as HTMLElement).getByText("4.0")).toBeInTheDocument();
  });
});