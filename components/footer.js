// components/Footer.tsx
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Github, Twitter, Mail } from "lucide-react"

export default function Footer() {
  return (
    <footer className="bg-muted text-accent-foreground mt-auto py-4">

      <div className="max-w-6xl mx-auto w-full px-4 md:px-8 py-10-">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Branding */}
          <div>
            <h2 className="text-lg font-semibold text-foreground">Cultcha</h2>
            <p className="text-sm mt-2">
              Building cool stuff with open-source and love.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-sm font-medium mb-2 text-foreground">Quick Links</h3>
            <ul className="text-sm space-y-1">
              <li><a href="/about" className="hover:underline">About</a></li>
              <li><a href="/blog" className="hover:underline">Blog</a></li>
              <li><a href="/contact" className="hover:underline">Contact</a></li>
              <li><a href="/privacy" className="hover:underline">Privacy</a></li>
            </ul>
          </div>

          {/* Newsletter Signup */}
          <div>
            <h3 className="text-sm font-medium mb-2 text-foreground">Stay Updated</h3>
            <form className="flex flex-col sm:flex-row gap-2">
              <Input type="email" placeholder="Your email" className="flex-1 bg-muted" />
              <Button type="submit">Subscribe</Button>
            </form>
          </div>
        </div>

        {/* <Separator className="my-8-" /> */}

        {/* Bottom Row */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          <p>© 2025 PlatyPOS. All rights reserved.</p>
          <div className="flex space-x-4">
            <a href="https://twitter.com/yourhandle" target="_blank" rel="noopener noreferrer">
              <Twitter className="h-5 w-5 hover:text-foreground" />
            </a>
            <a href="https://github.com/yourrepo" target="_blank" rel="noopener noreferrer">
              <Github className="h-5 w-5 hover:text-foreground" />
            </a>
            <a href="mailto:contact@yourdomain.com">
              <Mail className="h-5 w-5 hover:text-foreground" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
