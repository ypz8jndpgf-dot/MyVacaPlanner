// Leaflet's stylesheet has no exports; it is loaded on demand via
// `await import("leaflet/dist/leaflet.css")` in TripClient's map effect.
// Webpack handles the import at build time — this declaration only
// satisfies TypeScript's module resolution for it.
declare module "leaflet/dist/leaflet.css";
