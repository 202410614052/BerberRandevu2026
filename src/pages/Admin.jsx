import { useCallback, useEffect, useMemo, useState } from "react";

import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { supabase } from "../services/supabase";
import "../styles/admin.css";

const EMPLOYEES = ["Yaşar Gökçeev", "Çırak"];
const TIMES = Array.from({ length: 25 }, (_, index) => {
  const minutes = 9 * 60 + index * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});

function getTurkeyNow() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const values = {};
  parts.forEach((part) => {
    if (part.type !== "literal") values[part.type] = part.value;
  });

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    hour: Number(values.hour),
    minute: Number(values.minute),
  };
}

function addDays(dateText, amount) {
  const [year, month, day] = dateText.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0);
  date.setDate(date.getDate() + amount);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function Admin() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });
  const [loginError, setLoginError] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(EMPLOYEES[0]);
  const [selectedDate, setSelectedDate] = useState("");
  const [appointments, setAppointments] = useState([]);
  const [blockedTimes, setBlockedTimes] = useState([]);
  const [dashboardAppointments, setDashboardAppointments] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [appointmentTab, setAppointmentTab] = useState("active");
  const [isLoading, setIsLoading] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const [clockTick, setClockTick] = useState(Date.now());

  const today = getTurkeyNow().date;

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (error) {
        console.error("Oturum kontrol edilemedi:", error);
        setIsLoggedIn(false);
      } else {
        setIsLoggedIn(Boolean(session));
      }

      setIsAuthLoading(false);
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;

      setIsLoggedIn(Boolean(session));
      setIsAuthLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const days = useMemo(() => {
    return Array.from({ length: 14 }, (_, index) => {
      const databaseDate = addDays(today, index);
      const [year, month, day] = databaseDate.split("-").map(Number);
      const date = new Date(year, month - 1, day, 12, 0, 0);
      return {
        databaseDate,
        dayNumber: String(day).padStart(2, "0"),
        dayName: new Intl.DateTimeFormat("tr-TR", { weekday: "short" }).format(date),
        monthName: new Intl.DateTimeFormat("tr-TR", { month: "short" }).format(date),
        isToday: index === 0,
      };
    });
  }, [today]);

  useEffect(() => {
    if (!selectedDate && days.length) setSelectedDate(days[0].databaseDate);
  }, [days, selectedDate]);

  useEffect(() => {
    const interval = setInterval(() => setClockTick(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const normalizeTime = (time) => (time ? String(time).slice(0, 5) : "");

  const isPastSlot = useCallback(
    (date, time) => {
      const now = getTurkeyNow();
      if (date < now.date) return true;
      if (date > now.date) return false;
      const [hour, minute] = normalizeTime(time).split(":").map(Number);
      return hour * 60 + minute <= now.hour * 60 + now.minute;
    },
    [clockTick]
  );

  const fetchAdminData = useCallback(async () => {
    if (!isLoggedIn || !selectedEmployee || !selectedDate) return;
    setIsLoading(true);
    try {
      const [appointmentResponse, blockedResponse, dashboardResponse] = await Promise.all([
        supabase
          .from("appointments")
          .select("*")
          .eq("employee", selectedEmployee)
          .eq("appointment_date", selectedDate)
          .eq("status", "active")
          .order("appointment_time", { ascending: true }),
        supabase
          .from("blocked_times")
          .select("*")
          .eq("employee", selectedEmployee)
          .eq("blocked_date", selectedDate)
          .order("blocked_time", { ascending: true }),
        supabase
          .from("appointments")
          .select("*")
          .eq("employee", selectedEmployee)
          .eq("status", "active")
          .gte("appointment_date", today)
          .lte("appointment_date", addDays(today, 6)),
      ]);

      if (appointmentResponse.error) throw appointmentResponse.error;
      if (blockedResponse.error) throw blockedResponse.error;
      if (dashboardResponse.error) throw dashboardResponse.error;

      setAppointments(appointmentResponse.data || []);
      setBlockedTimes(blockedResponse.data || []);
      setDashboardAppointments(dashboardResponse.data || []);
    } catch (error) {
      console.error("Yönetici verileri alınamadı:", error);
      alert(`Veriler yüklenemedi: ${error.message || "Bilinmeyen hata"}`);
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn, selectedEmployee, selectedDate, today]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  useEffect(() => {
    if (!isLoggedIn) return undefined;

    const channel = supabase
      .channel("admin-live-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => fetchAdminData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "blocked_times" },
        () => fetchAdminData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isLoggedIn, fetchAdminData]);

  const statistics = useMemo(() => {
    const tomorrow = addDays(today, 1);
    return {
      today: dashboardAppointments.filter((item) => item.appointment_date === today).length,
      tomorrow: dashboardAppointments.filter((item) => item.appointment_date === tomorrow).length,
      week: dashboardAppointments.length,
      selected: appointments.length,
    };
  }, [dashboardAppointments, appointments.length, today]);

  const activeAppointments = useMemo(
    () => appointments.filter((item) => !isPastSlot(item.appointment_date, item.appointment_time)),
    [appointments, isPastSlot]
  );

  const pastAppointments = useMemo(
    () => appointments.filter((item) => isPastSlot(item.appointment_date, item.appointment_time)),
    [appointments, isPastSlot]
  );

  const visibleAppointments = useMemo(() => {
    const source = appointmentTab === "active" ? activeAppointments : pastAppointments;
    const query = searchText.trim().toLocaleLowerCase("tr-TR").replace(/\s/g, "");
    if (!query) return source;

    return source.filter((item) => {
      const fullName = `${item.first_name || ""}${item.last_name || ""}`
        .toLocaleLowerCase("tr-TR")
        .replace(/\s/g, "");
      const phone = String(item.phone || "").replace(/\s/g, "");
      return fullName.includes(query) || phone.includes(query);
    });
  }, [appointmentTab, activeAppointments, pastAppointments, searchText]);

  const handleLogin = async (event) => {
    event.preventDefault();

    const email = loginData.email.trim();
    const password = loginData.password;

    if (!email || !password) {
      setLoginError("Lütfen e-posta adresinizi ve şifrenizi girin.");
      return;
    }

    setIsLoginLoading(true);
    setLoginError("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Yönetici giriş hatası:", error);
        setLoginError(`Giriş başarısız: ${error.message}`);
        return;
      }

      if (!data?.session) {
        setLoginError("Oturum oluşturulamadı. Supabase kullanıcı ayarlarını kontrol edin.");
        return;
      }

      setIsLoggedIn(true);
      setIsAuthLoading(false);
      setLoginError("");
    } catch (error) {
      console.error("Giriş yapılırken beklenmeyen hata:", error);
      setLoginError("Giriş sırasında bir sorun oluştu. Tekrar deneyin.");
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    if (isChanging) return;

    setIsChanging(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      setAppointments([]);
      setBlockedTimes([]);
      setDashboardAppointments([]);
      setLoginData({ email: "", password: "" });
      setLoginError("");
    } catch (error) {
      console.error("Çıkış yapılamadı:", error);
      alert(`Çıkış yapılamadı: ${error.message || "Bilinmeyen hata"}`);
    } finally {
      setIsChanging(false);
    }
  };

  const getAppointmentByTime = (time) =>
    appointments.find((item) => normalizeTime(item.appointment_time) === time);

  const getBlockedTimeByTime = (time) =>
    blockedTimes.find((item) => normalizeTime(item.blocked_time) === time);

  const getTimeStatus = (time) => {
    if (isPastSlot(selectedDate, time)) return "past";
    if (getAppointmentByTime(time)) return "booked";
    if (getBlockedTimeByTime(time)) return "blocked";
    return "available";
  };

  const toggleBlockedTime = async (time) => {
    if (isChanging || isLoading || isPastSlot(selectedDate, time)) return;
    const appointment = getAppointmentByTime(time);
    const blockedTime = getBlockedTimeByTime(time);

    if (appointment) {
      alert("Bu saatte aktif randevu var. Önce randevuyu iptal etmelisiniz.");
      return;
    }

    setIsChanging(true);
    try {
      if (blockedTime) {
        const { error } = await supabase.from("blocked_times").delete().eq("id", blockedTime.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("blocked_times").insert({
          employee: selectedEmployee,
          blocked_date: selectedDate,
          blocked_time: time,
        });
        if (error) throw error;
      }
      await fetchAdminData();
    } catch (error) {
      alert(`Saat durumu değiştirilemedi: ${error.message}`);
    } finally {
      setIsChanging(false);
    }
  };

  const blockAllAvailableTimes = async () => {
    const availableTimes = TIMES.filter((time) => getTimeStatus(time) === "available");
    if (!availableTimes.length) return alert("Kapatılabilecek boş saat bulunmuyor.");
    if (!window.confirm(`${availableTimes.length} boş saatin tamamı kapatılsın mı?`)) return;

    setIsChanging(true);
    try {
      const rows = availableTimes.map((time) => ({
        employee: selectedEmployee,
        blocked_date: selectedDate,
        blocked_time: time,
      }));
      const { error } = await supabase.from("blocked_times").insert(rows);
      if (error) throw error;
      await fetchAdminData();
    } catch (error) {
      alert(`Saatler kapatılamadı: ${error.message}`);
    } finally {
      setIsChanging(false);
    }
  };

  const openAllBlockedTimes = async () => {
    if (!blockedTimes.length) return alert("Açılabilecek kapalı saat bulunmuyor.");
    if (!window.confirm("Seçilen günün tüm kapalı saatleri açılsın mı?")) return;

    setIsChanging(true);
    try {
      const { error } = await supabase
        .from("blocked_times")
        .delete()
        .eq("employee", selectedEmployee)
        .eq("blocked_date", selectedDate);
      if (error) throw error;
      await fetchAdminData();
    } catch (error) {
      alert(`Saatler açılamadı: ${error.message}`);
    } finally {
      setIsChanging(false);
    }
  };

  const cancelAppointment = async (appointment) => {
    if (isChanging) return;
    const customerName = `${appointment.first_name} ${appointment.last_name}`;
    if (
      !window.confirm(
        `${customerName} adlı müşterinin ${normalizeTime(appointment.appointment_time)} randevusu iptal edilsin mi?`
      )
    ) return;

    setIsChanging(true);
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("id", appointment.id);
      if (error) throw error;
      await fetchAdminData();
      alert("Randevu iptal edildi. Saat yeniden boş hale geldi.");
    } catch (error) {
      alert(`Randevu iptal edilemedi: ${error.message}`);
    } finally {
      setIsChanging(false);
    }
  };

  if (isAuthLoading) {
    return (
      <>
        <Navbar />
        <main className="adminLoginPage">
          <section className="adminLoginCard">
            <p className="adminSmallTitle">Yönetici Paneli</p>
            <h1>Oturum Kontrol Ediliyor</h1>
            <span className="adminLoginDescription">Lütfen bekleyin...</span>
          </section>
        </main>
        <Footer />
      </>
    );
  }

  if (!isLoggedIn) {
    return (
      <>
        <Navbar />
        <main className="adminLoginPage">
          <section className="adminLoginCard">
            <p className="adminSmallTitle">Yönetici Paneli</p>
            <h1>Güvenli Yönetici Girişi</h1>
            <span className="adminLoginDescription">
              Supabase hesabınızın e-posta adresi ve şifresiyle giriş yapın.
            </span>

            <form onSubmit={handleLogin} autoComplete="off">
              <div className="adminFormGroup">
                <label htmlFor="email">E-posta Adresi</label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={loginData.email}
                  onChange={(event) => {
                    setLoginData({ ...loginData, email: event.target.value });
                    setLoginError("");
                  }}
                  autoComplete="off"
                  placeholder="E-posta adresinizi girin"
                  required
                />
              </div>

              <div className="adminFormGroup">
                <label htmlFor="password">Şifre</label>
                <input
                  id="password"
                  type="password"
                  name="password"
                  value={loginData.password}
                  onChange={(event) => {
                    setLoginData({ ...loginData, password: event.target.value });
                    setLoginError("");
                  }}
                  autoComplete="new-password"
                  placeholder="Şifrenizi girin"
                  required
                />
              </div>

              {loginError && <p className="adminLoginError">{loginError}</p>}

              <button
                className="adminLoginButton"
                type="submit"
                disabled={isLoginLoading}
              >
                {isLoginLoading ? "Giriş Yapılıyor..." : "Giriş Yap"}
              </button>
            </form>
          </section>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="adminPage">
        <section className="adminHeader">
          <div>
            <p>Yönetim Alanı</p>
            <h1>Randevu ve Saat Yönetimi</h1>
            <span>Randevular gerçek zamanlı yenilenir.</span>
          </div>
          <button type="button" className="adminLogoutButton" onClick={handleLogout} disabled={isChanging}>Çıkış Yap</button>
        </section>

        <section className="adminDashboardGrid">
          <article className="adminStatCard"><span>Bugünkü Randevu</span><strong>{statistics.today}</strong></article>
          <article className="adminStatCard"><span>Yarınki Randevu</span><strong>{statistics.tomorrow}</strong></article>
          <article className="adminStatCard"><span>Bu Hafta</span><strong>{statistics.week}</strong></article>
          <article className="adminStatCard"><span>Seçili Gün</span><strong>{statistics.selected}</strong></article>
        </section>

        <section className="adminEmployeeSection">
          <h2>Çalışan Seçin</h2>
          <div className="adminEmployeeButtons">
            {EMPLOYEES.map((employee) => (
              <button
                key={employee}
                type="button"
                className={selectedEmployee === employee ? "adminEmployeeButton activeEmployee" : "adminEmployeeButton"}
                onClick={() => setSelectedEmployee(employee)}
              >
                {employee}
              </button>
            ))}
          </div>
        </section>

        <section className="adminCalendarSection">
          <div className="adminSectionTitle"><p>Tarih Seçimi</p><h2>Önümüzdeki 14 Gün</h2></div>
          <div className="adminCalendarDays">
            {days.map((day) => (
              <button
                key={day.databaseDate}
                type="button"
                className={selectedDate === day.databaseDate ? "adminCalendarDay selectedAdminDay" : "adminCalendarDay"}
                onClick={() => setSelectedDate(day.databaseDate)}
              >
                <span>{day.dayName}</span><strong>{day.dayNumber}</strong><small>{day.monthName}</small>
                {day.isToday && <em>Bugün</em>}
              </button>
            ))}
          </div>
        </section>

        <section className="adminTimeSection">
          <div className="adminTimeHeader">
            <div className="adminSectionTitle"><p>Saat Yönetimi</p><h2>{selectedEmployee} — {selectedDate}</h2></div>
            <div className="adminBulkButtons">
              <button type="button" className="blockAllButton" onClick={blockAllAvailableTimes} disabled={isChanging || isLoading}>Tüm Boş Saatleri Kapat</button>
              <button type="button" className="openAllButton" onClick={openAllBlockedTimes} disabled={isChanging || isLoading}>Tüm Kapalı Saatleri Aç</button>
            </div>
          </div>

          <div className="adminStatusLegend">
            <div><span className="adminAvailableColor" />Boş</div>
            <div><span className="adminBookedColor" />Randevulu</div>
            <div><span className="adminBlockedColor" />Kapalı</div>
            <div><span className="adminPastColor" />Saat Geçti</div>
          </div>

          {isLoading ? <div className="adminLoading">Saatler yükleniyor...</div> : (
            <div className="adminTimeGrid">
              {TIMES.map((time) => {
                const status = getTimeStatus(time);
                const appointment = getAppointmentByTime(time);
                return (
                  <button
                    key={time}
                    type="button"
                    className={`adminTimeButton admin${status.charAt(0).toUpperCase() + status.slice(1)}Time`}
                    onClick={() => toggleBlockedTime(time)}
                    disabled={isChanging || status === "booked" || status === "past"}
                  >
                    <strong>{time}</strong>
                    <span>{status === "available" ? "Boş" : status === "booked" ? "Randevulu" : status === "blocked" ? "Kapalı" : "Saat Geçti"}</span>
                    {appointment && <small>{appointment.first_name} {appointment.last_name}</small>}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="adminAppointmentsSection">
          <div className="adminAppointmentsTopbar">
            <div className="adminSectionTitle"><p>Randevu Listesi</p><h2>{selectedDate}</h2></div>
            <input
              className="adminSearchInput"
              type="search"
              placeholder="İsim veya telefon ara..."
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
          </div>

          <div className="adminAppointmentTabs">
            <button type="button" className={appointmentTab === "active" ? "active" : ""} onClick={() => setAppointmentTab("active")}>Aktif ({activeAppointments.length})</button>
            <button type="button" className={appointmentTab === "past" ? "active" : ""} onClick={() => setAppointmentTab("past")}>Geçmiş ({pastAppointments.length})</button>
          </div>

          {isLoading ? <div className="adminLoading">Randevular yükleniyor...</div> : visibleAppointments.length === 0 ? (
            <div className="adminEmptyAppointments">Bu bölümde eşleşen randevu bulunmuyor.</div>
          ) : (
            <div className="adminAppointmentList">
              {visibleAppointments.map((appointment) => (
                <article key={appointment.id} className={`adminAppointmentCard ${appointmentTab === "past" ? "pastAppointmentCard" : ""}`}>
                  <div className="adminAppointmentTime"><span>Saat</span><strong>{normalizeTime(appointment.appointment_time)}</strong></div>
                  <div className="adminAppointmentInformation">
                    <h3>{appointment.first_name} {appointment.last_name}</h3>
                    <p><strong>Telefon:</strong> {appointment.phone}</p>
                    <p><strong>Çalışan:</strong> {appointment.employee}</p>
                    <p><strong>İşlem:</strong> {appointment.service}</p>
                  </div>
                  {appointmentTab === "active" ? (
                    <button type="button" className="cancelAppointmentButton" onClick={() => cancelAppointment(appointment)} disabled={isChanging}>Randevuyu İptal Et</button>
                  ) : <span className="pastAppointmentBadge">Tamamlandı</span>}
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}

export default Admin;