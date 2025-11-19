"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, User, Check, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  role: string
  clinic_name: string
  phone: string
  approved: boolean
  created_at: string
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [userRoleFilter, setUserRoleFilter] = useState<"all" | "admin" | "superadmin">("all")
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [isCredentialsDialogOpen, setIsCredentialsDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("admin")
  const [currentUserProfile, setCurrentUserProfile] = useState<{id: string, role: string} | null>(null)
  const [temporaryCredentials, setTemporaryCredentials] = useState<{email: string, password: string} | null>(null)
  const [superadminCount, setSuperadminCount] = useState<number>(0);

  const supabase = createClient()

  // Fetch all users for admin management
  const fetchUsers = async () => {
    setLoading(true)
    try {
      // Get current user profile first
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !currentUser) {
        throw new Error("Authentication failed");
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", currentUser.id)
        .single();

      if (profileError || !profile) {
        throw new Error("Could not get profile information");
      }

      setCurrentUserProfile({ id: profile.id, role: profile.role });

      const { data: usersData, error: usersError } = await supabase
        .from("all_users_for_admins_view")
        .select("*")
        .order("created_at", { ascending: false })

      if (usersError) throw usersError

      setUsers(usersData || [])

      // Count superadmins to determine UI behavior
      const { count: count, error: countError } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "superadmin");

      if (countError) {
        console.error("Error counting superadmins:", countError);
        setSuperadminCount(0);
      } else {
        setSuperadminCount(count || 0);
      }
    } catch (error: any) {
      console.error("Error fetching users:", error)
      setMessage({ type: "error", text: error.message || "Gagal memuat daftar pengguna" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  // Invite a new user
  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      setMessage({ type: "error", text: "Format email tidak valid" });
      return;
    }

    try {
      // Get current session token
      const {
        data: { session },
        error: authError
      } = await supabase.auth.getSession();

      if (authError || !session) {
        setMessage({ type: "error", text: "User not authenticated" });
        return;
      }

      // Call the API route to invite the user
      const response = await fetch('/api/invite-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ email: inviteEmail }),
      });

      const result = await response.json();

      if (result.success) {
        // Extract email and password from the success message
        const emailMatch = result.message.match(/Email: ([^,]+)/);
        const passwordMatch = result.message.match(/Password: ([^,]+)/);

        if (emailMatch && passwordMatch) {
          const email = emailMatch[1];
          const password = passwordMatch[1];

          // Save credentials and show credentials dialog
          setTemporaryCredentials({ email, password });
          setIsCredentialsDialogOpen(true);
        } else {
          setMessage({ type: "success", text: result.message });
        }

        setIsInviteDialogOpen(false);
        setInviteEmail("");
        fetchUsers(); // Refresh the list
      } else {
        setMessage({ type: "error", text: result.message });
      }
    } catch (error: any) {
      console.error("Error inviting user:", error);
      setMessage({ type: "error", text: error.message || "Gagal mengundang pengguna" });
    }
  };

  // Update user role
  const handleUpdateRole = async (userId: string, newRole: string) => {
    // Validate role value
    if (!['admin', 'superadmin'].includes(newRole)) {
      setMessage({ type: "error", text: "Invalid role value" });
      return;
    }

    // First, get the current user and target user info
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !currentUser) {
      setMessage({ type: "error", text: "Authentication failed" });
      return;
    }

    // Don't allow users to change their own role
    if (currentUser.id === userId) {
      setMessage({ type: "error", text: "Tidak dapat mengubah peran Anda sendiri" });
      return;
    }

    try {
      // Get current role for audit logging
      const { data: targetUserProfile, error: targetProfileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle(); // Use maybeSingle() to handle 0 or 1 rows instead of exactly 1

      if (targetProfileError) {
        console.error("Error fetching target user role for audit:", targetProfileError);
        // Continue with the role update but log the error
      }

      const previousRole = targetUserProfile?.role || 'unknown';

      // Get current session to authenticate the API call
      const {
        data: { session },
        error: sessionError
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error("User not authenticated");
      }

      // Check if we're at the limit (2) and handle accordingly
      // Use the existing state value instead of making another call
      if (newRole === "superadmin" && superadminCount >= 2) {
        const confirmTransfer = confirm(
          "Sudah mencapai batas maksimum Superadmin (2). " +
          "Untuk menambah Superadmin baru, Anda harus mentransfer peran Anda. " +
          "Anda akan menjadi Admin dan pengguna ini akan menjadi Superadmin. " +
          "Lanjutkan?"
        );

        if (!confirmTransfer) return;
      }

      // Make API call to update role
      const response = await fetch('/api/update-role', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          targetUserId: userId,
          newRole: newRole
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message);
      }

      setMessage({ type: "success", text: result.message });
      fetchUsers(); // Refresh the list after successful update
    } catch (error: any) {
      console.error("Error updating user role:", error)
      setMessage({ type: "error", text: error.message || "Gagal mengubah peran pengguna" })
    }
  }


  // Delete user
  const handleDeleteUser = async (userId: string) => {
    if (!userId) {
      setMessage({ type: "error", text: "User ID tidak valid" });
      return;
    }

    if (!confirm("Apakah Anda yakin ingin menghapus pengguna ini? Tindakan ini tidak bisa dibatalkan.")) return

    try {
      // Don't allow deleting yourself
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser && currentUser.id === userId) {
        setMessage({ type: "error", text: "Tidak dapat menghapus akun Anda sendiri" });
        return;
      }

      // Get current session to authenticate the API call
      const {
        data: { session },
        error: authError
      } = await supabase.auth.getSession();

      if (authError || !session) {
        setMessage({ type: "error", text: "User not authenticated" });
        return;
      }

      // Debug: Log the URL that will be called
      const apiUrl = `/api/delete-user/${userId}`;
      console.log("Deleting user with URL:", apiUrl);

      // Call the API route to delete both profile and auth user
      const response = await fetch(apiUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message);
      }

      setMessage({ type: "success", text: "Pengguna berhasil dihapus" })
      fetchUsers() // Refresh the list
    } catch (error: any) {
      console.error("Error deleting user:", error)
      setMessage({ type: "error", text: error.message || "Gagal menghapus pengguna" })
    }
  }

  // Filter users based on selected filter - show all users including unapproved ones
  const filteredUsers = users.filter(user => {
    if (userRoleFilter === "admin") return user.role === "admin"
    if (userRoleFilter === "superadmin") return user.role === "superadmin"
    return true // "all" filter shows all users including unapproved
  })

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Shield size={32} />
          Manajemen Pengguna
        </h1>
        <p className="text-muted-foreground">Kelola pengguna, persetujuan, dan hak akses sistem</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <User className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Pengguna</p>
              <p className="text-xl font-bold">{users.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Check className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pengguna Disetujui</p>
              <p className="text-xl font-bold">{users.filter(u => u.approved).length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Shield className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Jumlah Admin</p>
              <p className="text-xl font-bold">{users.filter(u => u.role === 'admin').length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Shield className="text-purple-600" size={20} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Superadmin</p>
              <p className="text-xl font-bold">{users.filter(u => u.role === "superadmin").length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setIsInviteDialogOpen(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Shield className="mr-2 h-4 w-4" />
            Undang Pengguna Baru
          </Button>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2">
        <Button
          variant={userRoleFilter === "all" ? "default" : "outline"}
          onClick={() => setUserRoleFilter("all")}
          className="border-border"
        >
          Semua
        </Button>
        <Button
          variant={userRoleFilter === "admin" ? "default" : "outline"}
          onClick={() => setUserRoleFilter("admin")}
          className="border-border"
        >
          Admin
        </Button>
        <Button
          variant={userRoleFilter === "superadmin" ? "default" : "outline"}
          onClick={() => setUserRoleFilter("superadmin")}
          className="border-border"
        >
          Superadmin
        </Button>
      </div>
      </div>
      {/* Notification Message */}
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

      {/* Users List */}
      <Card className="border border-border">
        <CardHeader>
          <CardTitle>Daftar Pengguna</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <p className="text-muted-foreground">Memuat...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <User size={48} className="mx-auto mb-4 opacity-50" />
              <p>Belum ada pengguna ditemukan</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border">
                  <tr>
                    <th className="text-left py-3 px-4">Nama</th>
                    <th className="text-left py-3 px-4">Email</th>
                    <th className="text-left py-3 px-4">Klinik</th>
                    <th className="text-left py-3 px-4">Peran</th>
                    <th className="text-left py-3 px-4">Tanggal Dibuat</th>
                    <th className="text-left py-3 px-4">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-border last:border-b-0 hover:bg-muted/50">
                      <td className="py-3 px-4">
                        {user.first_name} {user.last_name}
                      </td>
                      <td className="py-3 px-4">{user.email}</td>
                      <td className="py-3 px-4">{user.clinic_name || "-"}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            user.role === 'admin'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                              : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                          }`}>
                            {user.role === 'admin' ? 'Admin' : 'Superadmin'}
                          </span>
                          {currentUserProfile?.id !== user.id && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleUpdateRole(user.id, user.role === 'admin' ? 'superadmin' : 'admin')}
                                className={`text-xs px-2 py-1 rounded ${
                                  user.role === 'admin'
                                    ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-200'
                                    : 'bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900 dark:text-amber-200'
                                }`}
                              >
                                {user.role === 'admin'
                                  ? (superadminCount >= 2 ? 'Transfer' : 'Promosikan')
                                  : 'Turunkan'}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {new Date(user.created_at).toLocaleDateString("id-ID")}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          {user.role !== "superadmin" && currentUserProfile?.id !== user.id && ( // Prevent deleting other superadmins and yourself
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteUser(user.id)}
                              className="border-destructive text-destructive hover:bg-destructive/10"
                            >
                              <X size={16} className="mr-1" />
                              Hapus
                            </Button>
                          )}
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

      {/* Invite User Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Undang Pengguna Baru</DialogTitle>
            <DialogDescription>
              Kirim undangan untuk bergabung ke sistem manajemen klinik
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInviteUser} className="space-y-4">
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Alamat Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@klinik.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  className="col-span-3"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="role">Peran</Label>
                <select
                  id="role"
                  value="admin" // Always "admin" for invitations
                  onChange={() => {}} // Disable changing for invites
                  required
                  className="px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:border-primary opacity-70"
                  disabled
                >
                  <option value="admin">Admin</option>
                </select>
                <p className="text-xs text-muted-foreground">New users are always invited as Admin. Promote existing users to Superadmin after invitation.</p>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Kirim Undangan
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsInviteDialogOpen(false)}
                className="flex-1 border-border"
              >
                Batal
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Credentials Dialog - Shows temporary credentials that can be copied */}
      <Dialog open={isCredentialsDialogOpen} onOpenChange={setIsCredentialsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Kredensial Sementara untuk Pengguna Baru</DialogTitle>
            <DialogDescription>
              Berikut adalah informasi login sementara. Silakan salin dan kirimkan ke pengguna yang bersangkutan.
            </DialogDescription>
          </DialogHeader>
          {temporaryCredentials && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="temp-email">Email</Label>
                <div className="flex">
                  <Input
                    id="temp-email"
                    readOnly
                    value={temporaryCredentials.email}
                    className="rounded-r-none border-r-0"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-l-none border-l-0"
                    onClick={() => navigator.clipboard.writeText(temporaryCredentials.email)}
                  >
                    Salin
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="temp-password">Password Sementara</Label>
                <div className="flex">
                  <Input
                    id="temp-password"
                    readOnly
                    value={temporaryCredentials.password}
                    className="rounded-r-none border-r-0"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-l-none border-l-0"
                    onClick={() => navigator.clipboard.writeText(temporaryCredentials.password)}
                  >
                    Salin
                  </Button>
                </div>
              </div>

              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-800 dark:text-yellow-200">
                <p className="font-medium">Penting:</p>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>Kata sandi ini bersifat sementara dan harus diubah oleh pengguna setelah login pertama</li>
                  <li>Berikan informasi ini secara aman hanya kepada pengguna yang dituju</li>
                  <li>Simpan salinan informasi ini dengan aman dan hapus setelah pengguna mengganti kata sandi</li>
                </ul>
              </div>
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <Button
              className="flex-1"
              onClick={() => setIsCredentialsDialogOpen(false)}
            >
              Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}