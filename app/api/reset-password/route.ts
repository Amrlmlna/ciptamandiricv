import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Create Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // This needs to be set in your environment variables
);

export async function POST(request: NextRequest) {
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

    // Verify the user is a superadmin or admin
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || (profile.role !== "admin" && profile.role !== "superadmin")) {
      return new Response(JSON.stringify({ success: false, message: "Access denied. Only admins can reset passwords." }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    let { targetUserId, newPassword } = await request.json();

    // Validate inputs
    if (!targetUserId) {
      return new Response(JSON.stringify({ success: false, message: "Target user ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Don't allow users to reset their own password through this method
    if (user.id === targetUserId) {
      return new Response(JSON.stringify({
        success: false,
        message: "Cannot reset your own password through admin panel. Use the normal password change flow."
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Validate new password (optional - you can adjust these requirements)
    if (newPassword) {
      if (newPassword.length < 8) {
        return new Response(JSON.stringify({
          success: false,
          message: "New password must be at least 8 characters long"
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
    } else {
      // Generate a temporary password if none is provided
      const tempPassword = generateTempPassword();
      newPassword = tempPassword;
    }

    // Verify the target user exists in profiles table
    const { data: targetUser, error: targetUserError } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("id", targetUserId)
      .single();

    if (targetUserError || !targetUser) {
      return new Response(JSON.stringify({ success: false, message: "Target user not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Update the user's password using Supabase admin API
    const { error: updatePasswordError } = await supabase.auth.admin.updateUserById(targetUserId, {
      password: newPassword,
    });

    if (updatePasswordError) {
      console.error("Error updating user password:", updatePasswordError);
      return new Response(JSON.stringify({
        success: false,
        message: `Error updating password: ${updatePasswordError.message}`
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Log the action in the audit log
    const { error: auditError } = await supabase
      .from("admin_audit_log")
      .insert({
        admin_user_id: user.id,
        action: "reset_password",
        target_user_id: targetUserId,
        details: {
          action_performed_by: user.id,
          reset_by: profile.role
        }
      });

    if (auditError) {
      console.error("Error logging audit action:", auditError);
      // We don't fail the entire operation if we can't log the audit, but we log the error
    }

    // Return success response with the new password if it was auto-generated
    return new Response(JSON.stringify({
      success: true,
      message: "Password reset successfully",
      generatedPassword: newPassword,
      requiresPasswordChange: true
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("Error in reset password API:", error);
    return new Response(JSON.stringify({ success: false, message: error.message || "Failed to reset password" }), {
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