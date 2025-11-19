import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Create Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // This needs to be set in your environment variables
);

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  let adminId: string | null = null;

  try {
    const { userId: userIdFromParams } = await params;

    // Check for userId in URL params first (for dynamic routes)
    let userId = userIdFromParams;

    // If not found in params, try to get it from request body as fallback (for compatibility)
    if (!userId) {
      try {
        const body = await request.json();
        userId = body.userId;
      } catch (e) {
        // If parsing JSON fails, try to get from URL path in different way
        const url = new URL(request.url);
        const pathParts = url.pathname.split('/');
        userId = pathParts[pathParts.length - 1]; // Get last part of URL path
      }
    }

    // Validate the userId parameter
    if (!userId) {
      console.log("Debug - Request URL:", request.url);
      console.log("Debug - Params object:", params);
      console.log("Debug - URL pathname:", new URL(request.url).pathname);
      
      return new Response(JSON.stringify({ success: false, message: "User ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

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
      return new Response(JSON.stringify({ success: false, message: "Access denied. Only superadmins can delete users." }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    adminId = user.id;

    // Check if trying to delete self
    if (user.id === userId) {
      return new Response(JSON.stringify({ success: false, message: "Cannot delete your own account." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Validate that userId is a proper UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return new Response(JSON.stringify({ success: false, message: "Invalid user ID format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Check if the user being deleted is a superadmin (server-side validation)
    const { data: targetUser, error: targetUserError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (targetUserError) {
      return new Response(JSON.stringify({ success: false, message: "Error fetching user to delete" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (targetUser && targetUser.role === "superadmin") {
      return new Response(JSON.stringify({ success: false, message: "Cannot delete a superadmin account." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Perform atomic deletion: delete both profile and auth user in sequence
    // Start with the profile deletion
    const { error: profileDeleteError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profileDeleteError) {
      // If profile deletion fails, attempt to restore and return error
      return new Response(JSON.stringify({ success: false, message: `Error deleting user profile: ${profileDeleteError.message}` }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Now delete the auth user
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      // If auth deletion fails after profile was deleted, this creates inconsistency
      // In a real-world scenario, you'd want to implement a restoration mechanism
      console.error(`Auth deletion failed after profile deletion for user ${userId}. Manual cleanup required.`);
      return new Response(JSON.stringify({
        success: false,
        message: `Auth deletion failed: ${authDeleteError.message}. Profile was deleted. Please contact support for cleanup.`
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Log the action in the audit log
    const { error: auditError } = await supabase
      .from("admin_audit_log")
      .insert({
        admin_user_id: adminId,
        action: "delete_user",
        target_user_id: userId,
        details: {
          deleted_by: adminId
        }
      });

    if (auditError) {
      console.error("Error logging audit action:", auditError);
      // We don't fail the entire operation if we can't log the audit, but we log the error
    }

    return new Response(JSON.stringify({
      success: true,
      message: "User deleted successfully"
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("Error in delete user API:", error);
    return new Response(JSON.stringify({ success: false, message: error.message || "Failed to delete user" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}