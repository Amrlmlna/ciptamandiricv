import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Create Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // This needs to be set in your environment variables
);

export async function PUT(request: NextRequest) {
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
      return new Response(JSON.stringify({ success: false, message: "Access denied. Only superadmins can update user roles." }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    adminId = user.id;

    const { targetUserId, newRole } = await request.json();

    // Validate inputs
    if (!targetUserId || !newRole) {
      return new Response(JSON.stringify({ success: false, message: "Target user ID and new role are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Don't allow users to change their own role
    if (user.id === targetUserId) {
      return new Response(JSON.stringify({ success: false, message: "Cannot change your own role" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Validate role value
    if (!['admin', 'superadmin'].includes(newRole)) {
      return new Response(JSON.stringify({ success: false, message: "Invalid role value" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Get current role for audit logging
    const { data: targetUser, error: targetUserError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", targetUserId)
      .single();

    if (targetUserError) {
      return new Response(JSON.stringify({ success: false, message: "Error fetching target user for audit" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const previousRole = targetUser?.role || 'unknown';

    // Check if we're updating to superadmin and need to respect the limit
    if (newRole === 'superadmin') {
      // Check current count of superadmins
      const { count: superadminCount, error: countError } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "superadmin");

      if (countError) {
        return new Response(JSON.stringify({ success: false, message: "Failed to check superadmin limit" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }

      // If we're at the limit (2), and we're not doing a role transfer, automatically transfer roles
      if (superadminCount !== null && superadminCount >= 2 && previousRole !== 'superadmin') {
        // Automatically make the current superadmin an admin and promote the target user to superadmin
        const { error: transferError } = await supabase
          .from("profiles")
          .update({ role: "admin" })
          .eq("id", adminId); // adminId is the current user's ID (the superadmin)

        if (transferError) {
          return new Response(JSON.stringify({
            success: false,
            message: `Error transferring current superadmin role: ${transferError.message}`
          }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }

        // Update the target user to superadmin
        const { error: updateError, count } = await supabase
          .from("profiles")
          .update({ role: "superadmin" })
          .eq("id", targetUserId);

        if (updateError) {
          // If the target user update fails, try to revert the current user's role
          const { error: revertError } = await supabase
            .from("profiles")
            .update({ role: "superadmin" })
            .eq("id", adminId);

          if (revertError) {
            console.error("Error reverting user role after failed target update:", revertError);
          }

          return new Response(JSON.stringify({
            success: false,
            message: `Error updating target user role: ${updateError.message}`
          }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }

        // Log the role transfer in the audit log
        const { error: auditError } = await supabase
          .from("admin_audit_log")
          .insert({
            admin_user_id: adminId,
            action: "role_transfer",
            target_user_id: targetUserId,
            details: {
              previous_role: previousRole,
              new_role: "superadmin",
              transferred_from: adminId,
              transferred_to: targetUserId
            }
          });

        if (auditError) {
          console.error("Error logging audit action:", auditError);
        }

        return new Response(JSON.stringify({
          success: true,
          message: `Role transfer completed: You are now an Admin and user ${targetUserId} is now a Superadmin`
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // Perform the update
    const { error: updateError, count } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", targetUserId);

    if (updateError) {
      return new Response(JSON.stringify({ success: false, message: `Error updating user role: ${updateError.message}` }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (count === 0) {
      return new Response(JSON.stringify({ success: false, message: "No user profile found to update with ID: " + targetUserId }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Log the action in the audit log
    const { error: auditError } = await supabase
      .from("admin_audit_log")
      .insert({
        admin_user_id: adminId,
        action: "update_role",
        target_user_id: targetUserId,
        details: {
          previous_role: previousRole,
          new_role: newRole
        }
      });

    if (auditError) {
      console.error("Error logging audit action:", auditError);
      // We don't fail the entire operation if we can't log the audit, but we log the error
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Role updated successfully from ${previousRole} to ${newRole}`
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("Error in update role API:", error);
    return new Response(JSON.stringify({ success: false, message: error.message || "Failed to update role" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}