-- ============================================================
-- Ambil Obat — Add Push Subscriptions Table
-- Run this in your Supabase SQL Editor
-- ============================================================

CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, subscription)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies for users to manage their own push subscriptions
CREATE POLICY "Users can select own subscriptions" ON public.push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions" ON public.push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions" ON public.push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- Secure RPC to retrieve subscriptions server-side using a shared secret
CREATE OR REPLACE FUNCTION public.get_user_push_subscriptions(p_user_id UUID, p_secret TEXT)
RETURNS TABLE (subscription JSONB) AS $$
BEGIN
  -- Validate secret to prevent unauthorized access
  IF p_secret = 'notification_secret_key_2026' THEN
    RETURN QUERY
    SELECT ps.subscription 
    FROM public.push_subscriptions ps
    WHERE ps.user_id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
