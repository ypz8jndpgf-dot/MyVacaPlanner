import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://myvacaplanner.com",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://myvacaplanner.com/terms",
      lastModified: new Date("2026-11-17"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: "https://myvacaplanner.com/privacy",
      lastModified: new Date("2026-11-17"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: "https://myvacaplanner.com/refunds",
      lastModified: new Date("2026-11-17"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
