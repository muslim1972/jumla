import { createClient } from "@supabase/supabase-js"

const APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
const REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

export async function sendNotificationToUser(userId: string, title: string, message: string) {
  if (!APP_ID || !REST_API_KEY) {
    console.error("Missing OneSignal environment variables");
    return { success: false, error: "Missing API keys" };
  }

  try {
    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": `Basic ${REST_API_KEY}`
      },
      body: JSON.stringify({
        app_id: APP_ID,
        include_aliases: {
          external_id: [userId]
        },
        target_channel: "push",
        headings: { "en": title, "ar": title },
        contents: { "en": message, "ar": message },
      })
    });

    const data = await response.json();
    return { success: response.ok, data };
  } catch (error) {
    console.error("Error sending OneSignal notification:", error);
    return { success: false, error };
  }
}

export async function sendNotificationToRole(role: string, title: string, message: string) {
  // للوصول إلى كل المستخدمين الذين لديهم هذا الـ role، نحتاج إلى مفتاح Service Role
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) return { success: false, error: "No service key" };

  try {
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: profiles } = await adminClient
      .from('profiles')
      .select('id')
      .eq('role', role);

    if (!profiles || profiles.length === 0) return { success: true, message: "No users found" };

    const userIds = profiles.map(p => p.id);

    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": `Basic ${REST_API_KEY}`
      },
      body: JSON.stringify({
        app_id: APP_ID,
        include_aliases: {
          external_id: userIds
        },
        target_channel: "push",
        headings: { "en": title, "ar": title },
        contents: { "en": message, "ar": message },
      })
    });

    return { success: response.ok, data: await response.json() };
  } catch (error) {
    return { success: false, error };
  }
}
