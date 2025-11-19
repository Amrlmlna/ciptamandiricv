import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Create Supabase client with anon key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return new Response(JSON.stringify({ success: false, message: "Valid email is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Send password reset email using Supabase auth
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${request.url.replace('/api/forgot-password', '')}/auth/callback`,
    });

    if (error) {
      console.error("Error sending password reset email:", error);
      // For security reasons, we don't reveal if the email exists or not
      return new Response(JSON.stringify({
        success: true,
        message: "If an account with this email exists, a password reset link has been sent."
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: "If an account with this email exists, a password reset link has been sent."
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("Error in forgot password API:", error);
    return new Response(JSON.stringify({ success: false, message: error.message || "Failed to send reset email" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}