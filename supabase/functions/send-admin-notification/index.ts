import { createClient } from "npm:@supabase/supabase-js@2";
import { importPKCS8, SignJWT } from "npm:jose@5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

function getRequiredSecret(name: string): string {
  const value = Deno.env.get(name);

  if (!value) {
    throw new Error(`${name} ayarı bulunamadı.`);
  }

  return value;
}

async function getGoogleAccessToken() {
  const clientEmail = getRequiredSecret("FIREBASE_CLIENT_EMAIL");

  const privateKeyText = getRequiredSecret("FIREBASE_PRIVATE_KEY").replace(
    /\\n/g,
    "\n"
  );

  const privateKey = await importPKCS8(privateKeyText, "RS256");

  const now = Math.floor(Date.now() / 1000);

  const assertion = await new SignJWT({
    scope: "https://www.googleapis.com/auth/firebase.messaging",
  })
    .setProtectedHeader({
      alg: "RS256",
      typ: "JWT",
    })
    .setIssuer(clientEmail)
    .setSubject(clientEmail)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);

  const tokenResponse = await fetch(
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type:
          "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    }
  );

  const tokenData = await tokenResponse.json();

  if (!tokenResponse.ok || !tokenData.access_token) {
    console.error("Google erişim anahtarı hatası:", tokenData);

    throw new Error(
      tokenData.error_description ||
        "Google erişim anahtarı alınamadı."
    );
  }

  return tokenData.access_token as string;
}

async function sendFirebaseNotification(
  token: string,
  accessToken: string,
  title: string,
  body: string
) {
  const projectId = getRequiredSecret("FIREBASE_PROJECT_ID");

  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token,
          notification: {
            title,
            body,
          },
          webpush: {
            notification: {
              title,
              body,
              icon: "/favicon.ico",
              badge: "/favicon.ico",
            },
            fcm_options: {
              link: "https://berber-randevu2026.vercel.app/admin",
            },
          },
          data: {
            page: "/admin",
          },
        },
      }),
    }
  );

  const responseData = await response.json();

  return {
    success: response.ok,
    status: response.status,
    data: responseData,
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({
          error: "Sadece POST isteği kullanılabilir.",
        }),
        {
          status: 405,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const expectedWebhookSecret = getRequiredSecret(
      "NOTIFICATION_WEBHOOK_SECRET"
    );

    const receivedWebhookSecret = request.headers.get(
      "x-webhook-secret"
    );

    if (
      !receivedWebhookSecret ||
      receivedWebhookSecret !== expectedWebhookSecret
    ) {
      return new Response(
        JSON.stringify({
          error: "Yetkisiz istek.",
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const payload = await request.json();

    const appointment = payload.record || payload.appointment || {};

    const customerName =
      `${appointment.first_name || ""} ${appointment.last_name || ""}`.trim() ||
      "Yeni müşteri";

    const appointmentDate =
      appointment.appointment_date || "Tarih belirtilmedi";

    const appointmentTime = appointment.appointment_time
      ? String(appointment.appointment_time).slice(0, 5)
      : "Saat belirtilmedi";

    const employee =
      appointment.employee || "Çalışan belirtilmedi";

    const notificationTitle =
      payload.title || "Yeni Randevu Oluşturuldu";

    const notificationBody =
      payload.body ||
      `${customerName} — ${appointmentDate} ${appointmentTime} — ${employee}`;

    const supabaseUrl = getRequiredSecret("SUPABASE_URL");

    const supabaseServiceRoleKey = getRequiredSecret(
      "SUPABASE_SERVICE_ROLE_KEY"
    );

    const supabase = createClient(
      supabaseUrl,
      supabaseServiceRoleKey
    );

    const { data: tokenRows, error: tokenError } = await supabase
      .from("admin_push_tokens")
      .select("id, token");

    if (tokenError) {
      throw new Error(
        `Cihaz tokenları alınamadı: ${tokenError.message}`
      );
    }

    if (!tokenRows || tokenRows.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Kayıtlı yönetici cihazı bulunamadı.",
          sent: 0,
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const accessToken = await getGoogleAccessToken();

    const results = await Promise.all(
      tokenRows.map(async (tokenRow) => {
        try {
          const result = await sendFirebaseNotification(
            tokenRow.token,
            accessToken,
            notificationTitle,
            notificationBody
          );

          return {
            tokenId: tokenRow.id,
            ...result,
          };
        } catch (error) {
          return {
            tokenId: tokenRow.id,
            success: false,
            error:
              error instanceof Error
                ? error.message
                : "Bilinmeyen gönderim hatası",
          };
        }
      })
    );

    const successfulCount = results.filter(
      (result) => result.success
    ).length;

    const failedCount = results.length - successfulCount;

    return new Response(
      JSON.stringify({
        success: successfulCount > 0,
        sent: successfulCount,
        failed: failedCount,
        results,
      }),
      {
        status: successfulCount > 0 ? 200 : 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Bildirim fonksiyonu hatası:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Bilinmeyen sunucu hatası",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});