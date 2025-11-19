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

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    repeatPassword: "",
    firstName: "",
    lastName: "",
  })
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    if (formData.password !== formData.repeatPassword) {
      setError("Kata sandi tidak cocok.")
      setIsLoading(false)
      return
    }

    if (formData.password.length < 8) {
      setError("Kata sandi harus memiliki minimal 8 karakter.")
      setIsLoading(false)
      return
    }

    try {
      const { error: authError, data } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/auth/sign-up-success`,
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
          },
        },
      })

      if (authError) {
        throw new Error(authError.message)
      }

      if (data?.user?.id) {
        // Perbarui profil dengan informasi tambahan
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            first_name: formData.firstName,
            last_name: formData.lastName,
          })
          .eq("id", data.user.id)

        if (updateError) {
          console.error("Kesalahan saat memperbarui profil:", updateError)
        }
      }

      router.push("/auth/sign-up-success")
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
            <p className="text-sm text-muted-foreground">Pendaftaran Ditutup</p>
          </div>

          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="text-2xl">Akses Terbatas</CardTitle>
              <CardDescription>
                Pendaftaran pengguna baru ditutup. Silakan hubungi administrator untuk mendapatkan akses.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6">
                <p className="text-muted-foreground mb-6">
                  Pendaftaran eksternal telah dinonaktifkan. Akses ke sistem hanya tersedia melalui undangan dari administrator.
                </p>
                <Link href="/auth/login">
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                    Kembali ke Halaman Masuk
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
