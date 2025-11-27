"use client";

import type React from "react";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Plus, Trash2, Edit2, Search, Filter } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { exportDataToExcel } from "@/lib/export/exportData";

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  created_at: string;
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    gender: "",
    address: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all"); // all, oldest, newest
  const [isExporting, setIsExporting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error("Error fetching patients:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await exportDataToExcel({
        entity: "patients",
        filters: {
          search: searchTerm,
          dateOrder: dateFilter === "oldest" ? "oldest" : "newest",
        },
      });
    } catch (error) {
      console.error("Error exporting patients:", error);
      alert(error instanceof Error ? error.message : "Gagal mengekspor pasien");
    } finally {
      setIsExporting(false);
    }
  };

  // Memoize filtered and sorted patients to prevent unnecessary re-computation
  const sortedPatients = useMemo(() => {
    // First, filter based on search term
    const filtered = patients.filter(
      (patient) =>
        patient.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.gender?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Then, sort based on the date filter
    return [...filtered].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();

      if (dateFilter === "newest") {
        return dateB - dateA; // descending (newest first)
      } else if (dateFilter === "oldest") {
        return dateA - dateB; // ascending (oldest first)
      }
      // When dateFilter is "all", maintain default order (newest first)
      return dateB - dateA; // descending (newest first)
    });
  }, [patients, searchTerm, dateFilter]);

  const resetForm = () => {
    setFormData({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      date_of_birth: "",
      gender: "",
      address: "",
    });
    setEditingPatient(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    try {
      if (editingPatient) {
        const { error } = await supabase
          .from("patients")
          .update(formData)
          .eq("id", editingPatient.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("patients")
          .insert([formData]);

        if (error) throw error;
      }

      setIsDialogOpen(false);
      resetForm();
      await fetchPatients();
    } catch (error) {
      console.error("Error saving patient:", error);
    }
  };

  const handleEdit = (patient: Patient) => {
    setEditingPatient(patient);
    setFormData({
      first_name: patient.first_name,
      last_name: patient.last_name,
      email: patient.email || "",
      phone: patient.phone,
      date_of_birth: patient.date_of_birth || "",
      gender: patient.gender || "",
      address: patient.address || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus pasien ini?")) return;

    try {
      const { error } = await supabase.from("patients").delete().eq("id", id);

      if (error) throw error;
      await fetchPatients();
    } catch (error) {
      console.error("Error deleting patient:", error);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Users size={32} />
            Pasien
          </h1>
          <p className="text-muted-foreground">
            Kelola data pasien dan catatan medis Anda
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => resetForm()}
              className="bg-primary text-primary-foreground hover:bg-primary/90 w-full md:w-auto">
              <Plus size={18} className="mr-2" />
              Tambah Pasien
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingPatient ? "Edit Data Pasien" : "Tambah Pasien Baru"}
              </DialogTitle>
              <DialogDescription>
                {editingPatient
                  ? "Perbarui informasi pasien"
                  : "Buat catatan pasien baru"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label
                    htmlFor="first_name"
                    className="text-foreground text-sm">
                    Nama Depan
                  </Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) =>
                      setFormData({ ...formData, first_name: e.target.value })
                    }
                    required
                    className="border-border focus:border-primary"
                  />
                </div>
                <div className="grid gap-2">
                  <Label
                    htmlFor="last_name"
                    className="text-foreground text-sm">
                    Nama Belakang
                  </Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) =>
                      setFormData({ ...formData, last_name: e.target.value })
                    }
                    required
                    className="border-border focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email" className="text-foreground text-sm">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
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
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  required
                  className="border-border focus:border-primary"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="dob" className="text-foreground text-sm">
                  Tanggal Lahir
                </Label>
                <Input
                  id="dob"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) =>
                    setFormData({ ...formData, date_of_birth: e.target.value })
                  }
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
                  onChange={(e) =>
                    setFormData({ ...formData, gender: e.target.value })
                  }
                  className="px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:border-primary">
                  <option value="">Pilih</option>
                  <option value="male">Laki-laki</option>
                  <option value="female">Perempuan</option>
                  <option value="other">Lainnya</option>
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="address" className="text-foreground text-sm">
                  Alamat
                </Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  className="border-border focus:border-primary"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
                  {editingPatient ? "Perbarui" : "Buat"} Data Pasien
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="flex-1 border-border">
                  Batal
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Bilah Pencarian dan Filter */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Cari pasien..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 bg-background"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:border-primary px-3 py-2">
            <option value="all">Semua Tanggal</option>
            <option value="newest">Terbaru</option>
            <option value="oldest">Terlama</option>
          </select>

          <Button
            type="button"
            variant="outline"
            className="border-border"
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? "Mengekspor..." : "Export Excel"}
          </Button>
        </div>
      </div>

      {/* Tabel Pasien */}
      <Card className="border border-border">
        <CardHeader>
          <CardTitle>Daftar Pasien</CardTitle>
          <CardDescription>
            {sortedPatients.length} dari {patients.length} pasien terdaftar
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Memuat...</p>
          ) : sortedPatients.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Tidak ada pasien ditemukan.{" "}
              {searchTerm || dateFilter !== "all"
                ? "Coba ubah filter pencarian Anda."
                : "Tambahkan pasien pertama untuk memulai."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">
                      Nama
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">
                      Telepon
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">
                      Email
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">
                      Tanggal Lahir
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-muted-foreground">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPatients.map((patient) => (
                    <tr
                      key={patient.id}
                      className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-4 font-medium text-foreground">
                        {patient.first_name} {patient.last_name}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {patient.phone}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {patient.email || "-"}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {patient.date_of_birth
                          ? new Date(patient.date_of_birth).toLocaleDateString(
                              "id-ID"
                            )
                          : "-"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEdit(patient)}
                            className="p-2 text-primary hover:bg-primary/10 rounded transition-colors">
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(patient.id)}
                            className="p-2 text-destructive hover:bg-destructive/10 rounded transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
