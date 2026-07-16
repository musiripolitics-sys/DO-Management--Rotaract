import Image from 'next/image'

const DEFAULT_LINKS: [string, string][] = [
  ['Pulse', '/#pulse'],
  ['Leaderboard', '/#leaderboard'],
  ['Clubs', '/#clubs'],
  ['Events', '/#events'],
  ['How it works', '/#how'],
]

/** Standard site footer, shared by the landing pages. */
export function SiteFooter({ links = DEFAULT_LINKS }: { links?: [string, string][] }) {
  return (
    <footer className="px-6 py-12 bg-white border-t border-[#1A1815]/8">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <Image
            src="/vibe-logo.jpg"
            alt="Rotaract District 3233 — VIBE"
            width={2480}
            height={610}
            className="h-9 w-auto mb-3 rounded"
          />
          <p className="text-xs text-[#1A1815]/55 max-w-md">
            Vision · Innovate · Believe · Evolve. Built for the members of Rotaract District 3233.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-[#1A1815]/55">
          {links.map(([label, href]) => (
            <a key={href} href={href} className="hover:text-[#6D28D9] transition-colors">
              {label}
            </a>
          ))}
        </nav>
        <div className="text-xs text-[#1A1815]/45">
          © {new Date().getFullYear()} Rotaract District 3233. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
