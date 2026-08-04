export function StructuredData() {
  const json = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    "name": "Flight Simulator Pro",
    "description": "A lightweight arcade-style browser flight simulator with real weather, 4 aircraft, and 6 missions.",
    "genre": ["Simulation", "Flight"],
    "gamePlatform": "Web Browser",
    "applicationCategory": "Game",
    "operatingSystem": "Any (Web)",
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
    "author": { "@type": "Person", "name": "Abd123454" },
    "license": "https://github.com/Abd123454/flight-simulator-pro/blob/main/LICENSE",
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />
}
