-- Create function to update updated_at column if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create table for storing chatbot Q&A history
CREATE TABLE public.chatbot_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  was_helpful BOOLEAN,
  has_knowledge_gap BOOLEAN DEFAULT false,
  suggested_answer TEXT,
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chatbot_history ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert chat history
CREATE POLICY "Anyone can insert chat history"
ON public.chatbot_history
FOR INSERT
WITH CHECK (true);

-- Policy: Authenticated users can view chat history
CREATE POLICY "Authenticated users can view chat history"
ON public.chatbot_history
FOR SELECT
TO authenticated
USING (true);

-- Policy: Authenticated users can update chat history
CREATE POLICY "Authenticated users can update chat history"
ON public.chatbot_history
FOR UPDATE
TO authenticated
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_chatbot_history_updated_at
BEFORE UPDATE ON public.chatbot_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();