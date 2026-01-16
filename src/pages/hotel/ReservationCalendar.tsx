import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useReservations, useRooms } from "@/hooks/useHotel";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isWithinInterval, parseISO, isSameDay } from "date-fns";
import { hr } from "date-fns/locale";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
  confirmed: "bg-blue-100 text-blue-800 border-blue-300",
  checked_in: "bg-green-100 text-green-800 border-green-300",
  checked_out: "bg-gray-100 text-gray-800 border-gray-300",
  cancelled: "bg-red-100 text-red-800 border-red-300",
  no_show: "bg-orange-100 text-orange-800 border-orange-300",
};

const sourceColors: Record<string, string> = {
  direct: "bg-purple-500",
  booking_com: "bg-blue-600",
  airbnb: "bg-rose-500",
  expedia: "bg-yellow-500",
  other: "bg-gray-500",
};

export default function ReservationCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  
  const { data: rooms, isLoading: roomsLoading } = useRooms();
  const { data: reservations, isLoading: reservationsLoading } = useReservations({
    startDate: format(monthStart, 'yyyy-MM-dd'),
    endDate: format(monthEnd, 'yyyy-MM-dd'),
  });

  const days = useMemo(() => eachDayOfInterval({ start: monthStart, end: monthEnd }), [monthStart, monthEnd]);

  const getReservationsForRoomAndDay = (roomId: string, day: Date) => {
    return reservations?.filter(res => {
      if (res.room_id !== roomId) return false;
      const checkIn = parseISO(res.check_in_date);
      const checkOut = parseISO(res.check_out_date);
      return isWithinInterval(day, { start: checkIn, end: checkOut }) || 
             isSameDay(day, checkIn) || 
             isSameDay(day, checkOut);
    }) || [];
  };

  const isLoading = roomsLoading || reservationsLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kalendar rezervacija</h1>
          <p className="text-muted-foreground">
            Pregled zauzetosti soba po danima
          </p>
        </div>
        <Button asChild>
          <Link to="/hotel/reservations/new">
            <Plus className="h-4 w-4 mr-2" />
            Nova rezervacija
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl">
            {format(currentMonth, 'LLLL yyyy', { locale: hr })}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => setCurrentMonth(new Date())}>
              Danas
            </Button>
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-96" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border p-2 bg-muted text-left min-w-[120px] sticky left-0 z-10">Soba</th>
                    {days.map(day => (
                      <th key={day.toISOString()} className="border p-1 bg-muted text-center min-w-[40px] text-xs">
                        <div>{format(day, 'EEE', { locale: hr })}</div>
                        <div className="font-bold">{format(day, 'd')}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rooms?.map(room => (
                    <tr key={room.id}>
                      <td className="border p-2 bg-background sticky left-0 z-10">
                        <div className="font-medium">{room.room_number}</div>
                        <div className="text-xs text-muted-foreground">{room.room_type?.name}</div>
                      </td>
                      {days.map(day => {
                        const dayReservations = getReservationsForRoomAndDay(room.id, day);
                        const reservation = dayReservations[0];
                        
                        return (
                          <td key={day.toISOString()} className="border p-0.5">
                            {reservation ? (
                              <Link to={`/hotel/reservations/${reservation.id}`}>
                                <div 
                                  className={`h-8 rounded flex items-center justify-center text-xs cursor-pointer hover:opacity-80 ${sourceColors[reservation.source]}`}
                                  title={`${reservation.guest?.first_name} ${reservation.guest?.last_name} - ${reservation.source}`}
                                >
                                  {isSameDay(parseISO(reservation.check_in_date), day) && (
                                    <span className="text-white truncate px-1">
                                      {reservation.guest?.last_name?.slice(0, 3)}
                                    </span>
                                  )}
                                </div>
                              </Link>
                            ) : (
                              <div className="h-8 bg-green-50 rounded" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-4">
            <div className="text-sm font-medium">Izvor:</div>
            {Object.entries(sourceColors).map(([source, color]) => (
              <div key={source} className="flex items-center gap-1">
                <div className={`h-3 w-3 rounded ${color}`} />
                <span className="text-xs">
                  {source === 'direct' && 'Direktno'}
                  {source === 'booking_com' && 'Booking.com'}
                  {source === 'airbnb' && 'Airbnb'}
                  {source === 'expedia' && 'Expedia'}
                  {source === 'other' && 'Ostalo'}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-green-50 border border-green-200" />
              <span className="text-xs">Slobodno</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
