import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Hotel, BedDouble, Calendar, Users, Settings, ArrowUpRight, ArrowDownRight, Percent } from "lucide-react";
import { useHotelDashboardStats } from "@/hooks/useHotel";
import { Skeleton } from "@/components/ui/skeleton";

export default function HotelIndex() {
  const { data: stats, isLoading } = useHotelDashboardStats();

  const quickLinks = [
    { label: "Kalendar rezervacija", href: "/hotel/calendar", icon: Calendar },
    { label: "Sobe", href: "/hotel/rooms", icon: BedDouble },
    { label: "Gosti", href: "/hotel/guests", icon: Users },
    { label: "Kanali", href: "/hotel/channels", icon: Settings },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Hotel className="h-8 w-8" />
            Hotelsko poslovanje
          </h1>
          <p className="text-muted-foreground">
            Upravljanje sobama, rezervacijama i gostima
          </p>
        </div>
        <Button asChild>
          <Link to="/hotel/reservations/new">Nova rezervacija</Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Popunjenost</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.occupancyRate}%</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.occupiedRooms} / {stats?.totalRooms} soba
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dolasci danas</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.todayCheckIns}</div>
                <p className="text-xs text-muted-foreground">očekivanih dolazaka</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Odlasci danas</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.todayCheckOuts}</div>
                <p className="text-xs text-muted-foreground">očekivanih odlazaka</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktivne rezervacije</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.activeReservations}</div>
                <p className="text-xs text-muted-foreground">potvrđeno/prijavljeno</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {quickLinks.map((link) => (
          <Card key={link.href} className="hover:bg-accent/50 transition-colors">
            <Link to={link.href}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <link.icon className="h-5 w-5" />
                  {link.label}
                </CardTitle>
              </CardHeader>
            </Link>
          </Card>
        ))}
      </div>

      {/* Room Status Overview */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Status soba</CardTitle>
            <CardDescription>Pregled trenutnog stanja soba</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-32" />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                    <span>Slobodno</span>
                  </div>
                  <span className="font-bold">{stats?.availableRooms}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-500" />
                    <span>Zauzeto</span>
                  </div>
                  <span className="font-bold">{stats?.occupiedRooms}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-yellow-500" />
                    <span>Održavanje</span>
                  </div>
                  <span className="font-bold">0</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kanali rezervacija</CardTitle>
            <CardDescription>Povezane platforme za rezervacije</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded bg-blue-600 flex items-center justify-center text-white text-xs font-bold">B</div>
                  <span>Booking.com</span>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/hotel/channels">Poveži</Link>
                </Button>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded bg-rose-500 flex items-center justify-center text-white text-xs font-bold">A</div>
                  <span>Airbnb</span>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/hotel/channels">Poveži</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
