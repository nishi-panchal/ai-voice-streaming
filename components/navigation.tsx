"use client"

import Link from "next/link"
import { ChevronDown, Github } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"

const Navigation = () => {
  return (
    <nav className="flex items-center justify-between w-full px-6 py-4">
      <div className="flex items-center space-x-8">
        {/* Logo */}
        <Link href="/" className="text-2xl font-semibold text-white">
          LiveKit
        </Link>

        {/* Nav Items */}
        <div className="flex items-center space-x-6">
          <NavItem
            title="Solutions"
            items={[
              { label: "Voice AI", href: "/meet" },
              { label: "Video Conferencing", href: "/meet" },
              { label: "Live Streaming", href: "/meet" },
              { label: "Virtual Events", href: "/meet" },
            ]}
          />
          <NavItem
            title="Developers"
            items={[
              { label: "Documentation", href: "/docs" },
              { label: "API Reference", href: "/api" },
              { label: "SDKs", href: "/sdks" },
            ]}
          />
          <NavItem
            title="Company"
            items={[
              { label: "About Us", href: "/about" },
              { label: "Careers", href: "/careers" },
              { label: "Blog", href: "/blog" },
            ]}
          />
          <Link href="/meet" className="text-gray-300 hover:text-white transition-colors">
            Customers
          </Link>
          <Link href="/meet" className="text-gray-300 hover:text-white transition-colors">
            Pricing
          </Link>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center space-x-4">
        <Link
          href="https://github.com/livekit"
          className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
        >
          <Github className="h-5 w-5" />
          <span>11,175</span>
        </Link>
        <Button variant="ghost" className="text-gray-300 hover:text-gray-400 hover:bg-white/10">
          Sign in
        </Button>
        <Button className="bg-cyan-400 text-black hover:bg-cyan-300">
          <Link href="/meet">Start for free</Link>
        </Button>
      </div>
    </nav>
  )
}

interface NavItem {
  label: string
  href: string
}

interface NavItemProps {
  title: string
  items: NavItem[]
}

const NavItem = ({ title, items }: NavItemProps) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative" onMouseEnter={() => setIsOpen(true)} onMouseLeave={() => setIsOpen(false)}>
      <button className="flex items-center space-x-1 text-gray-300 hover:text-white transition-colors">
        <span>{title}</span>
        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-48 rounded-md bg-gray-900 border border-gray-800 shadow-lg py-2">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default Navigation

