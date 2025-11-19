"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus } from "lucide-react"

interface Patient {
  id: string
  first_name: string
  last_name: string
}

interface CombinedFormProps {
  patients: Patient[]
  onSubmit: (data: {
    patient_id: string
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
    dateOfBirth?: string
    gender?: string
    address?: string
    appointment_date: string
    appointment_time: string
    duration_minutes: string
    status: string
    notes: string
    cost: string
    treatment_type: string
    frequency?: string
    end_date?: string
  }) => Promise<void>
  isLoading: boolean
  editingAppointment?: any
  onCancel?: () => void
}

export function CombinedAppointmentForm({
  patients,
  onSubmit,
  isLoading,
  editingAppointment,
  onCancel,
}: CombinedFormProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isNewPatient, setIsNewPatient] = useState(false)
  const [treatmentType, setTreatmentType] = useState("one-time")
  const [formData, setFormData] = useState({
    patient_id: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    address: "",
    appointment_date: "",
    appointment_time: "",
    duration_minutes: "30",
    status: "scheduled",
    notes: "",
    cost: "",
    treatment_type: "one-time",
    frequency: "",
    end_date: "",
  })

  useEffect(() => {
    if (editingAppointment) {
      const appointmentDate = new Date(editingAppointment.appointment_date)
      const dateStr = appointmentDate.toISOString().split("T")[0]
      const timeStr = appointmentDate.toTimeString().slice(0, 5)

      setFormData({
        patient_id: editingAppointment.patient_id,
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        dateOfBirth: "",
        gender: "",
        address: "",
        appointment_date: dateStr,
        appointment_time: timeStr,
        duration_minutes: String(editingAppointment.duration_minutes),
        status: editingAppointment.status,
        notes: editingAppointment.notes || "",
        cost: editingAppointment.cost ? String(editingAppointment.cost) : "",
        treatment_type: editingAppointment.treatment_type,
        frequency: editingAppointment.frequency || "",
        end_date: editingAppointment.end_date || "",
      })

      setTreatmentType(editingAppointment.treatment_type)
      setIsNewPatient(false)
      setIsDialogOpen(true)
    }
  }, [editingAppointment])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await onSubmit({ ...formData, treatment_type: treatmentType })
      if (!editingAppointment) {
        setIsDialogOpen(false)
      } else {
        if (onCancel) {
          onCancel()
        } else {
          setIsDialogOpen(false)
        }
      }
      resetForm()
    } catch (error) {
      console.error("Kesalahan saat mengirim data:", error)
    }
  }

  const resetForm = () => {
    setFormData({
      patient_id: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      dateOfBirth: "",
      gender: "",
      address: "",
      appointment_date: "",
      appointment_time: "",
      duration_minutes: "30",
      status: "scheduled",
      notes: "",
      cost: "",
      treatment_type: "one-time",
      frequency: "",
      end_date: "",
    })
    setIsNewPatient(false)
    setTreatmentType("one-time")
  }

  const handleTreatmentTypeChange = (type: string) => {
    setTreatmentType(type)
    setFormData({ ...formData, treatment_type: type })
  }

  return (
    <Dialog
      open={isDialogOpen}
      onOpenChange={(open) => {
        if (!open && !editingAppointment) {
          resetForm()
        }
        setIsDialogOpen(open)
      }}
    >
      <DialogTrigger asChild>
        <Button
          onClick={() => {
            resetForm()
          }}
          className="bg-primary text-primary-foreground hover:bg-primary/90 w-full md:w-auto"
        >
          <Plus size={18} className="mr-2" />
          Janji Temu & Pasien Baru
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingAppointment ? "Edit Janji Temu" : "Buat Janji Temu Baru"}</DialogTitle>
          <DialogDescription>
            {editingAppointment
              ? "Perbarui detail janji temu"
              : "Buat pasien baru atau pilih pasien yang sudah ada, lalu jadwalkan janji temu"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informasi Pasien */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Informasi Pasien</h3>

            {!editingAppointment && (
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={!isNewPatient}
                    onChange={() => setIsNewPatient(false)}
                    className="accent-primary"
                  />
                  <span className="text-sm text-foreground">Pilih Pasien yang Ada</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={isNewPatient}
                    onChange={() => setIsNewPatient(true)}
                    className="accent-primary"
                  />
                  <span className="text-sm text-foreground">Buat Pasien Baru</span>
                </label>
              </div>
            )}

            {!isNewPatient ? (
              <div className="grid gap-2">
                <Label htmlFor="patient_id" className="text-foreground text-sm">
                  Pilih Pasien
                </Label>
                <select
                  id="patient_id"
                  value={formData.patient_id}
                  onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                  required={!isNewPatient}
                  className="px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:border-primary"
                >
                  <option value="">Pilih pasien...</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.first_name} {patient.last_name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="firstName" className="text-foreground text-sm">
                    Nama Depan
                  </Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required={isNewPatient}
                    className="border-border focus:border-primary"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lastName" className="text-foreground text-sm">
                    Nama Belakang
                  </Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required={isNewPatient}
                    className="border-border focus:border-primary"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email" className="text-foreground text-sm">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="border-border focus:border-primary"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="phone" className="text-foreground text-sm">
                    Nomor Telepon
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required={isNewPatient}
                    className="border-border focus:border-primary"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="dateOfBirth" className="text-foreground text-sm">
                    Tanggal Lahir
                  </Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="border-border focus:border-primary"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="gender" className="text-foreground text-sm">
                    Jenis Kelamin
                  </Label>
                  <select
                    id="gender"
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="">Pilih</option>
                    <option value="male">Laki-laki</option>
                    <option value="female">Perempuan</option>
                    <option value="other">Lainnya</option>
                  </select>
                </div>

                <div className="grid gap-2 col-span-2">
                  <Label htmlFor="address" className="text-foreground text-sm">
                    Alamat
                  </Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="border-border focus:border-primary"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Detail Janji Temu */}
          <div className="space-y-4 pt-6 border-t border-border">
            <h3 className="font-semibold text-foreground">Detail Janji Temu</h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="appointment_date" className="text-foreground text-sm">
                  Tanggal
                </Label>
                <Input
                  id="appointment_date"
                  type="date"
                  value={formData.appointment_date}
                  onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
                  required
                  className="border-border focus:border-primary"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="appointment_time" className="text-foreground text-sm">
                  Waktu
                </Label>
                <Input
                  id="appointment_time"
                  type="time"
                  value={formData.appointment_time}
                  onChange={(e) => setFormData({ ...formData, appointment_time: e.target.value })}
                  required
                  className="border-border focus:border-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="duration_minutes" className="text-foreground text-sm">
                  Durasi (menit)
                </Label>
                <select
                  id="duration_minutes"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                  className="px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:border-primary"
                >
                  <option value="15">15 menit</option>
                  <option value="30">30 menit</option>
                  <option value="45">45 menit</option>
                  <option value="60">60 menit</option>
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="status" className="text-foreground text-sm">
                  Status
                </Label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:border-primary"
                >
                  <option value="scheduled">Terjadwal</option>
                  <option value="completed">Selesai</option>
                  <option value="cancelled">Dibatalkan</option>
                </select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cost" className="text-foreground text-sm">
                Biaya (Opsional)
              </Label>
              <Input
                id="cost"
                type="number"
                placeholder="0.00"
                step="0.01"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                className="border-border focus:border-primary"
              />
            </div>
          </div>

          {/* Jenis Perawatan */}
          <div className="space-y-4 pt-6 border-t border-border">
            <h3 className="font-semibold text-foreground">Jenis Perawatan</h3>

            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={treatmentType === "one-time"}
                  onChange={() => handleTreatmentTypeChange("one-time")}
                  className="accent-primary"
                />
                <span className="text-sm text-foreground">Pemeriksaan Sekali</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={treatmentType === "ongoing"}
                  onChange={() => handleTreatmentTypeChange("ongoing")}
                  className="accent-primary"
                />
                <span className="text-sm text-foreground">Perawatan Berkelanjutan</span>
              </label>
            </div>

            {treatmentType === "ongoing" && (
              <div className="space-y-3 p-4 bg-muted rounded-lg">
                <div className="grid gap-2">
                  <Label htmlFor="frequency" className="text-foreground text-sm">
                    Frekuensi
                  </Label>
                  <select
                    id="frequency"
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    required={treatmentType === "ongoing"}
                    className="px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="">Pilih frekuensi...</option>
                    <option value="daily">Harian</option>
                    <option value="weekly">Mingguan</option>
                    <option value="monthly">Bulanan</option>
                  </select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="end_date" className="text-foreground text-sm">
                    Tanggal Selesai
                  </Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required={treatmentType === "ongoing"}
                    className="border-border focus:border-primary"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Catatan */}
          <div className="grid gap-2 pt-6 border-t border-border">
            <Label htmlFor="notes" className="text-foreground text-sm">
              Catatan
            </Label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Tambahkan catatan..."
              className="px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:border-primary min-h-24"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={isLoading}
            >
              {isLoading
                ? "Menyimpan..."
                : editingAppointment
                ? "Perbarui Janji Temu"
                : "Buat Janji Temu"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (editingAppointment && onCancel) {
                  onCancel()
                } else {
                  setIsDialogOpen(false)
                }
                resetForm()
              }}
              className="flex-1 border-border"
            >
              Batal
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
