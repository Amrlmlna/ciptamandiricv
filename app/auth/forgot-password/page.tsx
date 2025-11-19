"use client"

import type React from "react"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const router = useRouter()

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setMessage("")

    try {
      // Call our API route to send password reset email
      const response = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const result = await response.json()

      if (result.success) {
        setMessage(result.message)
        setEmailSent(true)
      } else {
        setError(result.message)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan."
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 md:p-6 bg-background">
      <div className="w-full max-w-md">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2 text-center mb-4">
            <div className="w-16 h-16 rounded-lg overflow-hidden mx-auto">
              <img src="/image.png" alt="Klinik CV Cipta Mandiri" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Klinik CV Cipta Mandiri</h1>
            <p className="text-sm text-muted-foreground">Atur ulang kata sandi Anda</p>
          </div>

          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="text-2xl">Lupa Kata Sandi?</CardTitle>
              <CardDescription>
                Masukkan alamat email Anda dan kami akan kirimkan link untuk mengatur ulang kata sandi Anda
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!emailSent ? (
                <form onSubmit={handleForgotPassword}>
                  <div className="flex flex-col gap-6">
                    <div className="grid gap-2">
                      <Label htmlFor="email" className="text-foreground">
                        Alamat Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="halo@klinik.com"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="border-border focus:border-primary"
                      />
                    </div>
                    {error && (
                      <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive">
                        {error}
                      </div>
                    )}
                    {message && !error && (
                      <div className="p-3 bg-primary/10 border border-primary/30 rounded-md text-sm text-primary">
                        {message}
                      </div>
                    )}
                    <Button
                      type="submit"
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                      disabled={isLoading}
                    >
                      {isLoading ? "Mengirim..." : "Kirim Link Atur Ulang"}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="text-center py-4">
                  <div className="p-3 bg-primary/10 border border-primary/30 rounded-md text-sm text-primary mb-4">
                    {message}
                  </div>
                  <p className="text-sm text-muted-foreground mb-6">
                    Kami telah mengirimkan link atur ulang kata sandi ke alamat email Anda. 
                    Silakan periksa kotak masuk Anda dan ikuti petunjuk yang diberikan.
                  </p>
                  <Button 
                    onClick={() => router.push("/auth/login")}
                    className="w-full"
                  >
                    Kembali ke Login
                  </Button>
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-border text-center text-sm">
                <p className="text-muted-foreground">
                  Ingat kata sandi Anda?{" "}
                  <Link href="/auth/login" className="text-primary hover:underline font-medium">
                    Masuk di sini
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}