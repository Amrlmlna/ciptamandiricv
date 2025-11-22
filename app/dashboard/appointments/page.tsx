"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Trash2, Edit2, Clock, Search } from "lucide-react"
import { CombinedAppointmentForm } from "@/components/dashboard/combined-appointment-form"
import { Input } from "@/components/ui/input"

interface Patient {
  id: string
  first_name: string
  last_name: string
}

interface Appointment {
  id: string
  patient_id: string
  appointment_date: string
  duration_minutes: number
  status: string
  notes: string
  cost: number
  treatment_type: string
  frequency?: string
  end_date?: string
  patients?: Patient
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")

  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // Fetch appointments with pagination and limit to current and future dates
      const [appointmentsRes, patientsRes] = await Promise.all([
        supabase
          .from("appointments")
          .select("*, patients(first_name, last_name)")
          .gte("appointment_date", new Date().toISOString()) // Only fetch future appointments to limit data
          .order("appointment_date", { ascending: true })
          .limit(100), // Limit to prevent performance issues
        supabase
          .from("patients")
          .select("id, first_name, last_name")
          .order("first_name")
          .limit(1000), // Limit to prevent performance issues
      ])

      setAppointments(appointmentsRes.data || [])
      setPatients(patientsRes.data || [])
    } catch (error) {
      console.error("Kesalahan mengambil data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAppointment = async (data: any) => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    try {
      let patientId = data.patient_id

      if (!patientId && data.firstName) {
        const { data: newPatient, error: patientError } = await supabase
          .from("patients")
          .insert([
            {
              first_name: data.firstName,
              last_name: data.lastName,
              email: data.email,
              phone: data.phone,
              date_of_birth: data.dateOfBirth,
              gender: data.gender,
              address: data.address,
            },
          ])
          .select()

        if (patientError) throw patientError
        patientId = newPatient[0].id
      }

      const appointmentDateTime = `${data.appointment_date}T${data.appointment_time}:00`

      const appointmentPayload = {
        patient_id: patientId,
        appointment_date: appointmentDateTime,
        duration_minutes: Number.parseInt(data.duration_minutes),
        status: data.status,
        notes: data.notes,
        cost: data.cost ? Number.parseFloat(data.cost) : null,
        treatment_type: data.treatment_type,
        frequency: data.frequency || null,
        end_date: data.end_date || null,
      }

      if (editingAppointment) {
        const { error } = await supabase.from("appointments").update(appointmentPayload).eq("id", editingAppointment.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from("appointments").insert([
          appointmentPayload,
        ])
        if (error) throw error
      }

      setEditingAppointment(null)
      await fetchData()
    } catch (error) {
      console.error("Kesalahan menyimpan janji temu:", error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus janji temu ini?")) return

    try {
      // First, update any related revenue records to remove the appointment reference
      const { error: revenueError } = await supabase
        .from('revenue')
        .update({ appointment_id: null })
        .eq('appointment_id', id)

      if (revenueError) {
        console.error("Kesalahan saat menghapus referensi pendapatan:", {
          message: revenueError?.message,
          code: revenueError?.code,
          details: revenueError?.details,
          hint: revenueError?.hint
        })
        // Don't throw here - continue with appointment deletion even if revenue update fails
      }

      // Then delete the appointment
      const { error: appointmentError, status, statusText } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id)

      if (appointmentError) {
        console.error("Kesalahan menghapus janji temu - Detail:", {
          message: appointmentError?.message,
          code: appointmentError?.code,
          details: appointmentError?.details,
          hint: appointmentError?.hint,
          status,
          statusText
        })
        throw appointmentError
      }

      await fetchData()
    } catch (error: any) {
      console.error("Kesalahan menghapus janji temu - Error object:", error)
      console.error("Kesalahan menghapus janji temu - Error message:", error?.message || "No message")
      console.error("Kesalahan menghapus janji temu - Error code:", error?.code || "No code")
      console.error("Kesalahan menghapus janji temu - Error details:", error?.details || "No details")
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
    }
  }

  const handleEdit = (appointment: Appointment) => {
    setEditingAppointment(appointment)
  }

  // Memoize filtered and sorted appointments to prevent recomputation on every render
  const memoizedFilteredAppointments = useMemo(() => {
    if (!appointments) return []

    return appointments.filter((appointment) => {
      const matchesSearch =
        !searchTerm ||
        appointment.patients?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.patients?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
        new Date(appointment.appointment_date).toLocaleDateString("id-ID").includes(searchTerm) ||
        appointment.notes?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = statusFilter === "all" || appointment.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [appointments, searchTerm, statusFilter])

  const sortedAppointments = useMemo(() => {
    // If no date filter or "all", sort by nearest (earliest first)
    if (dateFilter === "all" || dateFilter === "nearest") {
      return [...memoizedFilteredAppointments].sort((a, b) => {
        const dateA = new Date(a.appointment_date).getTime()
        const dateB = new Date(b.appointment_date).getTime()
        return dateA - dateB // Earliest first (nearest in time)
      })
    } else if (dateFilter === "oldest") {
      return [...memoizedFilteredAppointments].sort((a, b) => {
        const dateA = new Date(a.appointment_date).getTime()
        const dateB = new Date(b.appointment_date).getTime()
        return dateB - dateA // Latest first (oldest appointments first in list)
      })
    }
    return [...memoizedFilteredAppointments] // Just return unsorted if no condition matches
  }, [memoizedFilteredAppointments, dateFilter])

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Calendar size={32} />
            Janji Temu
          </h1>
          <p className="text-muted-foreground">Jadwalkan dan kelola janji temu pasien Anda</p>
        </div>

        <CombinedAppointmentForm patients={patients} onSubmit={handleCreateAppointment} isLoading={loading} />
      </div>

      {/* Dialog Edit */}
      {editingAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg border border-border w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Edit Janji Temu</h2>
                <button
                  onClick={() => setEditingAppointment(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>

              <CombinedAppointmentForm
                patients={patients}
                onSubmit={handleCreateAppointment}
                isLoading={loading}
                editingAppointment={editingAppointment}
                onCancel={() => setEditingAppointment(null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Search dan Filter */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Cari janji temu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 bg-background"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:border-primary px-3 py-2"
          >
            <option value="all">Semua Status</option>
            <option value="scheduled">Terjadwal</option>
            <option value="completed">Selesai</option>
            <option value="cancelled">Dibatalkan</option>
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:border-primary px-3 py-2"
          >
            <option value="all">Semua Tanggal</option>
            <option value="nearest">Terdekat</option>
            <option value="oldest">Terlama</option>
          </select>
        </div>
      </div>

      {/* Daftar Janji Temu */}
      <Card className="border border-border">
        <CardHeader>
          <CardTitle>Daftar Janji Temu</CardTitle>
          <CardDescription>
            {sortedAppointments.length} dari {appointments.length}{" "}
            {appointments.length === 1 ? "janji temu" : "janji temu"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Memuat...</p>
          ) : sortedAppointments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Tidak ada janji temu ditemukan.{" "}
              {searchTerm || statusFilter !== "all" || dateFilter !== "all"
                ? "Tidak ada hasil yang sesuai dengan filter Anda."
                : "Belum ada janji temu terjadwal. Tambahkan janji temu pertama Anda."}
            </p>
          ) : (
            <div className="space-y-3">
              {sortedAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-start justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-foreground">
                          {appointment.patients?.first_name} {appointment.patients?.last_name}
                        </p>
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(appointment.status)}`}>
                          {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                        </span>
                      </div>
                      {appointment.treatment_type === "ongoing" && (
                        <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                          {appointment.frequency?.charAt(0).toUpperCase() + (appointment.frequency?.slice(1) || "")}{" "}
                          Berkelanjutan
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {new Date(appointment.appointment_date).toLocaleDateString("id-ID")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        {new Date(appointment.appointment_date).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span>{appointment.duration_minutes} menit</span>
                    </div>
                    {appointment.notes && <p className="text-sm text-muted-foreground">{appointment.notes}</p>}
                    {appointment.cost && (
                      <p className="text-sm font-medium text-primary">Rp {appointment.cost.toLocaleString("id-ID")}</p>
                    )}
                    {appointment.status === "completed" && appointment.cost && (
                      <span className="text-xs text-green-600 font-medium">Selesai - Pendapatan Tercatat</span>
                    )}
                    {appointment.end_date && (
                      <p className="text-sm text-muted-foreground">
                        Hingga: {new Date(appointment.end_date).toLocaleDateString("id-ID")}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => {
                        setEditingAppointment(appointment)
                      }}
                      className="p-2 text-primary hover:bg-primary/10 rounded transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(appointment.id)}
                      className="p-2 text-destructive hover:bg-destructive/10 rounded transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
