import type React from "react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Check if user is a superadmin (only superadmin can access admin panel)
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, approved")
    .eq("id", data.user.id)
    .single()

  if (profileError || !profile?.approved || profile?.role !== 'superadmin') {
    redirect("/dashboard") // Redirect non-superadmins to regular dashboard
  }

  return <>{children}</>
}