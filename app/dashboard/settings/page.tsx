"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Settings } from "lucide-react"

interface Profile {
  first_name: string
  last_name?: string
  clinic_name?: string
  phone?: string
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single()

      if (error) throw error
      setProfile(data)
    } catch (error) {
      console.error("Error fetching profile:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    setSaving(true)
    setMessage(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: profile.first_name,
          last_name: profile.last_name,
          clinic_name: profile.clinic_name,
          phone: profile.phone,
        })
        .eq("id", user.id)

      if (error) throw error
      setMessage({ type: "success", text: "Profil berhasil diperbarui" })
    } catch (error) {
      setMessage({ type: "error", text: "Gagal memperbarui profil" })
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = "/"
  }

  if (loading) {
    return <div className="p-6 md:p-8">Memuat...</div>
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-2xl">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Settings size={32} />
          Pengaturan
        </h1>
        <p className="text-muted-foreground">Kelola akun dan preferensi klinik Anda</p>
      </div>

      {/* Pesan Notifikasi */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === "success"
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Pengaturan Profil */}
      <Card className="border border-border">
        <CardHeader>
          <CardTitle>Informasi Klinik</CardTitle>
          <CardDescription>Perbarui data klinik dan informasi akun Anda</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="first_name" className="text-foreground">
                  Nama Depan
                </Label>
                <Input
                  id="first_name"
                  value={profile?.first_name || ""}
                  onChange={(e) => setProfile(prev => prev ? { ...prev, first_name: e.target.value } : null)}
                  className="border-border focus:border-primary"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="last_name" className="text-foreground">
                  Nama Belakang
                </Label>
                <Input
                  id="last_name"
                  value={profile?.last_name || ""}
                  onChange={(e) => setProfile(prev => prev ? { ...prev, last_name: e.target.value } : null)}
                  className="border-border focus:border-primary"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="clinic_name" className="text-foreground">
                Nama Klinik
              </Label>
              <Input
                id="clinic_name"
                value={profile?.clinic_name || ""}
                onChange={(e) => setProfile(prev => prev ? { ...prev, clinic_name: e.target.value } : null)}
                className="border-border focus:border-primary"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phone" className="text-foreground">
                Nomor Telepon
              </Label>
              <Input
                id="phone"
                value={profile?.phone || ""}
                onChange={(e) => setProfile(prev => prev ? { ...prev, phone: e.target.value } : null)}
                className="border-border focus:border-primary"
              />
            </div>

            <Button
              type="submit"
              className="bg-primary text-primary-foreground hover:bg-primary/90 w-full md:w-auto"
              disabled={saving}
            >
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Keamanan & Keluar */}
      <Card className="border border-border">
        <CardHeader>
          <CardTitle>Keamanan</CardTitle>
          <CardDescription>Kelola keamanan akun Anda</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleSignOut}
            variant="outline"
            className="border-destructive text-destructive hover:bg-destructive/10 bg-transparent"
          >
            Keluar
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
