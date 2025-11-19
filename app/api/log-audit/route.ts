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
      return Response.json({ success: false, message: "Missing authorization header" }, { status: 401 });
    }

    // Get the user from the session
    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return Response.json({ success: false, message: "Authentication failed" }, { status: 401 });
    }

    // Verify the user is an admin or superadmin
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || (profile.role !== "admin" && profile.role !== "superadmin")) {
      return Response.json({ success: false, message: "Access denied. Only admins can log audit actions." }, { status: 403 });
    }

    const { action, target_user_id, previous_role, new_role } = await request.json();

    if (!action || !target_user_id) {
      return Response.json({ success: false, message: "Action and target_user_id are required" }, { status: 400 });
    }

    // Log the action in the audit log
    const { error: auditError } = await supabase
      .from("admin_audit_log")
      .insert({
        admin_user_id: user.id,
        action: action,
        target_user_id: target_user_id,
        previous_role: previous_role,
        new_role: new_role,
        details: { 
          changed_by: user.id
        }
      });

    if (auditError) {
      console.error("Error logging audit action:", auditError);
      return Response.json({ success: false, message: "Failed to log audit action" }, { status: 500 });
    }

    return Response.json({
      success: true,
      message: "Audit log entry created successfully"
    });

  } catch (error: any) {
    console.error("Error in log audit API:", error);
    return Response.json({ success: false, message: error.message || "Failed to log audit action" }, { status: 500 });
  }
}