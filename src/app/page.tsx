'use client'

import dynamic from 'next/dynamic'

// Load the simulator only on the client (it uses WebGL + window APIs).
const FlightSimulator = dynamic(
  () => import('@/components/flight-sim/FlightSimulator').then((m) => m.FlightSimulator),
  { ssr: false, loading: () => null }
)

export default function Home() {
  return <FlightSimulator />
}
