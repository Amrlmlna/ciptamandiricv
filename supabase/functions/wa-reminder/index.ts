import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async () => {
  const supabase = createClient(
    Deno.env.get("https://calzfqlrwywgihwwacog.supabase.co")!,
    Deno.env.get("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhbHpmcWxyd3l3Z2lod3dhY29nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM4MjYwNiwiZXhwIjoyMDc3OTU4NjA2fQ.4P-sz10wbSN_SirLo2-kc-dy3_PwINBsIYjcdh3tLg4")!
  );

  const now = new Date();
  const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Ambil semua appointment < 24 jam lagi & belum dikirim reminder
  const { data: appointments, error } = await supabase
    .from("appointments")
    .select(`
      id,
      appointment_date,
      clinic_id,
      profiles:clinic_id(phone, first_name, last_name)
    `)
    .eq("is_reminded", false)
    .lte("appointment_date", next24Hours.toISOString())
    .gte("appointment_date", now.toISOString());

  if (error) {
    console.error("Error fetching appointments:", error);
    return new Response("Error fetching appointments", { status: 500 });
  }

  if (!appointments || appointments.length === 0) {
    return new Response("No reminders to send.", { status: 200 });
  }

  for (const a of appointments) {
    const phone = a.profiles?.phone;
    if (!phone) continue;

    const tanggal = new Date(a.appointment_date).toLocaleString("id-ID", {
      timeZone: "Asia/Makassar",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const msg = `Halo ${a.profiles.first_name || "Dokter"}, ini pengingat bahwa Anda memiliki jadwal janji temu pada ${tanggal}.`;

    // Kirim pesan via Fonnte
    await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        "Authorization": Deno.env.get("pkqX96NMotshaxBa2X2r")!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        target: phone,
        message: msg,
      }),
    });

    // Tandai sudah dikirim agar tidak dikirim dua kali
    await supabase
      .from("appointments")
      .update({ is_reminded: true })
      .eq("id", a.id);
  }

  return new Response("24-hour reminders sent successfully!", { status: 200 });
});
