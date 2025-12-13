-- Add more absence types to the enum
ALTER TYPE public.absence_type ADD VALUE IF NOT EXISTS 'parental_leave';
ALTER TYPE public.absence_type ADD VALUE IF NOT EXISTS 'maternity_leave';
ALTER TYPE public.absence_type ADD VALUE IF NOT EXISTS 'paternity_leave';
ALTER TYPE public.absence_type ADD VALUE IF NOT EXISTS 'bereavement_leave';
ALTER TYPE public.absence_type ADD VALUE IF NOT EXISTS 'study_leave';
ALTER TYPE public.absence_type ADD VALUE IF NOT EXISTS 'military_leave';
ALTER TYPE public.absence_type ADD VALUE IF NOT EXISTS 'religious_holiday';
ALTER TYPE public.absence_type ADD VALUE IF NOT EXISTS 'jury_duty';
ALTER TYPE public.absence_type ADD VALUE IF NOT EXISTS 'blood_donation';
ALTER TYPE public.absence_type ADD VALUE IF NOT EXISTS 'marriage_leave';