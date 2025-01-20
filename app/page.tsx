import Navigation from "@/components/navigation"
import Hero from "@/components/hero"

export default function Home() {
  return (
    <main className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto">
        <Navigation />
        <Hero />
      </div>
    </main>
  )
}

