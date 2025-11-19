import type React from "react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import DashboardNav from "@/components/dashboard/dashboard-nav"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Check if user is approved - add limit to optimize query
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("approved, role, clinic_name, first_name, last_name", { count: null }) // No count needed, just select specific fields
    .eq("id", data.user.id)
    .limit(1) // Limit to only 1 record
    .single()

  if (profileError || !profile?.approved) {
    redirect("/auth/login")
  }

  return (
    <div className="flex h-screen bg-background">
      <DashboardNav user={data.user} profile={profile} />
      <div className="flex-1 overflow-auto">
        <div className="h-full">{children}</div>
      </div>
    </div>
  )
}
