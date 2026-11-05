import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"

import { MobileHeader, Sidebar } from "@/components/app-nav"
import { TooltipProvider } from "@/components/ui/tooltip"
import { themeScript } from "@/lib/theme"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: { default: "Sales CRM", template: "%s · Sales CRM" },
  description: "Sales pipeline dashboard for the CRM: revenue, win rates, teams, products and accounts.",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">
        <TooltipProvider delayDuration={150}>
          <div className="flex min-h-svh">
            <Sidebar />
            <div className="flex min-w-0 flex-1 flex-col">
              <MobileHeader />
              {/* `group` lets the page dim itself while a filter change loads (see use-url-params.ts). */}
              <main className="group mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                {children}
              </main>
            </div>
          </div>
        </TooltipProvider>
      </body>
    </html>
  )
}
