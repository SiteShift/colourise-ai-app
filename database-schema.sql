-- AI Colorizer App - Complete Database Schema for Supabase (Credits-Only Model)
-- Run these SQL commands in your Supabase SQL Editor

-- =============================================
-- 1. USER PROFILES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    credits INTEGER DEFAULT 5 NOT NULL,
    last_active_date DATE DEFAULT CURRENT_DATE,
    streak_count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policies for user_profiles
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- =============================================
-- 2. USER IMAGES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS user_images (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
    original_image_url TEXT NOT NULL,
    colorized_image_url TEXT,
    image_title TEXT DEFAULT 'Colorized',
    processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    image_type TEXT DEFAULT 'colorization' CHECK (image_type IN ('colorization', 'face_enhancement', 'upscaling', 'scene_builder')),
    credits_used INTEGER DEFAULT 1,
    is_public BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_images ENABLE ROW LEVEL SECURITY;

-- Policies for user_images
CREATE POLICY "Users can view own images" ON user_images
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own images" ON user_images
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own images" ON user_images
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own images" ON user_images
    FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- 3. CREDIT TRANSACTIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'usage', 'bonus', 'refund')),
    credits_amount INTEGER NOT NULL,
    credits_balance_after INTEGER NOT NULL,
    description TEXT,
    related_image_id UUID REFERENCES user_images(id) ON DELETE SET NULL,
    purchase_package_id TEXT,
    transaction_reference TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Policies for credit_transactions
CREATE POLICY "Users can view own transactions" ON credit_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON credit_transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- 4. USER ACTIVITY TABLE (for streak tracking)
-- =============================================
CREATE TABLE IF NOT EXISTS user_activity (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
    activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
    activity_type TEXT DEFAULT 'login' CHECK (activity_type IN ('login', 'image_upload', 'image_colorize', 'credit_purchase')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, activity_date, activity_type)
);

-- Enable RLS
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

-- Policies for user_activity
CREATE POLICY "Users can view own activity" ON user_activity
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity" ON user_activity
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- 5. CREDIT PACKAGES TABLE (for purchases)
-- =============================================
CREATE TABLE IF NOT EXISTS credit_packages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    credits_amount INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    bonus_credits INTEGER DEFAULT 0,
    is_popular BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE credit_packages ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read credit packages
CREATE POLICY "Anyone can view credit packages" ON credit_packages
    FOR SELECT TO authenticated USING (TRUE);

-- Insert default credit packages
INSERT INTO credit_packages (id, name, description, credits_amount, price, bonus_credits, is_popular) VALUES
('small_package', 'Starter Pack', 'Perfect for small projects', 10, 4.99, 0, FALSE),
('medium_package', 'Popular Pack', 'Most popular choice', 25, 9.99, 5, TRUE),
('large_package', 'Value Pack', 'Best value for bulk projects', 50, 16.99, 15, FALSE)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 6. FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS create_user_profile_trigger ON auth.users;
CREATE TRIGGER create_user_profile_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- Function to update user streak
CREATE OR REPLACE FUNCTION update_user_streak()
RETURNS TRIGGER AS $$
DECLARE
    last_activity_date DATE;
    current_streak INTEGER;
BEGIN
    -- Get the user's last activity date and current streak
    SELECT last_active_date, streak_count 
    INTO last_activity_date, current_streak
    FROM user_profiles 
    WHERE id = NEW.user_id;
    
    -- If activity is for today, no need to update
    IF last_activity_date = CURRENT_DATE THEN
        RETURN NEW;
    END IF;
    
    -- Calculate new streak
    IF last_activity_date = CURRENT_DATE - INTERVAL '1 day' THEN
        -- Consecutive day, increment streak
        current_streak := current_streak + 1;
    ELSE
        -- Streak broken, reset to 1
        current_streak := 1;
    END IF;
    
    -- Update user profile
    UPDATE user_profiles 
    SET last_active_date = CURRENT_DATE,
        streak_count = current_streak,
        updated_at = NOW()
    WHERE id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update streak on activity
DROP TRIGGER IF EXISTS update_user_streak_trigger ON user_activity;
CREATE TRIGGER update_user_streak_trigger
    AFTER INSERT ON user_activity
    FOR EACH ROW EXECUTE FUNCTION update_user_streak();

-- Function to deduct credits and log transaction
CREATE OR REPLACE FUNCTION use_credits(
    p_user_id UUID,
    p_credits_to_use INTEGER,
    p_description TEXT DEFAULT 'Image processing',
    p_image_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    current_credits INTEGER;
    new_balance INTEGER;
BEGIN
    -- Get current credits
    SELECT credits INTO current_credits
    FROM user_profiles
    WHERE id = p_user_id;
    
    -- Check if user has enough credits
    IF current_credits < p_credits_to_use THEN
        RETURN FALSE;
    END IF;
    
    -- Calculate new balance
    new_balance := current_credits - p_credits_to_use;
    
    -- Update user credits
    UPDATE user_profiles
    SET credits = new_balance,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Log the transaction
    INSERT INTO credit_transactions (
        user_id,
        transaction_type,
        credits_amount,
        credits_balance_after,
        description,
        related_image_id
    ) VALUES (
        p_user_id,
        'usage',
        -p_credits_to_use,
        new_balance,
        p_description,
        p_image_id
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add credits (for purchases)
CREATE OR REPLACE FUNCTION add_credits(
    p_user_id UUID,
    p_credits_to_add INTEGER,
    p_description TEXT DEFAULT 'Credit purchase',
    p_package_id TEXT DEFAULT NULL,
    p_transaction_ref TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    current_credits INTEGER;
    new_balance INTEGER;
BEGIN
    -- Get current credits
    SELECT credits INTO current_credits
    FROM user_profiles
    WHERE id = p_user_id;
    
    -- Calculate new balance
    new_balance := current_credits + p_credits_to_add;
    
    -- Update user credits
    UPDATE user_profiles
    SET credits = new_balance,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Log the transaction
    INSERT INTO credit_transactions (
        user_id,
        transaction_type,
        credits_amount,
        credits_balance_after,
        description,
        purchase_package_id,
        transaction_reference
    ) VALUES (
        p_user_id,
        'purchase',
        p_credits_to_add,
        new_balance,
        p_description,
        p_package_id,
        p_transaction_ref
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 7. STORAGE BUCKETS
-- =============================================

-- Create storage buckets for images
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('original-images', 'original-images', FALSE),
    ('colorized-images', 'colorized-images', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for original images
CREATE POLICY "Users can upload original images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'original-images' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view own original images" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'original-images' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete own original images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'original-images' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Storage policies for colorized images
CREATE POLICY "Users can upload colorized images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'colorized-images' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view own colorized images" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'colorized-images' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete own colorized images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'colorized-images' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- =============================================
-- 8. INDEXES FOR PERFORMANCE
-- =============================================

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_images_user_id ON user_images(user_id);
CREATE INDEX IF NOT EXISTS idx_user_images_created_at ON user_images(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_images_status ON user_images(processing_status);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_user_date ON user_activity(user_id, activity_date);

-- =============================================
-- 9. VIEWS FOR EASY QUERYING
-- =============================================

-- View for user stats
CREATE OR REPLACE VIEW user_stats AS
SELECT 
    up.id,
    up.full_name,
    up.email,
    up.credits,
    up.streak_count,
    up.last_active_date,
    COUNT(ui.id) as total_images,
    COUNT(CASE WHEN ui.created_at > NOW() - INTERVAL '30 days' THEN 1 END) as images_this_month,
    COALESCE(SUM(ct.credits_amount) FILTER (WHERE ct.transaction_type = 'purchase'), 0) as total_credits_purchased,
    COALESCE(SUM(ABS(ct.credits_amount)) FILTER (WHERE ct.transaction_type = 'usage'), 0) as total_credits_used
FROM user_profiles up
LEFT JOIN user_images ui ON up.id = ui.user_id
LEFT JOIN credit_transactions ct ON up.id = ct.user_id
GROUP BY up.id, up.full_name, up.email, up.credits, up.streak_count, up.last_active_date;

-- =============================================
-- COMPLETE! 
-- =============================================

-- Summary of what was created:
-- 1. user_profiles - Core user data with credits (NO SUBSCRIPTION FIELDS)
-- 2. user_images - Image metadata and processing status
-- 3. credit_transactions - Track all credit movements
-- 4. user_activity - For streak tracking and analytics
-- 5. credit_packages - Credit purchase packages (one-time purchases only)
-- 6. Storage buckets and policies for image files
-- 7. Functions for credit management and user creation
-- 8. Triggers for automatic profile creation and streak updates
-- 9. Indexes and views for performance and analytics 