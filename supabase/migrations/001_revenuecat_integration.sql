-- Migration: RevenueCat Integration
-- Date: February 2026
-- Purpose: Add RevenueCat support for in-app purchases

-- =============================================
-- 1. ADD REVENUECAT ID TO USER PROFILES
-- =============================================
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS revenuecat_id TEXT UNIQUE;

-- =============================================
-- 2. ADD REVENUECAT EVENT ID TO CREDIT TRANSACTIONS
-- =============================================
ALTER TABLE credit_transactions
ADD COLUMN IF NOT EXISTS revenuecat_event_id TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_credit_transactions_revenuecat_event
ON credit_transactions(revenuecat_event_id)
WHERE revenuecat_event_id IS NOT NULL;

-- =============================================
-- 3. CREATE API REQUESTS TABLE FOR RATE LIMITING
-- =============================================
CREATE TABLE IF NOT EXISTS api_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
    endpoint TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE api_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own requests
CREATE POLICY "Users can view own api requests" ON api_requests
    FOR SELECT USING (auth.uid() = user_id);

-- Auto-cleanup: Delete requests older than 1 hour (for rate limiting efficiency)
CREATE INDEX IF NOT EXISTS idx_api_requests_cleanup
ON api_requests(created_at);

-- =============================================
-- 4. UPDATE CREDIT PACKAGES TO MATCH APP
-- =============================================
-- Remove old packages
DELETE FROM credit_packages WHERE id IN ('small_package', 'medium_package', 'large_package');

-- Insert new packages matching RevenueCat products
INSERT INTO credit_packages (id, name, description, credits_amount, price, bonus_credits, is_popular)
VALUES
    ('credits_20', 'Starter Pack', 'Perfect for trying our AI magic', 20, 2.49, 0, FALSE),
    ('credits_70', 'Popular Pack', 'Most popular - Best value!', 70, 6.49, 20, TRUE),
    ('credits_250', 'Pro Pack', 'For power users & professionals', 250, 15.99, 100, FALSE)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    credits_amount = EXCLUDED.credits_amount,
    price = EXCLUDED.price,
    bonus_credits = EXCLUDED.bonus_credits,
    is_popular = EXCLUDED.is_popular;

-- =============================================
-- 5. IDEMPOTENT ADD CREDITS FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION add_credits_idempotent(
    p_user_id UUID,
    p_credits_to_add INTEGER,
    p_description TEXT DEFAULT 'Credit purchase',
    p_revenuecat_event_id TEXT DEFAULT NULL,
    p_package_id TEXT DEFAULT NULL,
    p_transaction_ref TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    current_credits INTEGER;
    new_balance INTEGER;
BEGIN
    -- Idempotency check: if event ID provided and already processed, return success
    IF p_revenuecat_event_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM credit_transactions
            WHERE revenuecat_event_id = p_revenuecat_event_id
        ) THEN
            -- Already processed, return success
            RETURN TRUE;
        END IF;
    END IF;

    -- Get current credits
    SELECT credits INTO current_credits
    FROM user_profiles
    WHERE id = p_user_id;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

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
        transaction_reference,
        revenuecat_event_id
    ) VALUES (
        p_user_id,
        'purchase',
        p_credits_to_add,
        new_balance,
        p_description,
        p_package_id,
        p_transaction_ref,
        p_revenuecat_event_id
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 6. CLEANUP FUNCTION FOR OLD API REQUESTS
-- =============================================
CREATE OR REPLACE FUNCTION cleanup_old_api_requests()
RETURNS void AS $$
BEGIN
    DELETE FROM api_requests
    WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 7. GRANT EXECUTE PERMISSIONS
-- =============================================
GRANT EXECUTE ON FUNCTION add_credits_idempotent TO authenticated;
GRANT EXECUTE ON FUNCTION add_credits_idempotent TO service_role;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================
