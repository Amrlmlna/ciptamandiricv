"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { LayoutDashboard, Users, Calendar, TrendingUp, Settings, LogOut, Menu, X } from "lucide-react"

interface User {
  id: string
  email: string
}

interface Profile {
  clinic_name: string
  first_name: string
  last_name: string
  role: string
}

interface DashboardNavProps {
  user: User
  profile: Profile
}

export default function DashboardNav({ user, profile }: DashboardNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  const menuItems = [
    { href: "/dashboard", label: "Dasbor", icon: LayoutDashboard },
    { href: "/dashboard/patients", label: "Pasien", icon: Users },
    { href: "/dashboard/appointments", label: "Janji Temu", icon: Calendar },
    { href: "/dashboard/revenue", label: "Pendapatan", icon: TrendingUp },
    { href: "/dashboard/settings", label: "Pengaturan", icon: Settings },
  ]

  const adminMenuItems = [
    { href: "/dashboard/admin/users", label: "Manajemen Pengguna", icon: Users },
  ]

  const allMenuItems = profile.role === 'superadmin'
    ? [...menuItems, ...adminMenuItems]
    : menuItems

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <>
      {/* Tombol Menu Mobile */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-background border border-border rounded-lg"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed md:relative w-64 h-screen bg-background border-r border-border flex flex-col transition-transform duration-300 z-40 ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg overflow-hidden">
              <img src="/image.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-foreground">Klinik CV Cipta Mandiri</span>
              <span className="text-xs text-muted-foreground">{profile.clinic_name}</span>
            </div>
          </Link>
        </div>

        {/* Navigasi */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {allMenuItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link key={item.href} href={item.href}>
                <button
                  onClick={() => setIsOpen(false)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon size={20} />
                  {item.label}
                </button>
              </Link>
            )
          })}
        </nav>

        {/* Informasi Pengguna */}
        <div className="p-4 border-t border-border space-y-4">
          <div className="px-4 py-3 rounded-lg bg-muted">
            <p className="text-xs text-muted-foreground">Masuk sebagai</p>
            <p className="text-sm font-medium text-foreground truncate">
              {profile.first_name} {profile.last_name}
            </p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full justify-center gap-2 text-foreground border-border hover:bg-muted bg-transparent"
          >
            <LogOut size={18} />
            Keluar
          </Button>
        </div>
      </aside>

      {/* Overlay Mobile */}
      {isOpen && <div className="fixed inset-0 bg-black/50 md:hidden z-30" onClick={() => setIsOpen(false)} />}
    </>
  )
}
