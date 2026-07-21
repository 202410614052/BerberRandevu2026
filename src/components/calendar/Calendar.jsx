import { useMemo } from "react";

import "../../styles/calendar.css";

function Calendar({ selectedDate, onDateSelect }) {
  const days = useMemo(() => {
    const dayList = [];

    for (let index = 0; index < 14; index += 1) {
      const date = new Date();

      date.setHours(12, 0, 0, 0);
      date.setDate(date.getDate() + index);

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");

      const databaseDate = `${year}-${month}-${day}`;

      const dayName = new Intl.DateTimeFormat("tr-TR", {
        weekday: "short",
      }).format(date);

      const monthName = new Intl.DateTimeFormat("tr-TR", {
        month: "short",
      }).format(date);

      dayList.push({
        databaseDate,
        dayNumber: day,
        dayName,
        monthName,
        isToday: index === 0,
      });
    }

    return dayList;
  }, []);

  return (
    <div className="calendarArea">
      <div className="calendarTitle">
        <p>Randevu Tarihi</p>

        <h2>Gün Seçin</h2>

        <span>
          Bugünden başlayarak önümüzdeki 14 gün içerisinden bir
          tarih seçebilirsiniz.
        </span>
      </div>

      <div className="calendarDays">
        {days.map((day) => {
          const isSelected =
            selectedDate === day.databaseDate;

          return (
            <button
              key={day.databaseDate}
              type="button"
              className={[
                "calendarDay",
                isSelected ? "selectedCalendarDay" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onDateSelect(day.databaseDate)}
            >
              <span className="calendarDayName">
                {day.dayName}
              </span>

              <strong className="calendarDayNumber">
                {day.dayNumber}
              </strong>

              <span className="calendarMonthName">
                {day.monthName}
              </span>

              {day.isToday && (
                <small className="todayText">Bugün</small>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default Calendar;