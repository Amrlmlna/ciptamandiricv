import { NextRequest } from "next/server"
import ExcelJS from "exceljs"
import { createClient } from "@/lib/supabase/server"

type ExportEntity = "patients" | "appointments" | "users" | "all"

interface ExportPayload {
  entity: ExportEntity
  filters?: Record<string, unknown>
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ExportPayload

    if (!body?.entity) {
      return new Response(JSON.stringify({ success: false, message: "Entity is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const supabase = await createClient()
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error || !session) {
      return new Response(JSON.stringify({ success: false, message: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    const workbook = new ExcelJS.Workbook()

    switch (body.entity) {
      case "patients":
        await addPatientsSheet(workbook, supabase, body.filters)
        break
      case "appointments":
        await addAppointmentsSheet(workbook, supabase, body.filters)
        break
      case "users":
        await addUsersSheet(workbook, supabase, body.filters)
        break
      case "all":
        await addPatientsSheet(workbook, supabase, body.filters)
        await addAppointmentsSheet(workbook, supabase, body.filters)
        await addUsersSheet(workbook, supabase, body.filters)
        break
      default:
        return new Response(JSON.stringify({ success: false, message: "Unsupported entity" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        })
    }

    const buffer = await workbook.xlsx.writeBuffer()
    const fileName = `export-${body.entity}-${Date.now()}.xlsx`

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=${fileName}`,
      },
    })
  } catch (err) {
    console.error("Error exporting data", err)
    return new Response(JSON.stringify({ success: false, message: "Failed to export data" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

async function addPatientsSheet(
  workbook: ExcelJS.Workbook,
  supabase: SupabaseServerClient,
  filters?: Record<string, unknown>,
) {
  const sheet = workbook.addWorksheet("Patients")
  sheet.columns = [
    { header: "Nama Depan", key: "first_name", width: 20 },
    { header: "Nama Belakang", key: "last_name", width: 20 },
    { header: "Email", key: "email", width: 28 },
    { header: "Telepon", key: "phone", width: 18 },
    { header: "Tanggal Lahir", key: "date_of_birth", width: 18 },
    { header: "Gender", key: "gender", width: 10 },
    { header: "Alamat", key: "address", width: 30 },
    { header: "Dibuat Pada", key: "created_at", width: 22 },
  ]

  const sortOrder = filters?.dateOrder === "oldest"
  let query = supabase.from("patients").select("*").order("created_at", { ascending: Boolean(sortOrder) })

  if (filters?.search) {
    const search = String(filters.search).toLowerCase()
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
    )
  }

  const { data, error } = await query.limit(5000)
  if (error) throw error

  data?.forEach((row) => {
    sheet.addRow({
      ...row,
      date_of_birth: row.date_of_birth ? new Date(row.date_of_birth).toLocaleDateString("id-ID") : "",
      created_at: row.created_at ? new Date(row.created_at).toLocaleString("id-ID") : "",
    })
  })
}

async function addAppointmentsSheet(
  workbook: ExcelJS.Workbook,
  supabase: SupabaseServerClient,
  filters?: Record<string, unknown>,
) {
  const sheet = workbook.addWorksheet("Appointments")
  sheet.columns = [
    { header: "Pasien", key: "patient_name", width: 25 },
    { header: "Tanggal", key: "appointment_date", width: 24 },
    { header: "Durasi (menit)", key: "duration_minutes", width: 15 },
    { header: "Status", key: "status", width: 16 },
    { header: "Catatan", key: "notes", width: 32 },
    { header: "Biaya", key: "cost", width: 14 },
    { header: "Tipe Perawatan", key: "treatment_type", width: 18 },
    { header: "Frekuensi", key: "frequency", width: 14 },
    { header: "Tanggal Akhir", key: "end_date", width: 20 },
  ]

  let query = supabase
    .from("appointments")
    .select("*, patients(first_name, last_name)")
    .order("appointment_date", { ascending: true })

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status)
  }

  if (filters?.search) {
    const search = String(filters.search)
    query = query.or(
      `notes.ilike.%${search}%,status.ilike.%${search}%,patients.first_name.ilike.%${search}%,patients.last_name.ilike.%${search}%`,
    )
  }

  if (filters?.startDate) {
    query = query.gte("appointment_date", filters.startDate as string)
  }

  if (filters?.endDate) {
    query = query.lte("appointment_date", filters.endDate as string)
  }

  const { data, error } = await query.limit(5000)
  if (error) throw error

  data?.forEach((row) => {
    sheet.addRow({
      patient_name: `${row.patients?.first_name || ""} ${row.patients?.last_name || ""}`.trim(),
      appointment_date: row.appointment_date ? new Date(row.appointment_date).toLocaleString("id-ID") : "",
      duration_minutes: row.duration_minutes,
      status: row.status,
      notes: row.notes,
      cost: row.cost,
      treatment_type: row.treatment_type,
      frequency: row.frequency,
      end_date: row.end_date ? new Date(row.end_date).toLocaleDateString("id-ID") : "",
    })
  })
}

async function addUsersSheet(workbook: ExcelJS.Workbook, supabase: SupabaseServerClient, filters?: Record<string, unknown>) {
  const sheet = workbook.addWorksheet("Users")
  sheet.columns = [
    { header: "Nama", key: "name", width: 25 },
    { header: "Email", key: "email", width: 28 },
    { header: "Klinik", key: "clinic_name", width: 28 },
    { header: "Telepon", key: "phone", width: 18 },
    { header: "Peran", key: "role", width: 14 },
    { header: "Disetujui", key: "approved", width: 14 },
    { header: "Dibuat Pada", key: "created_at", width: 22 },
  ]

  let query = supabase.from("all_users_for_admins_view").select("*").order("created_at", { ascending: false })

  if (filters?.role && filters.role !== "all") {
    query = query.eq("role", filters.role)
  }

  const { data, error } = await query.limit(5000)
  if (error) throw error

  data?.forEach((row) => {
    sheet.addRow({
      name: `${row.first_name || ""} ${row.last_name || ""}`.trim(),
      email: row.email,
      clinic_name: row.clinic_name,
      phone: row.phone,
      role: row.role,
      approved: row.approved ? "Ya" : "Tidak",
      created_at: row.created_at ? new Date(row.created_at).toLocaleString("id-ID") : "",
    })
  })
}
