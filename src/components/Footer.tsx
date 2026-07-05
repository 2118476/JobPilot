import { Github, Globe, Shield, Heart } from 'lucide-react'

const links = [
  { label: 'Jobs', href: '#/jobs' },
  { label: 'AI Coach', href: '#/coach' },
  { label: 'Skill Gaps', href: '#/skill-gaps' },
  { label: 'Privacy & Data', href: '#/privacy', icon: Shield },
]

const external = [
  { label: 'GitHub', href: 'https://github.com/2118476/JobPilot', icon: Github },
  { label: 'Portfolio', href: 'https://example.com', icon: Globe },
]

export function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="py-6 px-6 lg:px-8 border-t border-border-subtle bg-bg-primary">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Internal links */}
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors"
            >
              {l.icon && <l.icon size={12} />}
              {l.label}
            </a>
          ))}
        </nav>

        {/* External links */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {external.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-text-muted hover:text-accent-indigo transition-colors"
            >
              <l.icon size={12} />
              {l.label}
            </a>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border-subtle/50 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-text-muted">
        <p>&copy; {year} JobPilot AI. All rights reserved.</p>
        <p className="flex items-center gap-1.5">
          Built with <Heart size={11} className="text-accent-rose fill-accent-rose" /> for job seekers
        </p>
      </div>
    </footer>
  )
}
