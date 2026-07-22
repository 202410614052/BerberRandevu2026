import { createClient } from "npm:@supabase/supabase-js@2";
import { importPKCS8, SignJWT } from "npm:jose@5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function getRequiredSecret(name: string): string {
  const value = Deno.env.get(name);

  if (!value) {
    throw new Error(`${name} ayarı bulunamadı.`);
  }

  return value;
}

async function getGoogleAccessToken(): Promise<string> {
  console.log("Google erişim anahtarı oluşturuluyor...");

  const clientEmail = getRequiredSecret(
    "FIREBASE_CLIENT_EMAIL"
  );

  const privateKeyText = getRequiredSecret(
    "FIREBASE_PRIVATE_KEY"
  ).replace(/\\n/g, "\n");

  const privateKey = await importPKCS8(
    privateKeyText,
    "RS256"
  );

  const now = Math.floor(Date.now() / 1000);

  const assertion = await new SignJWT({
    scope:
      "https://www.googleapis.com/auth/firebase.messaging",
  })
    .setProtectedHeader({
      alg: "RS256",
      typ: "JWT",
    })
    .setIssuer(clientEmail)
    .setSubject(clientEmail)
    .setAudience(
      "https://oauth2.googleapis.com/token"
    )
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);

  const tokenResponse = await fetch(
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type:
          "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    }
  );

  const tokenData = await tokenResponse.json();

  console.log(
    "Google token durum kodu:",
    tokenResponse.status
  );

  if (
    !tokenResponse.ok ||
    !tokenData.access_token
  ) {
    console.error(
      "Google erişim anahtarı hatası:",
      JSON.stringify(tokenData)
    );

    throw new Error(
      tokenData.error_description ||
        tokenData.error ||
        "Google erişim anahtarı alınamadı."
    );
  }

  console.log(
    "Google erişim anahtarı başarıyla alındı."
  );

  return tokenData.access_token as string;
}

async function sendFirebaseNotification(
  token: string,
  accessToken: string,
  title: string,
  body: string
) {
  const projectId = getRequiredSecret(
    "FIREBASE_PROJECT_ID"
  );

  const firebaseUrl =
    `https://fcm.googleapis.com/v1/projects/` +
    `${projectId}/messages:send`;

  const message = {
    message: {
      token,

      notification: {
        title,
        body,
      },

      data: {
        page: "/admin",
        click_action:
          "https://berber-randevu2026.vercel.app/admin",
      },

      webpush: {
        headers: {
          Urgency: "high",
          TTL: "86400",
        },

        notification: {
          title,
          body,
          icon:
            "https://berber-randevu2026.vercel.app/favicon.ico",
          badge:
            "https://berber-randevu2026.vercel.app/favicon.ico",
          tag: `appointment-${Date.now()}`,
          renotify: true,
          requireInteraction: false,
        },

        fcm_options: {
          link:
            "https://berber-randevu2026.vercel.app/admin",
        },
      },
    },
  };

  console.log(
    "Firebase mesajı gönderiliyor. Token başlangıcı:",
    token.slice(0, 20)
  );

  const response = await fetch(firebaseUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });

  const responseText = await response.text();

  let responseData: unknown;

  try {
    responseData = JSON.parse(responseText);
  } catch {
    responseData = responseText;
  }

  console.log(
    "Firebase cevap durum kodu:",
    response.status
  );

  console.log(
    "Firebase cevap içeriği:",
    JSON.stringify(responseData)
  );

  return {
    success: response.ok,
    status: response.status,
    data: responseData,
  };
}

function isInvalidFirebaseToken(
  result: {
    status?: number;
    data?: any;
  }
): boolean {
  const errorText = JSON.stringify(
    result.data ?? {}
  ).toUpperCase();

  return (
    result.status === 404 ||
    errorText.includes("UNREGISTERED") ||
    errorText.includes(
      "REGISTRATION-TOKEN-NOT-REGISTERED"
    ) ||
    errorText.includes(
      "INVALID REGISTRATION TOKEN"
    )
  );
}

Deno.serve(async (request) => {
  console.log(
    "Yeni istek geldi:",
    request.method,
    new Date().toISOString()
  );

  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (request.method !== "POST") {
    console.error(
      "Geçersiz HTTP yöntemi:",
      request.method
    );

    return jsonResponse(
      {
        success: false,
        error:
          "Sadece POST isteği kullanılabilir.",
      },
      405
    );
  }

  try {
    const expectedWebhookSecret =
      getRequiredSecret(
        "NOTIFICATION_WEBHOOK_SECRET"
      );

    const receivedWebhookSecret =
      request.headers.get(
        "x-webhook-secret"
      );

    if (!receivedWebhookSecret) {
      console.error(
        "Webhook isteğinde x-webhook-secret başlığı bulunamadı."
      );

      return jsonResponse(
        {
          success: false,
          error:
            "x-webhook-secret başlığı bulunamadı.",
        },
        401
      );
    }

    if (
      receivedWebhookSecret !==
      expectedWebhookSecret
    ) {
      console.error(
        "Webhook secret değeri yanlış."
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Webhook secret değeri yanlış.",
        },
        401
      );
    }

    console.log(
      "Webhook secret doğrulandı."
    );

    const payload = await request.json();

    console.log(
      "Gelen webhook verisi:",
      JSON.stringify(payload)
    );

    const appointment =
      payload.record ||
      payload.appointment ||
      {};

    const customerName =
      `${appointment.first_name || ""} ${
        appointment.last_name || ""
      }`.trim() || "Yeni müşteri";

    const appointmentDate =
      appointment.appointment_date ||
      "Tarih belirtilmedi";

    const appointmentTime =
      appointment.appointment_time
        ? String(
            appointment.appointment_time
          ).slice(0, 5)
        : "Saat belirtilmedi";

    const employee =
      appointment.employee ||
      "Çalışan belirtilmedi";

    const notificationTitle =
      payload.title ||
      "Yeni Randevu Oluşturuldu";

    const notificationBody =
      payload.body ||
      `${customerName} — ${appointmentDate} ` +
        `${appointmentTime} — ${employee}`;

    const supabaseUrl =
      getRequiredSecret("SUPABASE_URL");

    const supabaseServiceRoleKey =
      getRequiredSecret(
        "SUPABASE_SERVICE_ROLE_KEY"
      );

    const supabase = createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const {
      data: tokenRows,
      error: tokenError,
    } = await supabase
      .from("admin_push_tokens")
      .select("id, token, device_name");

    if (tokenError) {
      console.error(
        "Token tablosu okunamadı:",
        tokenError
      );

      throw new Error(
        `Cihaz tokenları alınamadı: ${tokenError.message}`
      );
    }

    console.log(
      "Kayıtlı yönetici cihazı sayısı:",
      tokenRows?.length ?? 0
    );

    if (
      !tokenRows ||
      tokenRows.length === 0
    ) {
      return jsonResponse({
        success: true,
        message:
          "Kayıtlı yönetici cihazı bulunamadı.",
        sent: 0,
      });
    }

    const accessToken =
      await getGoogleAccessToken();

    const results = [];

    for (const tokenRow of tokenRows) {
      try {
        console.log(
          "Cihaz işleniyor:",
          tokenRow.id,
          tokenRow.device_name
        );

        const result =
          await sendFirebaseNotification(
            tokenRow.token,
            accessToken,
            notificationTitle,
            notificationBody
          );

        results.push({
          tokenId: tokenRow.id,
          deviceName:
            tokenRow.device_name,
          ...result,
        });

        if (
          !result.success &&
          isInvalidFirebaseToken(result)
        ) {
          console.log(
            "Geçersiz token siliniyor:",
            tokenRow.id
          );

          const { error: deleteError } =
            await supabase
              .from("admin_push_tokens")
              .delete()
              .eq("id", tokenRow.id);

          if (deleteError) {
            console.error(
              "Geçersiz token silinemedi:",
              deleteError
            );
          }
        }
      } catch (error) {
        console.error(
          "Cihaz bildirimi gönderilemedi:",
          tokenRow.id,
          error
        );

        results.push({
          tokenId: tokenRow.id,
          deviceName:
            tokenRow.device_name,
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Bilinmeyen gönderim hatası",
        });
      }
    }

    const successfulCount =
      results.filter(
        (result) => result.success
      ).length;

    const failedCount =
      results.length -
      successfulCount;

    console.log(
      "Bildirim işlemi tamamlandı.",
      {
        successfulCount,
        failedCount,
      }
    );

    return jsonResponse(
      {
        success:
          successfulCount > 0,
        sent: successfulCount,
        failed: failedCount,
        results,
      },
      successfulCount > 0 ? 200 : 500
    );
  } catch (error) {
    console.error(
      "Bildirim fonksiyonu hatası:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Bilinmeyen sunucu hatası",
      },
      500
    );
  }
});