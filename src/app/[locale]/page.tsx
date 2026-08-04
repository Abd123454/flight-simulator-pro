'use client'
import dynamic from 'next/dynamic'

const FlightSimulator = dynamic(
  () => import('@/components/flight-sim/FlightSimulator').then((m) => m.FlightSimulator),
  { ssr: false, loading: () => null }
)

export default function Page() {
  return <FlightSimulator />
}
