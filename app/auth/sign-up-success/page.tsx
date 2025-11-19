"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function SignUpSuccessPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 md:p-6 bg-background">
      <div className="w-full max-w-md">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2 text-center mb-4">
            <div className="w-16 h-16 rounded-lg overflow-hidden mx-auto">
              <img src="/image.png" alt="Klinik CV Cipta Mandiri" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Klinik CV Cipta Mandiri</h1>
          </div>

          <Card className="border border-border">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="text-6xl">✓</div>
              </div>
              <CardTitle className="text-2xl text-foreground">Akun Berhasil Dibuat</CardTitle>
              <CardDescription className="text-base mt-2">Terima kasih telah mendaftar di Klinik CV Cipta Mandiri!</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
                <h3 className="font-semibold text-foreground text-sm">Langkah Selanjutnya</h3>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex gap-2">
                    <span>1.</span>
                    <span>Verifikasi alamat email Anda (periksa kotak masuk)</span>
                  </li>
                  <li className="flex gap-2">
                    <span>2.</span>
                    <span>Akun Anda akan ditinjau oleh tim admin kami</span>
                  </li>
                  <li className="flex gap-2">
                    <span>3.</span>
                    <span>Anda akan menerima konfirmasi setelah akun disetujui</span>
                  </li>
                </ul>
              </div>

              <p className="text-sm text-muted-foreground">
                Proses ini biasanya memakan waktu 24–48 jam. Kami akan mengirimkan email kepada Anda setelah akun siap
                digunakan.
              </p>

              <div className="pt-4 space-y-2">
                <Link href="/auth/login" className="block">
                  <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                    Kembali ke Halaman Masuk
                  </Button>
                </Link>
                <Link href="/" className="block">
                  <Button variant="outline" className="w-full border-border bg-transparent">
                    Kembali ke Beranda
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
