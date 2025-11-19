import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Calendar, TrendingUp } from "lucide-react"
import { CalendarView } from "@/components/dashboard/calendar-view"
import { Suspense } from 'react'

// Separate the data fetching into a server component for better performance
async function DashboardContent() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Ambil data statistik dashboard - now shared across all users
  const [patientsRes, appointmentsRes, revenueRes, upcomingRes, completedAppointmentsRes, allAppointmentsRes] =
    await Promise.all([
      supabase.from("patients").select("*", { count: "exact", head: true }),
      supabase.from("appointments").select("*", { count: "exact", head: true }),
      supabase.from("revenue").select("amount").eq("status", "completed").limit(1000), // Limit to prevent huge datasets
      // Get appointments from today (start of day) onwards
      supabase
        .from("appointments")
        .select("*, patients(first_name, last_name, phone, email, cost)")
        .gte("appointment_date", new Date().toISOString()) // Include all appointments from now onwards
        .neq("status", "cancelled") // Exclude cancelled appointments from upcoming list
        .order("appointment_date", { ascending: true })
        .limit(10),
      supabase.from("appointments").select("cost").eq("status", "completed").limit(1000), // Limit to prevent huge datasets
      supabase.from("appointments").select("cost, status").neq("status", "cancelled").limit(1000), // Limit to prevent huge datasets
    ])

  // Calculate values with proper error handling
  const patientCount = patientsRes.count || 0
  const appointmentCount = appointmentsRes.count || 0
  const totalRevenue =
    (revenueRes.data || []).reduce((sum, r) => sum + (r.amount || 0), 0) +
    (completedAppointmentsRes.data || []).reduce((sum, apt) => sum + (apt.cost || 0), 0)

  // Hitung pendapatan yang diharapkan dari semua janji temu yang tidak dibatalkan
  const expectedRevenue = (allAppointmentsRes.data || [])
    .filter((apt) => apt.status !== "cancelled")
    .reduce((sum, apt) => sum + (apt.cost || 0), 0)

  const upcomingAppointments = upcomingRes.data || []

  const stats = [
    {
      title: "Total Pasien",
      value: patientCount,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-950",
    },
    {
      title: "Janji Temu",
      value: appointmentCount,
      icon: Calendar,
      color: "text-purple-500",
      bgColor: "bg-purple-50 dark:bg-purple-950",
    },
    {
      title: "Total Pendapatan",
      value: `Rp ${totalRevenue.toLocaleString("id-ID")}`,
      icon: TrendingUp,
      color: "text-green-500",
      bgColor: "bg-green-50 dark:bg-green-950",
    },
    {
      title: "Perkiraan Pendapatan",
      value: `Rp ${expectedRevenue.toLocaleString("id-ID")}`,
      icon: TrendingUp,
      color: "text-amber-500",
      bgColor: "bg-amber-50 dark:bg-amber-950",
    },
  ]

  return (
    <>
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Dasbor</h1>
        <p className="text-muted-foreground">
          Selamat datang di sistem manajemen klinik Anda. Berikut ringkasan aktivitas klinik.
        </p>
      </div>

      {/* Statistik */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon
          return (
            <Card key={i} className="border border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`${stat.color} w-5 h-5`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CalendarView />
        </div>

        <Card className="border border-border">
          <CardHeader>
            <CardTitle>Janji Temu Mendatang</CardTitle>
            <CardDescription>
              {Math.min(10, upcomingAppointments.length)} janji temu berikutnya
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada janji temu yang dijadwalkan.</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {upcomingAppointments.map((apt) => (
                  <div key={apt.id} className="p-3 border border-border rounded-lg text-sm space-y-1">
                    <p className="font-semibold text-foreground">
                      {apt.patients?.first_name} {apt.patients?.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(apt.appointment_date).toLocaleDateString("id-ID", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}

export default async function DashboardPage() {
  return (
    <div className="p-6 md:p-8 space-y-8">
      <Suspense fallback={
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mb-2"></div>
            <p className="text-muted-foreground">Memuat dasbor...</p>
          </div>
        </div>
      }>
        <DashboardContent />
      </Suspense>
    </div>
  )
}