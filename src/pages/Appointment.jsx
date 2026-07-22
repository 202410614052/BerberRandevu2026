import { useState } from "react";

import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";

import Calendar from "../components/calendar/Calendar";
import TimeSlots from "../components/calendar/TimeSlots";

import { supabase } from "../services/supabase";
import { requestNotificationToken } from "../services/firebase";

import "../styles/appointment.css";

function Appointment() {
  const [step, setStep] = useState(1);

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    service: "",
    employee: "",
  });

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  };

  const handleFormSubmit = (event) => {
    event.preventDefault();

    if (
      !formData.firstName.trim() ||
      !formData.lastName.trim() ||
      !formData.phone.trim() ||
      !formData.service.trim() ||
      !formData.employee
    ) {
      alert("Lütfen tüm alanları doldurun.");
      return;
    }

    setStep(2);
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setSelectedTime("");
  };

  const getCustomerNotificationToken = async () => {
    try {
      return await requestNotificationToken();
    } catch (error) {
      console.warn(
        "Müşteri bildirim izni vermedi veya token alınamadı:",
        error
      );

      return null;
    }
  };

  const triggerCustomerReminderCheck = async (appointmentId) => {
    try {
      const { error } = await supabase.functions.invoke(
        "send-customer-reminder",
        {
          body: {
            appointment_id: appointmentId,
          },
        }
      );

      if (error) {
        console.warn(
          "Yakın randevu bildirim kontrolü çalıştırılamadı:",
          error
        );
      }
    } catch (error) {
      console.warn(
        "Yakın randevu bildirim kontrolünde hata oluştu:",
        error
      );
    }
  };

  const createAppointment = async () => {
    if (!selectedDate) {
      alert("Lütfen bir tarih seçin.");
      return;
    }

    if (!selectedTime) {
      alert("Lütfen bir saat seçin.");
      return;
    }

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: blockedTime, error: blockedError } = await supabase
        .from("blocked_times")
        .select("id")
        .eq("employee", formData.employee)
        .eq("blocked_date", selectedDate)
        .eq("blocked_time", selectedTime)
        .maybeSingle();

      if (blockedError) {
        console.error("Bloklu saat kontrol hatası:", blockedError);

        alert(
          "Saat durumu kontrol edilirken bir hata oluştu. Lütfen tekrar deneyin."
        );

        return;
      }

      if (blockedTime) {
        alert("Bu saat yönetici tarafından kapatılmıştır.");

        setSelectedTime("");

        return;
      }

      const { data: existingAppointment, error: appointmentCheckError } =
        await supabase
          .from("appointments")
          .select("id")
          .eq("employee", formData.employee)
          .eq("appointment_date", selectedDate)
          .eq("appointment_time", selectedTime)
          .eq("status", "active")
          .maybeSingle();

      if (appointmentCheckError) {
        console.error(
          "Randevu kontrol hatası:",
          appointmentCheckError
        );

        alert(
          "Randevu durumu kontrol edilirken bir hata oluştu. Lütfen tekrar deneyin."
        );

        return;
      }

      if (existingAppointment) {
        alert("Bu saat başka bir müşteri tarafından alınmıştır.");

        setSelectedTime("");

        return;
      }

      const customerPushToken =
        await getCustomerNotificationToken();

      const {
        data: createdAppointment,
        error: insertError,
      } = await supabase
        .from("appointments")
        .insert([
          {
            first_name: formData.firstName.trim(),
            last_name: formData.lastName.trim(),
            phone: formData.phone.trim(),
            service: formData.service.trim(),
            employee: formData.employee,
            appointment_date: selectedDate,
            appointment_time: selectedTime,
            status: "active",
            customer_push_token: customerPushToken,
            reminder_sent: false,
            reminder_sent_at: null,
          },
        ])
        .select("id")
        .single();

      if (insertError) {
        console.error("Randevu kayıt hatası:", insertError);

        if (
          insertError.code === "23505" ||
          insertError.message
            ?.toLowerCase()
            .includes("duplicate")
        ) {
          alert(
            "Bu saat az önce başka bir müşteri tarafından alınmış olabilir. Lütfen başka bir saat seçin."
          );

          setSelectedTime("");

          return;
        }

        alert(
          `Randevu oluşturulamadı.\n\nHata: ${insertError.message}`
        );

        return;
      }

      if (
        customerPushToken &&
        createdAppointment?.id
      ) {
        await triggerCustomerReminderCheck(
          createdAppointment.id
        );
      }

      const notificationMessage =
        customerPushToken
          ? "\n\nBildirimler açıldı. Randevunuz yaklaşınca hatırlatma bildirimi alacaksınız."
          : "\n\nBildirim izni verilmediği için hatırlatma bildirimi gönderilemeyecek.";

      alert(
        `Randevunuz başarıyla oluşturuldu.\n\n` +
          `Müşteri: ${formData.firstName} ${formData.lastName}\n` +
          `Çalışan: ${formData.employee}\n` +
          `Tarih: ${selectedDate}\n` +
          `Saat: ${selectedTime}` +
          notificationMessage
      );

      setFormData({
        firstName: "",
        lastName: "",
        phone: "",
        service: "",
        employee: "",
      });

      setSelectedDate("");
      setSelectedTime("");
      setStep(1);
    } catch (error) {
      console.error("Beklenmeyen hata:", error);

      alert(
        "Beklenmeyen bir hata oluştu. İnternet bağlantınızı kontrol edip tekrar deneyin."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />

      <main className="appointmentPage">
        <section className="appointmentHeader">
          <p>Online Randevu</p>

          <h1>Randevunuzu Oluşturun</h1>

          <span>
            Bilgilerinizi doldurun, çalışanınızı seçin ve size uygun
            randevu saatini belirleyin.
          </span>
        </section>

        {step === 1 && (
          <section className="appointmentContent">
            <div className="appointmentInfo">
              <p className="appointmentSmallTitle">
                Kolay Randevu
              </p>

              <h2>
                Size Uygun Zamanı Birkaç Adımda Seçin
              </h2>

              <p>
                Randevu oluşturmak için kişisel bilgilerinizi
                eksiksiz girin. Ardından hizmet almak istediğiniz
                çalışanı, günü ve saati seçebilirsiniz.
              </p>

              <div className="appointmentSteps">
                <div>
                  <strong>1</strong>

                  <span>
                    <b>Bilgilerinizi Girin</b>
                    Ad, soyad, telefon ve yapılacak işlemi yazın.
                  </span>
                </div>

                <div>
                  <strong>2</strong>

                  <span>
                    <b>Çalışanınızı Seçin</b>
                    Hizmet almak istediğiniz çalışanı belirleyin.
                  </span>
                </div>

                <div>
                  <strong>3</strong>

                  <span>
                    <b>Tarih ve Saat Seçin</b>
                    Önümüzdeki 14 gün içindeki uygun saatlerden
                    birini seçin.
                  </span>
                </div>
              </div>
            </div>

            <form
              className="appointmentForm"
              onSubmit={handleFormSubmit}
            >
              <div className="formTitle">
                <p>Müşteri Bilgileri</p>

                <h2>Randevu Formu</h2>
              </div>

              <div className="formRow">
                <div className="formGroup">
                  <label htmlFor="firstName">Ad</label>

                  <input
                    id="firstName"
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="Adınızı yazın"
                    autoComplete="given-name"
                  />
                </div>

                <div className="formGroup">
                  <label htmlFor="lastName">Soyad</label>

                  <input
                    id="lastName"
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Soyadınızı yazın"
                    autoComplete="family-name"
                  />
                </div>
              </div>

              <div className="formGroup">
                <label htmlFor="phone">
                  Telefon Numarası
                </label>

                <input
                  id="phone"
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="05XX XXX XX XX"
                  autoComplete="tel"
                />
              </div>

              <div className="formGroup">
                <label htmlFor="employee">
                  Çalışan Seçimi
                </label>

                <select
                  id="employee"
                  name="employee"
                  value={formData.employee}
                  onChange={handleChange}
                >
                  <option value="">Çalışan seçin</option>

                  <option value="Yaşar Gökçeev">
                    Yaşar Gökçeev
                  </option>

                  <option value="Çırak">
                    Çırak
                  </option>
                </select>
              </div>

              <div className="formGroup">
                <label htmlFor="service">
                  Yaptıracağınız İşlemi Özetler misiniz?
                </label>

                <textarea
                  id="service"
                  name="service"
                  value={formData.service}
                  onChange={handleChange}
                  placeholder="Örneğin: Saç kesimi ve sakal düzenleme"
                  rows="5"
                />
              </div>

              <button
                type="submit"
                className="continueButton"
              >
                Tarih ve Saat Seçimine Geç
              </button>
            </form>
          </section>
        )}

        {step === 2 && (
          <section className="dateTimeSection">
            <div className="selectedCustomerCard">
              <div>
                <span>Müşteri</span>

                <strong>
                  {formData.firstName} {formData.lastName}
                </strong>
              </div>

              <div>
                <span>Çalışan</span>

                <strong>{formData.employee}</strong>
              </div>

              <button
                type="button"
                className="editInformationButton"
                onClick={() => {
                  setStep(1);
                  setSelectedDate("");
                  setSelectedTime("");
                }}
              >
                Bilgileri Düzenle
              </button>
            </div>

            <Calendar
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
            />

            <TimeSlots
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              onTimeSelect={setSelectedTime}
              employee={formData.employee}
            />

            <div className="appointmentSummary">
              <div>
                <span>Seçilen Tarih</span>

                <strong>
                  {selectedDate || "Henüz seçilmedi"}
                </strong>
              </div>

              <div>
                <span>Seçilen Saat</span>

                <strong>
                  {selectedTime || "Henüz seçilmedi"}
                </strong>
              </div>

              <button
                type="button"
                className="createAppointmentButton"
                onClick={createAppointment}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Randevu Kaydediliyor..."
                  : "Randevuyu Oluştur"}
              </button>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </>
  );
}

export default Appointment;