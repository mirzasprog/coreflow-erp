
-- Create function to auto-create stock records for new locations
CREATE OR REPLACE FUNCTION public.create_stock_for_new_location()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert stock records for all active items for the new location
  INSERT INTO public.stock (item_id, location_id, quantity, reserved_quantity)
  SELECT i.id, NEW.id, 0, 0
  FROM public.items i
  WHERE i.active = true;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to fire after new location is inserted
CREATE TRIGGER trigger_create_stock_for_new_location
AFTER INSERT ON public.locations
FOR EACH ROW
WHEN (NEW.active = true)
EXECUTE FUNCTION public.create_stock_for_new_location();

-- Create function to auto-create stock records for new items
CREATE OR REPLACE FUNCTION public.create_stock_for_new_item()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert stock records for all active locations for the new item
  INSERT INTO public.stock (item_id, location_id, quantity, reserved_quantity)
  SELECT NEW.id, l.id, 0, 0
  FROM public.locations l
  WHERE l.active = true;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to fire after new item is inserted
CREATE TRIGGER trigger_create_stock_for_new_item
AFTER INSERT ON public.items
FOR EACH ROW
WHEN (NEW.active = true)
EXECUTE FUNCTION public.create_stock_for_new_item();
