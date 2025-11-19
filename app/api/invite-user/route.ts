import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Create Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // This needs to be set in your environment variables
);

export async function POST(request: NextRequest) {
  let invitedUserId: string | null = null;
  let adminId: string | null = null;

  try {
    // Get the session from the request headers to verify the user is authenticated
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, message: "Missing authorization header" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Get the user from the session
    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, message: "Authentication failed" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Verify the user is a superadmin
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "superadmin") {
      return new Response(JSON.stringify({ success: false, message: "Access denied. Only superadmins can invite users." }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    adminId = user.id;

    const { email } = await request.json();

    if (!email) {
      return new Response(JSON.stringify({ success: false, message: "Email is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Add email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ success: false, message: "Invalid email format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Check if user already exists
    const { data: existingUser, error: existingUserError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .single();

    if (existingUser) {
      return new Response(JSON.stringify({ success: false, message: "User with this email already exists." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Generate a temporary password
    const tempPassword = generateTempPassword();

    // Create a new user with Supabase Auth
    const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
      email: email,
      password: tempPassword,
      email_confirm: true, // Auto-confirm email for invited users
    });

    if (createUserError) {
      return new Response(JSON.stringify({ success: false, message: createUserError.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    invitedUserId = newUser.user.id;

    // Update the profile for the new user with role and approved status
    const { error: profileUpdateError } = await supabase
      .from("profiles")
      .upsert({
        id: newUser.user.id,
        email: email,
        role: "admin", // Always invite as admin, never as superadmin
        approved: true, // Invited users are automatically approved
        invited_by: adminId
      });

    if (profileUpdateError) {
      return new Response(JSON.stringify({ success: false, message: profileUpdateError.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Log the action in the audit log
    const { error: auditError } = await supabase
      .from("admin_audit_log")
      .insert({
        admin_user_id: adminId,
        action: "invite_user",
        target_user_id: invitedUserId,
        details: {
          email: email,
          role: "admin",
          invited_by: adminId
        }
      });

    if (auditError) {
      console.error("Error logging audit action:", auditError);
      // We don't fail the entire operation if we can't log the audit, but we log the error
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Admin invited successfully. Send the following login information to ${email}: Email: ${email}, Password: ${tempPassword} (user should change after first login). Note: New users start as admin and can be promoted to superadmin later if needed.)`
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("Error in invite user API:", error);

    // If we failed during the process and have user data that needs cleanup, handle it
    if (invitedUserId) {
      try {
        // Attempt to clean up the user we just created
        await supabase.auth.admin.deleteUser(invitedUserId);
      } catch (cleanupError) {
        console.error("Failed to clean up user after error:", cleanupError);
      }
    }

    return new Response(JSON.stringify({ success: false, message: error.message || "Failed to invite user" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

function generateTempPassword(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}