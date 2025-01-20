import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"

const Hero = () => {
  return (
    <div className="flex flex-col lg:flex-row items-start justify-between w-full px-6 py-12">
      {/* Left side content */}
      <div className="lg:w-1/2 space-y-6">
        <div className="flex items-center space-x-2 text-sm">
          <span className="text-cyan-400">Use Cases</span>
          <span className="text-gray-500">/</span>
          <span className="text-gray-300">Voice AI</span>
        </div>

        <h1 className="text-5xl font-bold text-white leading-tight">Give AI a voice</h1>

        <p className="text-xl text-gray-400 max-w-xl">
          See, hear, and speak with LLMs in real-time. Create voice-driven applications that redefine human-AI
          interaction — built seamlessly on the server.
        </p>

        <div className="flex items-center space-x-4 pt-4">
          <Link href="/meet">
            <Button className="bg-cyan-400 text-black hover:bg-cyan-300">
              Get started
            </Button>
          </Link>
          <Link href="/meet">
            <Button
              variant="outline"
              className="text-gray-400 bg-gray-900 border-gray-800 hover:bg-gray-800 hover:border-gray-700 hover:text-white"
            >
              View docs
            </Button>
          </Link>
        </div>
      </div>

      {/* Right side illustration */}
      <div className="lg:w-1/2 mt-8 lg:mt-0">
        <div className="relative w-full aspect-square">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/GhhwjOiXIAAE3f0-UNXW8xNYkWkN4UlfoPb2mhI7VQxq0j.jpeg"
            alt="Voice AI Interface Visualization"
            fill
            className="object-contain"
            priority
          />
        </div>
      </div>
    </div>
  )
}

export default Hero

