"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isPasswordUpdated, setIsPasswordUpdated] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isTokenValid, setIsTokenValid] = useState(true)

  const supabase = createClient()

  // Check if we have a valid session from the magic link
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error || !session) {
        // If there's no session, maybe the user came directly to this page
        // We should check if they're logged in or redirect them appropriately
        setIsTokenValid(false)
      } else {
        // If there's a valid session, keep the page accessible
        setIsTokenValid(true)
      }
    }

    checkSession()
  }, [supabase])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setMessage("")

    // Check if passwords match
    if (newPassword !== confirmPassword) {
      setError("Kata sandi tidak cocok")
      setIsLoading(false)
      return
    }

    // Check password strength
    if (newPassword.length < 8) {
      setError("Kata sandi harus memiliki setidaknya 8 karakter")
      setIsLoading(false)
      return
    }

    try {
      // Update the password using Supabase auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) {
        throw new Error(updateError.message)
      }

      setMessage("Kata sandi berhasil diperbarui!")
      setIsPasswordUpdated(true)
      
      // Redirect after a short delay
      setTimeout(() => {
        router.push("/auth/login")
      }, 2000)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan."
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isTokenValid) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center p-4 md:p-6 bg-background">
        <div className="w-full max-w-md">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2 text-center mb-4">
              <div className="w-16 h-16 rounded-lg overflow-hidden mx-auto">
                <img src="/image.png" alt="Klinik CV Cipta Mandiri" className="w-full h-full object-contain" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">Klinik CV Cipta Mandiri</h1>
              <p className="text-sm text-muted-foreground">Atur ulang kata sandi</p>
            </div>

            <Card className="border border-border">
              <CardHeader>
                <CardTitle className="text-2xl">Link Tidak Valid</CardTitle>
                <CardDescription>
                  Link atur ulang kata sandi tidak valid atau sudah kadaluarsa.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-6">
                    Link atur ulang kata sandi mungkin sudah digunakan atau telah kadaluarsa. 
                    Silakan minta link baru.
                  </p>
                  <Link href="/auth/forgot-password">
                    <Button className="w-full">
                      Mintai Link Baru
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (isPasswordUpdated) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center p-4 md:p-6 bg-background">
        <div className="w-full max-w-md">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2 text-center mb-4">
              <div className="w-16 h-16 rounded-lg overflow-hidden mx-auto">
                <img src="/image.png" alt="Klinik CV Cipta Mandiri" className="w-full h-full object-contain" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">Klinik CV Cipta Mandiri</h1>
              <p className="text-sm text-muted-foreground">Atur ulang kata sandi</p>
            </div>

            <Card className="border border-border">
              <CardHeader>
                <CardTitle className="text-2xl">Kata Sandi Diperbarui</CardTitle>
                <CardDescription>
                  Kata sandi Anda telah berhasil diperbarui.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <div className="p-3 bg-primary/10 border border-primary/30 rounded-md text-sm text-primary mb-4">
                    {message}
                  </div>
                  <p className="text-sm text-muted-foreground mb-6">
                    Anda akan diarahkan kembali ke halaman login secara otomatis.
                  </p>
                  <Button 
                    onClick={() => router.push("/auth/login")}
                    className="w-full"
                  >
                    Masuk Sekarang
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
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
            <p className="text-sm text-muted-foreground">Atur ulang kata sandi</p>
          </div>

          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="text-2xl">Atur Ulang Kata Sandi</CardTitle>
              <CardDescription>
                Masukkan kata sandi baru untuk akun Anda
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleResetPassword}>
                <div className="flex flex-col gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="new-password" className="text-foreground">
                      Kata Sandi Baru
                    </Label>
                    <Input
                      id="new-password"
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="border-border focus:border-primary"
                      placeholder="Masukkan kata sandi baru"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="confirm-password" className="text-foreground">
                      Konfirmasi Kata Sandi
                    </Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="border-border focus:border-primary"
                      placeholder="Konfirmasi kata sandi baru"
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
                    {isLoading ? "Memperbarui..." : "Atur Ulang Kata Sandi"}
                  </Button>
                </div>
              </form>

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