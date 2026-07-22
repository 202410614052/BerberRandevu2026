import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

type Appointment = {
  id: number | string;
  first_name: string | null;
  last_name: string | null;
  employee: string;
  appointment_date: string;
  appointment_time: string;
  customer_push_token: string;
  reminder_sent: boolean;
  status: string;
};

function jsonResponse(
  body: unknown,
  status = 200
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function getServiceAccount(): ServiceAccount {
  const serviceAccountJson = Deno.env.get(
    "FIREBASE_SERVICE_ACCOUNT_JSON"
  );

  if (serviceAccountJson) {
    const parsed = JSON.parse(serviceAccountJson);

    return {
      project_id: parsed.project_id,
      client_email: parsed.client_email,
      private_key: parsed.private_key,
    };
  }

  const projectId =
    Deno.env.get("FIREBASE_PROJECT_ID") ||
    "berberrandevu2026";

  const clientEmail = Deno.env.get(
    "FIREBASE_CLIENT_EMAIL"
  );

  const privateKey = Deno.env.get(
    "FIREBASE_PRIVATE_KEY"
  );

  if (!clientEmail || !privateKey) {
    throw new Error(
      "Firebase servis hesabı bilgileri eksik. " +
        "FIREBASE_SERVICE_ACCOUNT_JSON veya " +
        "FIREBASE_CLIENT_EMAIL ve FIREBASE_PRIVATE_KEY secretlarını kontrol edin."
    );
  }

  return {
    project_id: projectId,
    client_email: clientEmail,
    private_key: privateKey.replace(/\\n/g, "\n"),
  };
}

function base64UrlEncode(input: Uint8Array | string) {
  const bytes =
    typeof input === "string"
      ? new TextEncoder().encode(input)
      : input;

  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function pemToArrayBuffer(pem: string) {
  const cleanedPem = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");

  const binary = atob(cleanedPem);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

async function createGoogleAccessToken(
  serviceAccount: ServiceAccount
) {
  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const payload = {
    iss: serviceAccount.client_email,
    scope:
      "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const encodedHeader = base64UrlEncode(
    JSON.stringify(header)
  );

  const encodedPayload = base64UrlEncode(
    JSON.stringify(payload)
  );

  const unsignedToken =
    `${encodedHeader}.${encodedPayload}`;

  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(serviceAccount.private_key),
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    new TextEncoder().encode(unsignedToken)
  );

  const jwt =
    `${unsignedToken}.` +
    base64UrlEncode(new Uint8Array(signature));

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
        assertion: jwt,
      }),
    }
  );

  const tokenResult = await tokenResponse.json();

  if (!tokenResponse.ok || !tokenResult.access_token) {
    console.error(
      "Google erişim tokenı alınamadı:",
      tokenResult
    );

    throw new Error(
      tokenResult.error_description ||
        "Google erişim tokenı alınamadı."
    );
  }

  return tokenResult.access_token as string;
}

function createAppointmentDate(
  date: string,
  time: string
) {
  const normalizedTime =
    time.length === 5 ? `${time}:00` : time;

  /*
    Türkiye yıl boyunca UTC+03:00 kullanır.
    Veritabanındaki tarih ve saat salonun yerel saatidir.
  */
  return new Date(
    `${date}T${normalizedTime}+03:00`
  );
}

function getRemainingMinutes(
  appointment: Appointment
) {
  const appointmentDate = createAppointmentDate(
    appointment.appointment_date,
    appointment.appointment_time
  );

  return (
    appointmentDate.getTime() - Date.now()
  ) / 60000;
}

function getDayText(
  appointmentDate: string
) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  if (appointmentDate === today) {
    return "bugün";
  }

  const formattedDate = new Intl.DateTimeFormat(
    "tr-TR",
    {
      timeZone: "Europe/Istanbul",
      day: "numeric",
      month: "long",
    }
  ).format(
    new Date(`${appointmentDate}T12:00:00+03:00`)
  );

  return formattedDate;
}

async function sendFirebaseNotification(
  accessToken: string,
  serviceAccount: ServiceAccount,
  appointment: Appointment
) {
  const dayText = getDayText(
    appointment.appointment_date
  );

  const timeText =
    appointment.appointment_time.slice(0, 5);

  const body =
    `Randevunuz ${dayText} saat ${timeText}'da ` +
    `${appointment.employee} iledir. ` +
    "Lütfen randevu saatinizde salonda olun.";

  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token: appointment.customer_push_token,

          notification: {
            title:
              "Yaşar Gökçeev Hair Designer",
            body,
          },

          webpush: {
            headers: {
              Urgency: "high",
            },

            notification: {
              title:
                "Yaşar Gökçeev Hair Designer",
              body,
              icon: "/logo192.png",
              badge: "/logo192.png",
            },

            fcm_options: {
              link:
                "https://berber-randevu2026.vercel.app/",
            },
          },

          data: {
            type: "customer_reminder",
            appointment_id: String(
              appointment.id
            ),
            appointment_date:
              appointment.appointment_date,
            appointment_time: timeText,
            employee: appointment.employee,
          },
        },
      }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    console.error(
      "Firebase bildirim hatası:",
      result
    );

    throw new Error(
      result?.error?.message ||
        "Firebase bildirimi gönderilemedi."
    );
  }

  return result;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (request.method !== "POST") {
    return jsonResponse(
      {
        success: false,
        message:
          "Sadece POST isteği kabul edilir.",
      },
      405
    );
  }

  try {
    const supabaseUrl = Deno.env.get(
      "SUPABASE_URL"
    );

    const serviceRoleKey = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY"
    );

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        "Supabase ortam değişkenleri bulunamadı."
      );
    }

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey
    );

    let requestBody: {
      appointment_id?: number | string;
    } = {};

    try {
      requestBody = await request.json();
    } catch {
      requestBody = {};
    }

    let query = supabase
      .from("appointments")
      .select(
        `
          id,
          first_name,
          last_name,
          employee,
          appointment_date,
          appointment_time,
          customer_push_token,
          reminder_sent,
          status
        `
      )
      .eq("status", "active")
      .eq("reminder_sent", false)
      .not("customer_push_token", "is", null);

    if (requestBody.appointment_id) {
      query = query.eq(
        "id",
        requestBody.appointment_id
      );
    }

    const {
      data: appointments,
      error: appointmentsError,
    } = await query;

    if (appointmentsError) {
      throw appointmentsError;
    }

    if (!appointments?.length) {
      return jsonResponse({
        success: true,
        checked: 0,
        sent: 0,
        message:
          "Bildirim gönderilecek randevu bulunamadı.",
      });
    }

    const dueAppointments = (
      appointments as Appointment[]
    ).filter((appointment) => {
      const remainingMinutes =
        getRemainingMinutes(appointment);

      /*
        1–60 dakika arasındaysa gönderilir.
        Süresi geçmiş randevuya gönderilmez.
        60 dakikadan fazla varsa Cron'u bekler.
      */
      return (
        remainingMinutes > 0 &&
        remainingMinutes <= 60
      );
    });

    if (!dueAppointments.length) {
      return jsonResponse({
        success: true,
        checked: appointments.length,
        sent: 0,
        message:
          "Henüz bildirim zamanı gelen randevu yok.",
      });
    }

    const serviceAccount =
      getServiceAccount();

    const accessToken =
      await createGoogleAccessToken(
        serviceAccount
      );

    const results = [];

    for (const appointment of dueAppointments) {
      try {
        const firebaseResult =
          await sendFirebaseNotification(
            accessToken,
            serviceAccount,
            appointment
          );

        const { error: updateError } =
          await supabase
            .from("appointments")
            .update({
              reminder_sent: true,
              reminder_sent_at:
                new Date().toISOString(),
            })
            .eq("id", appointment.id)
            .eq("reminder_sent", false);

        if (updateError) {
          throw updateError;
        }

        results.push({
          appointment_id: appointment.id,
          success: true,
          firebase_message:
            firebaseResult.name,
        });
      } catch (error) {
        console.error(
          `Randevu ${appointment.id} bildirim hatası:`,
          error
        );

        results.push({
          appointment_id: appointment.id,
          success: false,
          error:
            error instanceof Error
              ? error.message
              : String(error),
        });
      }
    }

    const sentCount = results.filter(
      (result) => result.success
    ).length;

    return jsonResponse({
      success: true,
      checked: appointments.length,
      due: dueAppointments.length,
      sent: sentCount,
      results,
    });
  } catch (error) {
    console.error(
      "Müşteri hatırlatma fonksiyonu hatası:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      500
    );
  }
});