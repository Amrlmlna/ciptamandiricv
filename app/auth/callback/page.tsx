"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function AuthCallback() {
  const router = useRouter()
  const supabase = createClient()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      // Check if there are error parameters in the URL (like otp_expired)
      const urlParams = new URLSearchParams(window.location.search)
      const urlError = urlParams.get('error')
      const errorDescription = urlParams.get('error_description')

      if (urlError) {
        setError(errorDescription || 'Authentication failed')
        return
      }

      // Check session after redirect
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session) {
        // If there's no valid session, redirect to login
        router.push('/auth/login')
        return
      }

      // Check if this is a password recovery session by trying to access session data
      // If we have a session after a password reset link click, redirect to reset password page
      if (session) {
        // For password reset flow, redirect to the reset password page
        router.push('/auth/reset-password')
      } else {
        // If no session, redirect to login
        router.push('/auth/login')
      }
    }

    // Wait a bit for the page to initialize before checking session
    // This ensures that all Supabase client setup has completed
    const timer = setTimeout(handleCallback, 500)

    return () => clearTimeout(timer)
  }, [router, supabase])

  if (error) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center p-4 md:p-6 bg-background">
        <div className="w-full max-w-md">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2 text-center mb-4">
              <div className="w-16 h-16 rounded-lg overflow-hidden mx-auto">
                <img src="/image.png" alt="Klinik CV Cipta Mandiri" className="w-full h-full object-contain" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">Klinik CV Cipta Mandiri</h1>
              <p className="text-sm text-muted-foreground">Autentikasi</p>
            </div>

            <Card className="border border-border">
              <CardHeader>
                <CardTitle className="text-2xl">Link Tidak Valid</CardTitle>
                <CardDescription>
                  Link autentikasi tidak valid atau telah kadaluarsa.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-6">
                    {error}
                  </p>
                  <div className="space-y-3">
                    <Link href="/auth/forgot-password">
                      <Button className="w-full">
                        Mintai Link Baru
                      </Button>
                    </Link>
                    <Link href="/auth/login">
                      <Button variant="outline" className="w-full">
                        Kembali ke Login
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mb-4"></div>
        <p className="text-foreground">Memproses autentikasi...</p>
      </div>
    </div>
  )
}