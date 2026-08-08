-- SQL Schema for Agrimitra AI Supabase PostgreSQL Database

-- 1. Profiles Table (Farmer Information & Preferences)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  farmer_name TEXT NOT NULL DEFAULT 'Ramesh Kumar',
  phone TEXT,
  village TEXT,
  district TEXT DEFAULT 'Thanjavur',
  state TEXT DEFAULT 'Tamil Nadu',
  country TEXT DEFAULT 'India',
  farm_size TEXT DEFAULT '2.5 Acres',
  soil_type TEXT DEFAULT 'Clay Loam',
  primary_crop TEXT DEFAULT 'Paddy',
  language TEXT DEFAULT 'en',
  avatar_url TEXT,
  notification_pref BOOLEAN DEFAULT true,
  voice_pref BOOLEAN DEFAULT true,
  is_premium BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. Soil Logs Table
CREATE TABLE IF NOT EXISTS soil_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  ph NUMERIC(3,1) DEFAULT 6.8,
  nitrogen INTEGER DEFAULT 280,
  phosphorus INTEGER DEFAULT 18,
  potassium INTEGER DEFAULT 195,
  organic_carbon NUMERIC(3,2) DEFAULT 0.62,
  texture TEXT DEFAULT 'Clay Loam',
  moisture INTEGER DEFAULT 46,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE soil_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own soil logs" ON soil_logs
  FOR ALL USING (auth.uid() = user_id);

-- 3. Disease History Table
CREATE TABLE IF NOT EXISTS disease_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  image_url TEXT,
  crop_name TEXT NOT NULL,
  disease_name TEXT NOT NULL,
  confidence INTEGER DEFAULT 95,
  treatment TEXT,
  medicine TEXT,
  organic_solution TEXT,
  prevention TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE disease_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own disease history" ON disease_history
  FOR ALL USING (auth.uid() = user_id);

-- 4. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'Weather Alert',
  category TEXT DEFAULT 'weather',
  severity TEXT DEFAULT 'info',
  unread BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own notifications" ON notifications
  FOR ALL USING (auth.uid() = user_id);

-- 5. Chat History Table
CREATE TABLE IF NOT EXISTS chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own chat history" ON chat_history
  FOR ALL USING (auth.uid() = user_id);

-- 6. Trigger for auto-profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, farmer_name)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'farmer_name', 'Farmer'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
