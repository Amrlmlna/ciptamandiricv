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
      return Response.json({ success: false, message: "Missing authorization header" }, { status: 401 });
    }

    // Get the user from the session
    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return Response.json({ success: false, message: "Authentication failed" }, { status: 401 });
    }

    // Verify the user is a superadmin
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "superadmin") {
      return Response.json({ success: false, message: "Access denied. Only superadmins can invite users." }, { status: 403 });
    }

    adminId = user.id;

    const { email } = await request.json();

    if (!email) {
      return Response.json({ success: false, message: "Email is required" }, { status: 400 });
    }

    // Add email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return Response.json({ success: false, message: "Invalid email format" }, { status: 400 });
    }

    // Check if user already exists
    const { data: existingUser, error: existingUserError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .single();

    if (existingUser) {
      return Response.json({ success: false, message: "User with this email already exists." }, { status: 400 });
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
      return Response.json({ success: false, message: createUserError.message }, { status: 400 });
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
      return Response.json({ success: false, message: profileUpdateError.message }, { status: 400 });
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

    return Response.json({
      success: true,
      message: `Admin invited successfully. Send the following login information to ${email}: Email: ${email}, Password: ${tempPassword} (user should change after first login). Note: New users start as admin and can be promoted to superadmin later if needed.`
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

    return Response.json({ success: false, message: error.message || "Failed to invite user" }, { status: 500 });
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