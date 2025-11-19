"use client";

import type React from "react";

import { useState, useEffect } from "react";
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
import { TrendingUp, Plus, Trash2, Edit2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

interface Revenue {
  id: string;
  amount: number;
  payment_method: string;
  status: string;
  transaction_date: string;
  notes: string;
}

interface ChartData {
  date: string;
  amount: number;
}

interface Appointment {
  id: string;
  status: string;
  cost: number;
}

export default function RevenuePage() {
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRevenue, setEditingRevenue] = useState<Revenue | null>(null);
  const [formData, setFormData] = useState({
    amount: "",
    payment_method: "cash",
    status: "completed",
    transaction_date: "",
    notes: "",
  });

  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [revenueRes, appointmentsRes] = await Promise.all([
        supabase
          .from("revenue")
          .select("*")
          .order("transaction_date", { ascending: false }),
        supabase
          .from("appointments")
          .select("id, status, cost"),
      ]);

      setRevenues(revenueRes.data || []);
      setAppointments(appointmentsRes.data || []);
    } catch (error) {
      console.error("Error fetching revenue:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      amount: "",
      payment_method: "cash",
      status: "completed",
      transaction_date: "",
      notes: "",
    });
    setEditingRevenue(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const payload = {
        amount: Number.parseFloat(formData.amount),
        payment_method: formData.payment_method,
        status: formData.status,
        transaction_date: formData.transaction_date,
        notes: formData.notes,
      };

      if (editingRevenue) {
        const { error } = await supabase
          .from("revenue")
          .update(payload)
          .eq("id", editingRevenue.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("revenue")
          .insert([payload]);

        if (error) throw error;
      }

      setIsDialogOpen(false);
      resetForm();
      await fetchData();
    } catch (error) {
      console.error("Error saving revenue:", error);
    }
  };

  const handleEdit = (revenue: Revenue) => {
    setEditingRevenue(revenue);
    setFormData({
      amount: revenue.amount.toString(),
      payment_method: revenue.payment_method,
      status: revenue.status,
      transaction_date: revenue.transaction_date,
      notes: revenue.notes,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus catatan pendapatan ini?"))
      return;

    try {
      const { error } = await supabase.from("revenue").delete().eq("id", id);

      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error("Error deleting revenue:", error);
    }
  };

  const totalRevenue =
    revenues.reduce((sum, r) => sum + r.amount, 0) +
    appointments
      .filter((apt) => apt.status === "completed")
      .reduce((sum, apt) => sum + (apt.cost || 0), 0);

  const completedRevenue =
    revenues
      .filter((r) => r.status === "completed")
      .reduce((sum, r) => sum + r.amount, 0) +
    appointments
      .filter((apt) => apt.status === "completed")
      .reduce((sum, apt) => sum + (apt.cost || 0), 0);

  const pendingRevenue = revenues
    .filter((r) => r.status === "pending")
    .reduce((sum, r) => sum + r.amount, 0);

  // Calculate estimated revenue as the total expected revenue from all non-cancelled appointments
  const estimatedRevenue =
    revenues
      .filter((r) => r.status === "completed")
      .reduce((sum, r) => sum + r.amount, 0) +
    appointments
      .filter((apt) => apt.status !== "cancelled") // All non-cancelled appointments contribute to estimated revenue
      .reduce((sum, apt) => sum + (apt.cost || 0), 0);

  // Prepare chart data (last 30 days)
  const chartData: ChartData[] = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    const dayRevenue = revenues
      .filter((r) => r.transaction_date.startsWith(dateStr))
      .reduce((sum, r) => sum + r.amount, 0);

    if (dayRevenue > 0) {
      chartData.push({
        date: date.toLocaleDateString("id-ID", {
          month: "short",
          day: "numeric",
        }),
        amount: dayRevenue,
      });
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp size={32} />
            Pelacakan Pendapatan
          </h1>
          <p className="text-muted-foreground">
            Pantau dan kelola pendapatan klinik Anda
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => resetForm()}
              className="bg-primary text-primary-foreground hover:bg-primary/90 w-full md:w-auto">
              <Plus size={18} className="mr-2" />
              Catat Transaksi
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingRevenue ? "Edit Transaksi" : "Catat Pendapatan"}
              </DialogTitle>
              <DialogDescription>
                {editingRevenue
                  ? "Perbarui detail transaksi"
                  : "Catat transaksi pendapatan baru"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="amount" className="text-foreground text-sm">
                  Jumlah (Rp)
                </Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  required
                  className="border-border focus:border-primary"
                />
              </div>

              <div className="grid gap-2">
                <Label
                  htmlFor="payment_method"
                  className="text-foreground text-sm">
                  Metode Pembayaran
                </Label>
                <select
                  id="payment_method"
                  value={formData.payment_method}
                  onChange={(e) =>
                    setFormData({ ...formData, payment_method: e.target.value })
                  }
                  className="px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:border-primary">
                  <option value="cash">Tunai</option>
                  <option value="card">Kartu</option>
                  <option value="transfer">Transfer Bank</option>
                  <option value="other">Lainnya</option>
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="status" className="text-foreground text-sm">
                  Status
                </Label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className="px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:border-primary">
                  <option value="pending">Menunggu</option>
                  <option value="completed">Selesai</option>
                  <option value="cancelled">Dibatalkan</option>
                </select>
              </div>

              <div className="grid gap-2">
                <Label
                  htmlFor="transaction_date"
                  className="text-foreground text-sm">
                  Tanggal Transaksi
                </Label>
                <Input
                  id="transaction_date"
                  type="date"
                  value={formData.transaction_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      transaction_date: e.target.value,
                    })
                  }
                  required
                  className="border-border focus:border-primary"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notes" className="text-foreground text-sm">
                  Catatan
                </Label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Tambahkan catatan..."
                  className="px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:border-primary min-h-20"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
                  {editingRevenue ? "Perbarui" : "Catat"} Transaksi
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

      {/* Kartu Statistik */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Pendapatan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              Rp {totalRevenue.toLocaleString("id-ID")}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Perkiraan Pendapatan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              Rp {estimatedRevenue.toLocaleString("id-ID")}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Selesai + Berlangsung
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Menunggu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              Rp {pendingRevenue.toLocaleString("id-ID")}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grafik */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border border-border">
            <CardHeader>
              <CardTitle>Tren Pendapatan</CardTitle>
              <CardDescription>30 hari terakhir</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border)"
                  />
                  <XAxis
                    dataKey="date"
                    stroke="var(--color-muted-foreground)"
                  />
                  <YAxis stroke="var(--color-muted-foreground)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--color-background)",
                      border: "1px solid var(--color-border)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="var(--color-primary)"
                    name="Pendapatan"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardHeader>
              <CardTitle>Metode Pembayaran</CardTitle>
              <CardDescription>Distribusi</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {["cash", "card", "transfer", "other"].map((method) => {
                  const amount = revenues
                    .filter((r) => r.payment_method === method)
                    .reduce((sum, r) => sum + r.amount, 0);
                  const percentage =
                    totalRevenue > 0
                      ? ((amount / totalRevenue) * 100).toFixed(1)
                      : 0;

                  const label =
                    method === "cash"
                      ? "Tunai"
                      : method === "card"
                      ? "Kartu"
                      : method === "transfer"
                      ? "Transfer Bank"
                      : "Lainnya";

                  return amount > 0 ? (
                    <div key={method}>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">
                          {label}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {percentage}%
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  ) : null;
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabel Transaksi */}
      <Card className="border border-border">
        <CardHeader>
          <CardTitle>Riwayat Transaksi</CardTitle>
          <CardDescription>
            {revenues.length}{" "}
            {revenues.length === 1 ? "transaksi" : "transaksi"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Memuat...</p>
          ) : revenues.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Belum ada transaksi yang dicatat.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">
                      Tanggal
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">
                      Jumlah
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">
                      Metode
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">
                      Catatan
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-muted-foreground">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {revenues.map((revenue) => (
                    <tr
                      key={revenue.id}
                      className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-4 text-muted-foreground">
                        {new Date(revenue.transaction_date).toLocaleDateString(
                          "id-ID"
                        )}
                      </td>
                      <td className="py-3 px-4 font-semibold text-foreground">
                        Rp {revenue.amount.toLocaleString("id-ID")}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground capitalize">
                        {revenue.payment_method === "cash"
                          ? "Tunai"
                          : revenue.payment_method === "card"
                          ? "Kartu"
                          : revenue.payment_method === "transfer"
                          ? "Transfer Bank"
                          : "Lainnya"}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            revenue.status === "completed"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : revenue.status === "pending"
                              ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                          }`}>
                          {revenue.status === "completed"
                            ? "Selesai"
                            : revenue.status === "pending"
                            ? "Menunggu"
                            : "Dibatalkan"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">
                        {revenue.notes || "-"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEdit(revenue)}
                            className="p-2 text-primary hover:bg-primary/10 rounded transition-colors">
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(revenue.id)}
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
