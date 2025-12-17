import { useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Flame, HeartPulse } from "lucide-react";
import { cn } from "@/lib/utils";

interface CalendarEvent {
  id: string;
  date: string;
  type: "inspection" | "medical";
  title: string;
  location?: string;
  employee?: string;
  status: "upcoming" | "overdue" | "completed";
}

const eventsSeed: CalendarEvent[] = [
  { id: "1", date: "2024-01-15", type: "inspection", title: "Fire Extinguisher FE-001", location: "Store 1", status: "overdue" },
  { id: "2", date: "2024-01-18", type: "medical", title: "Sanitary Booklet", employee: "Ana Kovač", status: "overdue" },
  { id: "3", date: "2024-01-20", type: "inspection", title: "Fire Extinguisher FE-005", location: "Store 2", status: "upcoming" },
  { id: "4", date: "2024-01-22", type: "medical", title: "Medical Exam", employee: "John Doe", status: "upcoming" },
  { id: "5", date: "2024-01-25", type: "inspection", title: "Hydrant H-003", location: "Warehouse", status: "upcoming" },
  { id: "6", date: "2024-01-28", type: "inspection", title: "Elevator EL-001", location: "Office HQ", status: "upcoming" },
  { id: "7", date: "2024-02-01", type: "medical", title: "Periodic Exam", employee: "Sarah Miller", status: "upcoming" },
];

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function HSECalendar() {
  const [currentMonth, setCurrentMonth] = useState(0); // January 2024
  const [currentYear, setCurrentYear] = useState(2024);
  const [filter, setFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<CalendarEvent["status"] | "all">("all");
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(eventsSeed);
  const [selectedDay, setSelectedDay] = useState<number | null>(15);

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Adjust for Monday start
  };

  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear);

  const monthEvents = useMemo(() => {
    return calendarEvents.filter((e) => {
      if (filter !== "all" && e.type !== filter) return false;
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      const eventMonth = parseInt(e.date.split("-")[1]) - 1;
      const eventYear = parseInt(e.date.split("-")[0]);
      return eventMonth === currentMonth && eventYear === currentYear;
    });
  }, [calendarEvents, currentMonth, currentYear, filter, statusFilter]);

  const getEventsForDay = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return monthEvents.filter((e) => e.date === dateStr);
  };

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const calendarSummary = useMemo(() => {
    const overdue = monthEvents.filter((e) => e.status === "overdue").length;
    const upcoming = monthEvents.filter((e) => e.status === "upcoming").length;
    const completed = monthEvents.filter((e) => e.status === "completed").length;
    return { total: monthEvents.length, overdue, upcoming, completed };
  }, [monthEvents]);

  const selectedDateEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  const handleComplete = (id: string) => {
    setCalendarEvents((items) =>
      items.map((item) => (item.id === id ? { ...item, status: "completed" } : item))
    );
  };

  const handleSelectDay = (day: number) => {
    setSelectedDay(day);
  };

  return (
    <div>
      <Header title="HSE Calendar" subtitle="Kalendar zaštite na radu • Inspection & Medical Schedule" />

      <div className="p-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Calendar */}
          <div className="module-card lg:col-span-2">
            {/* Calendar Header */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={prevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h3 className="min-w-[180px] text-center text-lg font-semibold">
                  {months[currentMonth]} {currentYear}
                </h3>
                <Button variant="outline" size="icon" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  <SelectItem value="inspection">Inspections</SelectItem>
                  <SelectItem value="medical">Medical Checks</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border bg-border">
              {/* Day Headers */}
              {days.map((day) => (
                <div
                  key={day}
                  className="bg-muted p-2 text-center text-sm font-medium text-muted-foreground"
                >
                  {day}
                </div>
              ))}

              {/* Empty cells for days before month start */}
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[100px] bg-card p-1" />
              ))}

              {/* Days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dayEvents = getEventsForDay(day);
                const isToday = day === 15 && currentMonth === 0 && currentYear === 2024; // Mock today

                return (
                  <div
                    key={day}
                    className={cn(
                      "min-h-[100px] bg-card p-1 transition-colors hover:bg-muted/50",
                      isToday && "bg-primary/5"
                    )}
                    onClick={() => handleSelectDay(day)}
                  >
                    <span
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full text-sm",
                        isToday && "bg-primary text-primary-foreground"
                      )}
                    >
                      {day}
                    </span>
                    <div className="mt-1 space-y-1">
                      {dayEvents.slice(0, 2).map((event) => (
                        <div
                          key={event.id}
                          className={cn(
                            "flex items-center gap-1 truncate rounded px-1 py-0.5 text-xs",
                            event.type === "inspection" && "bg-module-hse/20 text-module-hse",
                            event.type === "medical" && "bg-info/20 text-info",
                            event.status === "overdue" && "bg-destructive/20 text-destructive"
                          )}
                        >
                          {event.type === "inspection" ? (
                            <Flame className="h-3 w-3 shrink-0" />
                          ) : (
                            <HeartPulse className="h-3 w-3 shrink-0" />
                          )}
                          <span className="truncate">{event.title}</span>
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <span className="text-xs text-muted-foreground">
                          +{dayEvents.length - 2} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sidebar - Events List */}
          <div className="module-card">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Events in {months[currentMonth]}</h3>
                <p className="text-sm text-muted-foreground">Klik na datum otvara dnevne detalje</p>
              </div>
              <div className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                {calendarSummary.total} total
              </div>
            </div>
            <div className="mb-4 grid grid-cols-3 gap-2 text-xs font-semibold">
              <div className="rounded-lg bg-destructive/5 p-2 text-destructive">
                Overdue
                <div className="text-xl">{calendarSummary.overdue}</div>
              </div>
              <div className="rounded-lg bg-module-hse/10 p-2 text-module-hse">
                Upcoming
                <div className="text-xl">{calendarSummary.upcoming}</div>
              </div>
              <div className="rounded-lg bg-success/10 p-2 text-success">
                Completed
                <div className="text-xl">{calendarSummary.completed}</div>
              </div>
            </div>
            <div className="space-y-3">
              {monthEvents.length === 0 ? (
                <p className="text-center text-muted-foreground">No events this month</p>
              ) : (
                monthEvents.map((event) => (
                  <div
                    key={event.id}
                    className={cn(
                      "rounded-lg border p-3",
                      event.status === "overdue" && "border-destructive/30 bg-destructive/5"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className={cn(
                          "mt-0.5 rounded p-1.5",
                          event.type === "inspection" ? "bg-module-hse/10" : "bg-info/10"
                        )}
                      >
                        {event.type === "inspection" ? (
                          <Flame className="h-4 w-4 text-module-hse" />
                        ) : (
                          <HeartPulse className="h-4 w-4 text-info" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{event.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {event.location || event.employee}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {event.date}
                          </span>
                          {event.status === "overdue" && (
                            <span className="badge-danger">Overdue</span>
                          )}
                          {event.status === "completed" && (
                            <span className="badge-success">Completed</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {event.status !== "completed" && (
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleComplete(event.id)}>
                          Mark completed
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleSelectDay(parseInt(event.date.split("-")[2], 10))}>
                          View in calendar
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Day focus */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="module-card lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Dnevni pregled</h3>
                <p className="text-sm text-muted-foreground">
                  Odabrani datum: {selectedDay ? `${selectedDay}. ${months[currentMonth]} ${currentYear}.` : "Nije odabran"}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setSelectedDay(null)}>
                Reset
              </Button>
            </div>
            {selectedDateEvents.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                Nema događaja za odabrani datum.
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDateEvents.map((event) => (
                  <div key={event.id} className="rounded-lg border p-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "mt-0.5 rounded p-1.5",
                          event.type === "inspection" ? "bg-module-hse/10" : "bg-info/10"
                        )}
                      >
                        {event.type === "inspection" ? (
                          <Flame className="h-4 w-4 text-module-hse" />
                        ) : (
                          <HeartPulse className="h-4 w-4 text-info" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{event.title}</p>
                        <p className="text-sm text-muted-foreground">{event.location || event.employee}</p>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full bg-muted px-2 py-1">{event.type}</span>
                          <span className="rounded-full bg-muted px-2 py-1">Status: {event.status}</span>
                          <span className="rounded-full bg-muted px-2 py-1">Datum: {event.date}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="module-card">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Legenda</h3>
                <p className="text-sm text-muted-foreground">Tipovi i statusi događaja</p>
              </div>
              <div className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">Helper</div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 rounded-lg bg-module-hse/10 p-2 text-module-hse">
                <Flame className="h-4 w-4" /> Inspekcije i tehnički pregledi
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-info/10 p-2 text-info">
                <HeartPulse className="h-4 w-4" /> Zdravstveni i sanitarni pregledi
              </div>
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-destructive">
                Overdue – potrebno hitno djelovanje
              </div>
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-2 text-warning">
                Upcoming – planirano za tekući period
              </div>
              <div className="rounded-lg border border-success/30 bg-success/5 p-2 text-success">
                Completed – evidentirano kao završeno
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
