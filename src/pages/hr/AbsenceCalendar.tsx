import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Calendar, List } from "lucide-react";
import { useAbsences } from "@/hooks/useHR";
import { useDepartments } from "@/hooks/useHR";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isWithinInterval,
  parseISO,
} from "date-fns";

const ABSENCE_TYPES: Record<string, { label: string; color: string }> = {
  annual_leave: { label: "Godišnji odmor", color: "bg-blue-500" },
  sick_leave: { label: "Bolovanje", color: "bg-red-500" },
  unpaid_leave: { label: "Neplaćeno odsustvo", color: "bg-gray-500" },
  parental_leave: { label: "Roditeljski dopust", color: "bg-purple-500" },
  maternity_leave: { label: "Porodiljski dopust", color: "bg-pink-500" },
  paternity_leave: { label: "Očinski dopust", color: "bg-indigo-500" },
  bereavement_leave: { label: "Odsustvo zbog smrti", color: "bg-gray-700" },
  study_leave: { label: "Studijski dopust", color: "bg-teal-500" },
  military_leave: { label: "Vojni dopust", color: "bg-green-700" },
  religious_holiday: { label: "Vjerski praznik", color: "bg-amber-500" },
  jury_duty: { label: "Sudska dužnost", color: "bg-orange-500" },
  blood_donation: { label: "Davalaštvo krvi", color: "bg-red-600" },
  marriage_leave: { label: "Bračni dopust", color: "bg-rose-400" },
  other: { label: "Ostalo", color: "bg-slate-400" },
};

export default function AbsenceCalendar() {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  
  const { data: absences, isLoading } = useAbsences();
  const { data: departments } = useDepartments();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get start day of week (0 = Sunday)
  const startDayOfWeek = monthStart.getDay();
  const paddingDays = Array(startDayOfWeek).fill(null);

  const filteredAbsences = useMemo(() => {
    if (!absences) return [];
    if (selectedDepartment === "all") return absences;
    return absences.filter(
      (a) => a.employees?.department_id === selectedDepartment
    );
  }, [absences, selectedDepartment]);

  const getAbsencesForDay = (date: Date) => {
    return filteredAbsences.filter((absence) => {
      const start = parseISO(absence.start_date);
      const end = parseISO(absence.end_date);
      return isWithinInterval(date, { start, end });
    });
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div>
      <Header
        title="Absence Calendar"
        subtitle="Kalendar odsutnosti • Employee Leave Overview"
      />

      <div className="p-6">
        {/* Controls */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-semibold min-w-[200px] text-center">
              {format(currentMonth, "MMMM yyyy")}
            </h2>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              onClick={() => setCurrentMonth(new Date())}
            >
              Today
            </Button>
          </div>

          <div className="flex gap-2">
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments?.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => navigate("/hr/absences")}>
              <List className="mr-2 h-4 w-4" />
              List View
            </Button>
          </div>
        </div>

        {/* Legend */}
        <div className="mb-6 module-card">
          <h3 className="font-medium mb-3">Legenda tipova odsutnosti</h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(ABSENCE_TYPES).map(([key, { label, color }]) => (
              <div key={key} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded ${color}`} />
                <span className="text-sm text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Calendar Grid */}
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            Loading calendar...
          </div>
        ) : (
          <div className="module-card overflow-hidden">
            {/* Week header */}
            <div className="grid grid-cols-7 border-b bg-muted/50">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="p-3 text-center text-sm font-medium text-muted-foreground"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7">
              {paddingDays.map((_, index) => (
                <div
                  key={`padding-${index}`}
                  className="min-h-[120px] border-b border-r bg-muted/20 p-2"
                />
              ))}
              {days.map((day) => {
                const dayAbsences = getAbsencesForDay(day);
                const isToday = isSameDay(day, new Date());

                return (
                  <div
                    key={day.toISOString()}
                    className={`min-h-[120px] border-b border-r p-2 ${
                      isToday ? "bg-primary/5" : ""
                    }`}
                  >
                    <div
                      className={`mb-1 text-sm font-medium ${
                        isToday
                          ? "flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {format(day, "d")}
                    </div>
                    <div className="space-y-1">
                      {dayAbsences.slice(0, 3).map((absence) => {
                        const type = ABSENCE_TYPES[absence.type] || ABSENCE_TYPES.other;
                        return (
                          <div
                            key={absence.id}
                            className={`rounded px-1.5 py-0.5 text-xs text-white truncate ${type.color} ${
                              absence.approved ? "" : "opacity-60"
                            }`}
                            title={`${absence.employees?.first_name} ${absence.employees?.last_name} - ${type.label}${
                              absence.approved ? "" : " (pending)"
                            }`}
                          >
                            {absence.employees?.first_name?.[0]}.{" "}
                            {absence.employees?.last_name}
                          </div>
                        );
                      })}
                      {dayAbsences.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{dayAbsences.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Summary Section */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(ABSENCE_TYPES)
            .slice(0, 4)
            .map(([key, { label, color }]) => {
              const count = filteredAbsences.filter((a) => a.type === key).length;
              return (
                <div key={key} className="module-card">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded ${color}`} />
                    <div>
                      <p className="text-sm text-muted-foreground">{label}</p>
                      <p className="text-2xl font-semibold">{count}</p>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
