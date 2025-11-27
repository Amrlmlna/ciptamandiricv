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
      const url = new URL(window.location.href)
      const queryParams = url.searchParams
      const hashParams = new URLSearchParams(url.hash.slice(1))
      const urlError = queryParams.get("error") ?? hashParams.get("error")
      const errorDescription = queryParams.get("error_description") ?? hashParams.get("error_description")

      if (urlError) {
        setError(errorDescription || "Authentication failed")
        return
      }

      let session = null
      let sessionError: Error | null = null

      const authorizationCode = queryParams.get("code")

      if (authorizationCode) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(authorizationCode)
        session = data.session
        sessionError = error
      } else {

        const accessToken = hashParams.get("access_token")
        const refreshToken = hashParams.get("refresh_token")

        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })
          session = data.session
          sessionError = error
        } else {
          const { data, error } = await supabase.auth.getSession()
          session = data.session
          sessionError = error
        }
      }

      if (sessionError || !session) {
        console.error("Auth callback session error", sessionError)
        setError(sessionError?.message || "Link authentication failed")
        return
      }

      const linkType = hashParams.get("type") ?? queryParams.get("type")

      if (linkType === "recovery") {
        router.replace('/auth/reset-password')
        return
      }

      router.replace('/auth/login')
    }

    void handleCallback()
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