import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <main className="w-full min-h-screen bg-gradient-to-br from-background via-background to-slate-50 dark:to-slate-950">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-12 h-12 rounded-lg overflow-hidden">
              <img src="/image.png" alt="CV Cipta Mandiri" className="w-full h-full object-contain" />
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/auth/login">
              <Button variant="ghost" className="text-foreground">
                Masuk
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-20 md:py-32">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl md:text-6xl font-bold text-foreground leading-tight">Klinik CV Cipta Mandiri</h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Pusat kesehatan profesional yang berkomitmen untuk memberikan layanan medis terbaik bagi masyarakat. 
                Tempat di mana kesehatan Anda menjadi prioritas utama kami.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" variant="outline" className="w-full sm:w-auto bg-transparent">
                Temukan Layanan Kami
              </Button>
            </div>
            <div className="pt-8 space-y-3">
              <p className="text-sm text-muted-foreground font-medium">MENJAGA KESEHATAN MASYARAKAT</p>
              <div className="flex items-center gap-8">
                <div className="text-sm text-muted-foreground">Lebih dari 5.000 Pasien Terlayani</div>
                <div className="text-sm text-muted-foreground">20+ Tahun Pengalaman</div>
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center justify-center">
            <div className="w-full aspect-square bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-border flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <div className="text-6xl mb-2">🏥</div>
                <p>Tentang Klinik Kami</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-6 py-20 md:py-32">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Layanan Kesehatan Terbaik</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Kami menawarkan berbagai layanan kesehatan profesional dengan standar medis tertinggi.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: "🩺",
              title: "Pemeriksaan Umum",
              description: "Layanan pemeriksaan kesehatan menyeluruh oleh tenaga medis profesional.",
            },
            {
              icon: "💉",
              title: "Imunisasi",
              description: "Program imunisasi untuk semua usia dengan vaksin berkualitas.",
            },
            {
              icon: "📋",
              title: "Pendaftaran Online",
              description: "Mudah dan cepat, daftar janji temu kapan saja tanpa antre.",
            },
            {
              icon: "💊",
              title: "Farmasi",
              description: "Layanan resep dan obat dengan kualitas terjamin dan harga terjangkau.",
            },
            {
              icon: "📞",
              title: "Konsultasi",
              description: "Konsultasi kesehatan dengan dokter spesialis dan tenaga kesehatan terlatih.",
            },
            {
              icon: "📋",
              title: "Pemeriksaan Laboratorium",
              description: "Pemeriksaan laboratorium lengkap dengan hasil yang akurat.",
            },
          ].map((feature, i) => (
            <Card key={i} className="border border-border hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="text-4xl mb-4">{feature.icon}</div>
                <CardTitle className="text-foreground">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-6 py-20 md:py-32">
        <div className="bg-primary/5 border border-border rounded-2xl p-12 md:p-20 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">Mulai Perjalanan Kesehatan Anda</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Jangan menunda kesehatan Anda. Jadwalkan pemeriksaan atau konsultasi dengan dokter kami hari ini.
          </p>
          <p className="text-sm text-muted-foreground">Silakan hubungi administrator untuk mendapatkan akses ke sistem.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border mt-20 md:mt-32">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-foreground mb-4">Klinik CV Cipta Mandiri</h3>
              <p className="text-sm text-muted-foreground">Memberikan pelayanan kesehatan terbaik sejak tahun 2005.</p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4 text-sm">Layanan</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground transition">
                    Pemeriksaan Umum
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition">
                    Imunisasi
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition">
                    Konsultasi Dokter
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4 text-sm">Tentang Kami</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground transition">
                    Profil Klinik
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition">
                    Tim Medis
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition">
                    Kontak
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4 text-sm">Lokasi</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground transition">
                    Alamat Klinik
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition">
                    Jam Operasional
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">© 2025 Klinik CV Cipta Mandiri. Hak cipta dilindungi.</p>
            <div className="flex gap-6">
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition">
                Telepon: (021) 12345678
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition">
                Email: info@klinikciptamandiri.id
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition">
                WhatsApp: 0812-3456-7890
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
