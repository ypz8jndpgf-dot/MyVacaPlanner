import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Trip pages are private-by-link group spaces; keep them and the API
      // out of search indexes.
      disallow: ["/t/", "/api/"],
    },
    sitemap: "https://myvacaplanner.com/sitemap.xml",
  };
}
