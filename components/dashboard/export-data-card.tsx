"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { exportDataToExcel } from "@/lib/export/exportData"
import { Download, Filter, RefreshCw } from "lucide-react"

type ExportEntity = "patients" | "appointments" | "users" | "all"

const appointmentStatuses = [
  { value: "all", label: "Semua Status" },
  { value: "scheduled", label: "Terjadwal" },
  { value: "completed", label: "Selesai" },
  { value: "cancelled", label: "Dibatalkan" },
]

const roleOptions = [
  { value: "all", label: "Semua Peran" },
  { value: "admin", label: "Admin" },
  { value: "superadmin", label: "Superadmin" },
]

export function ExportDataCard() {
  const [entity, setEntity] = useState<ExportEntity>("all")
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [role, setRole] = useState("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [dateOrder, setDateOrder] = useState("newest")
  const [isExporting, setIsExporting] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const subtitle = useMemo(() => {
    switch (entity) {
      case "patients":
        return "Ekspor data pasien dengan pencarian & urutan tanggal"
      case "appointments":
        return "Ekspor janji temu dengan filter status & rentang tanggal"
      case "users":
        return "Ekspor daftar pengguna beserta perannya"
      default:
        return "Unduh seluruh data klinik dalam satu file"
    }
  }, [entity])

  const handleExport = async () => {
    try {
      setIsExporting(true)
      setMessage(null)

      const filters: Record<string, unknown> = {}
      if (search) filters.search = search

      if (entity === "patients") {
        filters.dateOrder = dateOrder
      } else if (entity === "appointments") {
        filters.status = status
        if (startDate) filters.startDate = `${startDate}T00:00:00`
        if (endDate) filters.endDate = `${endDate}T23:59:59`
      } else if (entity === "users") {
        filters.role = role
      }

      await exportDataToExcel({ entity, filters })
      setMessage({ type: "success", text: "Ekspor berhasil dimulai" })
    } catch (error) {
      const text = error instanceof Error ? error.message : "Gagal mengekspor data"
      setMessage({ type: "error", text })
    } finally {
      setIsExporting(false)
    }
  }

  const handleReset = () => {
    setSearch("")
    setStatus("all")
    setRole("all")
    setStartDate("")
    setEndDate("")
    setDateOrder("newest")
    setMessage(null)
  }

  return (
    <Card className="border border-border shadow-sm bg-gradient-to-br from-background via-background to-muted/40">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Download className="h-4 w-4 text-primary" />
              Export Data Klinis
            </CardTitle>
            <CardDescription className="mt-1 text-sm text-muted-foreground">
              {subtitle}
            </CardDescription>
          </div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1">
            <Filter className="h-3.5 w-3.5" /> Advanced Filters
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="entity">Jenis Data</Label>
            <select
              id="entity"
              value={entity}
              onChange={(e) => setEntity(e.target.value as ExportEntity)}
              className="border border-border rounded-md bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="all">Semua Data</option>
              <option value="patients">Pasien</option>
              <option value="appointments">Janji Temu</option>
              <option value="users">Pengguna</option>
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="search">Kata Kunci</Label>
            <Input
              id="search"
              placeholder="Cari nama, email, catatan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {entity === "patients" && (
          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Urutan Tanggal</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={dateOrder === "newest" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setDateOrder("newest")}
                >
                  Terbaru
                </Button>
                <Button
                  type="button"
                  variant={dateOrder === "oldest" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setDateOrder("oldest")}
                >
                  Terlama
                </Button>
              </div>
            </div>
            <div className="grid gap-2 text-sm text-muted-foreground">
              <Label>&nbsp;</Label>
              <p className="bg-muted/60 border border-border rounded-md px-3 py-2">
                Gunakan tombol di atas untuk menentukan urutan pasien berdasarkan tanggal pendaftaran.
              </p>
            </div>
          </div>
        )}

        {entity === "appointments" && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Status Janji Temu</Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="border border-border rounded-md bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {appointmentStatuses.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label>Rentang Tanggal</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {entity === "users" && (
          <div className="grid gap-2 md:w-1/2">
            <Label>Filter Peran</Label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="border border-border rounded-md bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {roleOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {message && (
          <div
            className={`text-sm px-3 py-2 rounded-md border ${
              message.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-red-50 border-red-200 text-red-700"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <RefreshCw className="h-3.5 w-3.5" />
            Filter dapat disesuaikan sebelum mengekspor.
          </div>
          <div className="flex gap-2">
            <Button variant="outline" type="button" onClick={handleReset} disabled={isExporting}>
              Reset
            </Button>
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? "Memproses..." : "Export Sekarang"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
