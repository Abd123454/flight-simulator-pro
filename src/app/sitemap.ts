import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://github.com/Abd123454/flight-simulator-pro', lastModified: new Date(), changeFrequency: 'monthly', priority: 1 },
  ]
}
