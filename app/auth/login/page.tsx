"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        throw new Error(authError.message)
      }

      // Check user role without approval requirement
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("email", email)
        .single()

      if (profileError) {
        throw new Error("Tidak dapat memverifikasi status akun.")
      }

      router.push("/dashboard")
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
            <p className="text-sm text-muted-foreground">Masuk ke akun Anda</p>
          </div>

          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="text-2xl">Selamat Datang Kembali</CardTitle>
              <CardDescription>Masukkan data akun Anda untuk mengakses sistem manajemen klinik</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin}>
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
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-foreground">
                        Kata Sandi
                      </Label>
                      <Link href="/auth/forgot-password" className="text-xs text-primary hover:underline">
                        Lupa kata sandi?
                      </Link>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="border-border focus:border-primary"
                    />
                  </div>
                  {error && (
                    <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive">
                      {error}
                    </div>
                  )}
                  <Button
                    type="submit"
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    disabled={isLoading}
                  >
                    {isLoading ? "Sedang masuk..." : "Masuk"}
                  </Button>
                </div>
              </form>

              <div className="mt-6 pt-6 border-t border-border text-center text-sm">
                <p className="text-muted-foreground">
                  Belum punya akun?{" "}
                  <Link href="/auth/sign-up" className="text-primary hover:underline font-medium">
                    Buat akun sekarang
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
