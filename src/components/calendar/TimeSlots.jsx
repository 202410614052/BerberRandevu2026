import { useCallback, useEffect, useState } from "react";

import { supabase } from "../../services/supabase";

import "../../styles/timeslots.css";

const TIMES = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
  "20:30",
  "21:00",
];

function TimeSlots({
  selectedTime,
  onTimeSelect,
  selectedDate,
  employee,
}) {
  const selectedEmployee = employee;

  const [appointments, setAppointments] = useState([]);
  const [blockedTimes, setBlockedTimes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  const normalizeTime = (time) => {
    if (!time) {
      return "";
    }

    return String(time).slice(0, 5);
  };

  const getTurkeyDateInformation = () => {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Istanbul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });

    const parts = formatter.formatToParts(new Date());
    const values = {};

    parts.forEach((part) => {
      if (part.type !== "literal") {
        values[part.type] = part.value;
      }
    });

    return {
      date: `${values.year}-${values.month}-${values.day}`,
      hour: Number(values.hour),
      minute: Number(values.minute),
    };
  };

  const isPastTime = (time) => {
    if (!selectedDate) {
      return false;
    }

    const turkeyNow = getTurkeyDateInformation();

    if (selectedDate < turkeyNow.date) {
      return true;
    }

    if (selectedDate > turkeyNow.date) {
      return false;
    }

    const [hour, minute] = time.split(":").map(Number);

    const selectedTotalMinutes = hour * 60 + minute;
    const currentTotalMinutes =
      turkeyNow.hour * 60 + turkeyNow.minute;

    return selectedTotalMinutes <= currentTotalMinutes;
  };

  const fetchTimeInformation = useCallback(async () => {
    if (!selectedDate || !selectedEmployee) {
      setAppointments([]);
      setBlockedTimes([]);
      return;
    }

    setIsLoading(true);

    try {
      const [appointmentResponse, blockedResponse] =
        await Promise.all([
          supabase
            .from("appointments")
            .select("*")
            .eq("employee", selectedEmployee)
            .eq("appointment_date", selectedDate)
            .eq("status", "active"),

          supabase
            .from("blocked_times")
            .select("*")
            .eq("employee", selectedEmployee)
            .eq("blocked_date", selectedDate),
        ]);

      if (appointmentResponse.error) {
        console.error(
          "Randevular yüklenemedi:",
          appointmentResponse.error
        );

        setAppointments([]);
      } else {
        setAppointments(appointmentResponse.data || []);
      }

      if (blockedResponse.error) {
        console.error(
          "Kapalı saatler yüklenemedi:",
          blockedResponse.error
        );

        setBlockedTimes([]);
      } else {
        setBlockedTimes(blockedResponse.data || []);
      }
    } catch (error) {
      console.error(
        "Saat bilgileri yüklenirken hata oluştu:",
        error
      );

      setAppointments([]);
      setBlockedTimes([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, selectedEmployee]);

  useEffect(() => {
    setAppointments([]);
    setBlockedTimes([]);

    if (typeof onTimeSelect === "function") {
      onTimeSelect("");
    }

    fetchTimeInformation();
  }, [fetchTimeInformation, onTimeSelect]);

  useEffect(() => {
    if (!selectedDate || !selectedEmployee) {
      return undefined;
    }

    const channelName = `customer-times-${selectedEmployee}-${selectedDate}`
      .replace(/\s+/g, "-")
      .toLocaleLowerCase("tr-TR");

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
        },
        () => {
          fetchTimeInformation();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "blocked_times",
        },
        () => {
          fetchTimeInformation();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    selectedDate,
    selectedEmployee,
    fetchTimeInformation,
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const getAppointmentByTime = (time) => {
    return appointments.find(
      (appointment) =>
        normalizeTime(appointment.appointment_time) === time
    );
  };

  const getBlockedTimeByTime = (time) => {
    return blockedTimes.find(
      (blockedTime) =>
        normalizeTime(blockedTime.blocked_time) === time
    );
  };

  const getTimeStatus = (time) => {
    if (isPastTime(time)) {
      return "past";
    }

    if (getBlockedTimeByTime(time)) {
      return "blocked";
    }

    if (getAppointmentByTime(time)) {
      return "booked";
    }

    return "available";
  };

  useEffect(() => {
    if (!selectedTime) {
      return;
    }

    const selectedStatus = getTimeStatus(selectedTime);

    if (
      selectedStatus !== "available" &&
      typeof onTimeSelect === "function"
    ) {
      onTimeSelect("");
    }
  }, [
    currentTime,
    selectedTime,
    appointments,
    blockedTimes,
    selectedDate,
    selectedEmployee,
    onTimeSelect,
  ]);

  const handleTimeClick = (time) => {
    const status = getTimeStatus(time);

    if (status !== "available") {
      return;
    }

    if (typeof onTimeSelect === "function") {
      if (selectedTime === time) {
        onTimeSelect("");
      } else {
        onTimeSelect(time);
      }
    }
  };

  const getStatusText = (status, isSelected) => {
    if (isSelected) {
      return "Seçildi";
    }

    if (status === "available") {
      return "Boş";
    }

    if (status === "booked") {
      return "Dolu";
    }

    if (status === "blocked") {
      return "Kapalı";
    }

    return "Saat Geçti";
  };

  const getTitleText = (status, isSelected) => {
    if (isSelected) {
      return "Bu saat seçildi";
    }

    if (status === "available") {
      return "Bu saati seçebilirsiniz";
    }

    if (status === "booked") {
      return "Bu saat daha önce alınmış";
    }

    if (status === "blocked") {
      return "Bu saat yönetici tarafından kapatılmış";
    }

    return "Bu saatin süresi geçmiş";
  };

  if (!selectedDate) {
    return (
      <div className="timeSlotsMessage">
        Saatleri görmek için önce tarih seçin.
      </div>
    );
  }

  if (!selectedEmployee) {
    return (
      <div className="timeSlotsMessage">
        Saatleri görmek için önce çalışan seçin.
      </div>
    );
  }

  return (
    <section className="timeSlotsSection">
      <div className="timeSlotsHeader">
        <div>
          <span>SAAT SEÇİMİ</span>
          <h2>Uygun Randevu Saatleri</h2>
        </div>

        <p>
          {selectedEmployee} için müsait bir saat seçin.
        </p>
      </div>

      <div className="timeStatusLegend">
        <div>
          <span className="legendAvailable"></span>
          Boş
        </div>

        <div>
          <span className="legendBooked"></span>
          Alınmış
        </div>

        <div>
          <span className="legendBlocked"></span>
          Kapalı
        </div>

        <div>
          <span className="legendPast"></span>
          Saat Geçti
        </div>

        <div>
          <span className="legendSelected"></span>
          Seçildi
        </div>
      </div>

      {isLoading ? (
        <div className="timeSlotsMessage">
          Saatler yükleniyor...
        </div>
      ) : (
        <div className="timeSlotsGrid">
          {TIMES.map((time) => {
            const status = getTimeStatus(time);

            const isSelected =
              status === "available" &&
              selectedTime === time;

            return (
              <button
                key={`${selectedDate}-${selectedEmployee}-${time}`}
                type="button"
                className={[
                  "timeSlotButton",
                  `timeSlot-${status}`,
                  isSelected ? "timeSlotSelected" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => handleTimeClick(time)}
                disabled={status !== "available"}
                aria-pressed={isSelected}
                aria-label={`${time} ${getStatusText(
                  status,
                  isSelected
                )}`}
                title={getTitleText(status, isSelected)}
              >
                <strong>{time}</strong>

                <span>
                  {getStatusText(status, isSelected)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default TimeSlots;