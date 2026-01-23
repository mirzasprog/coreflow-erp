import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RoomType {
  id: string;
  name: string;
  description: string | null;
  base_price: number;
  max_occupancy: number;
  amenities: string[] | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Room {
  id: string;
  room_number: string;
  room_type_id: string | null;
  floor: number | null;
  status: string;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  room_type?: RoomType;
}

export interface HotelGuest {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  id_document_type: string | null;
  id_document_number: string | null;
  nationality: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Reservation {
  id: string;
  reservation_number: string;
  guest_id: string | null;
  room_id: string | null;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  status: string;
  source: string;
  channel_reservation_id: string | null;
  total_price: number;
  paid_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  guest?: HotelGuest;
  room?: Room;
}

export interface ChannelConnection {
  id: string;
  channel_name: string;
  api_key: string | null;
  property_id: string | null;
  is_active: boolean;
  sync_enabled: boolean;
  last_sync_at: string | null;
  settings: unknown;
  created_at: string;
  updated_at: string;
}

// Room Types
export function useRoomTypes() {
  return useQuery({
    queryKey: ['room-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('room_types')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as RoomType[];
    },
  });
}

export function useCreateRoomType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (roomType: Omit<RoomType, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('room_types')
        .insert(roomType)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-types'] });
      toast.success('Tip sobe kreiran');
    },
    onError: (error) => {
      toast.error('Greška pri kreiranju tipa sobe');
      console.error(error);
    },
  });
}

// Rooms
export function useRooms() {
  return useQuery({
    queryKey: ['rooms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select('*, room_type:room_types(*)')
        .order('room_number');
      if (error) throw error;
      return data as Room[];
    },
  });
}

export function useCreateRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (room: Omit<Room, 'id' | 'created_at' | 'updated_at' | 'room_type'>) => {
      const { data, error } = await supabase
        .from('rooms')
        .insert(room)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast.success('Soba kreirana');
    },
    onError: (error) => {
      toast.error('Greška pri kreiranju sobe');
      console.error(error);
    },
  });
}

export function useUpdateRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...room }: Partial<Room> & { id: string }) => {
      const { data, error } = await supabase
        .from('rooms')
        .update(room)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast.success('Soba ažurirana');
    },
    onError: (error) => {
      toast.error('Greška pri ažuriranju sobe');
      console.error(error);
    },
  });
}

// Guests
export function useHotelGuests() {
  return useQuery({
    queryKey: ['hotel-guests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hotel_guests')
        .select('*')
        .order('last_name');
      if (error) throw error;
      return data as HotelGuest[];
    },
  });
}

export function useCreateGuest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (guest: Omit<HotelGuest, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('hotel_guests')
        .insert(guest)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hotel-guests'] });
      toast.success('Gost kreiran');
    },
    onError: (error) => {
      toast.error('Greška pri kreiranju gosta');
      console.error(error);
    },
  });
}

// Reservations
export function useReservations(filters?: { startDate?: string; endDate?: string; status?: string }) {
  return useQuery({
    queryKey: ['reservations', filters],
    queryFn: async () => {
      let query = supabase
        .from('reservations')
        .select('*, guest:hotel_guests(*), room:rooms(*, room_type:room_types(*))')
        .order('check_in', { ascending: true });
      
      if (filters?.startDate) {
        query = query.gte('check_in', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('check_out', filters.endDate);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Reservation[];
    },
  });
}

export function useCreateReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reservation: Omit<Reservation, 'id' | 'reservation_number' | 'created_at' | 'updated_at' | 'guest' | 'room'>) => {
      // Generate reservation number
      const reservationNumber = `RES-${Date.now().toString(36).toUpperCase()}`;
      const { data, error } = await supabase
        .from('reservations')
        .insert({ ...reservation, reservation_number: reservationNumber })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast.success('Rezervacija kreirana');
    },
    onError: (error) => {
      toast.error('Greška pri kreiranju rezervacije');
      console.error(error);
    },
  });
}

export function useUpdateReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...reservation }: Partial<Reservation> & { id: string }) => {
      const { data, error } = await supabase
        .from('reservations')
        .update(reservation)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast.success('Rezervacija ažurirana');
    },
    onError: (error) => {
      toast.error('Greška pri ažuriranju rezervacije');
      console.error(error);
    },
  });
}

// Channel connections
export function useChannelConnections() {
  return useQuery({
    queryKey: ['channel-connections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('channel_connections')
        .select('*')
        .order('channel_name');
      if (error) throw error;
      return data as ChannelConnection[];
    },
  });
}

export function useCreateChannelConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (connection: Omit<ChannelConnection, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('channel_connections')
        .insert([{
          channel_name: connection.channel_name,
          api_key: connection.api_key,
          property_id: connection.property_id,
          is_active: connection.is_active,
          sync_enabled: connection.sync_enabled,
          last_sync_at: connection.last_sync_at,
          settings: connection.settings as Record<string, never>,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channel-connections'] });
      toast.success('Kanal povezan');
    },
    onError: (error) => {
      toast.error('Greška pri povezivanju kanala');
      console.error(error);
    },
  });
}

// Dashboard stats
export function useHotelDashboardStats() {
  return useQuery({
    queryKey: ['hotel-dashboard-stats'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      // Get rooms stats
      const { data: rooms } = await supabase.from('rooms').select('status');
      const totalRooms = rooms?.length || 0;
      const occupiedRooms = rooms?.filter(r => r.status === 'occupied').length || 0;
      const availableRooms = rooms?.filter(r => r.status === 'available').length || 0;
      
      // Get today's check-ins
      const { data: checkIns } = await supabase
        .from('reservations')
        .select('id')
        .eq('check_in', today)
        .in('status', ['confirmed', 'pending']);
      
      // Get today's check-outs
      const { data: checkOuts } = await supabase
        .from('reservations')
        .select('id')
        .eq('check_out', today)
        .eq('status', 'checked_in');
      
      // Get active reservations
      const { data: activeReservations } = await supabase
        .from('reservations')
        .select('id')
        .in('status', ['confirmed', 'checked_in']);
      
      return {
        totalRooms,
        occupiedRooms,
        availableRooms,
        occupancyRate: totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0,
        todayCheckIns: checkIns?.length || 0,
        todayCheckOuts: checkOuts?.length || 0,
        activeReservations: activeReservations?.length || 0,
      };
    },
  });
}
