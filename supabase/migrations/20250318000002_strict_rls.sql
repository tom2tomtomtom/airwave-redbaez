-- Drop development-mode policies
DROP POLICY IF EXISTS "Enable read access to all users" ON assets;
DROP POLICY IF EXISTS "Enable insert access to all users" ON assets;
DROP POLICY IF EXISTS "Enable update access to all users" ON assets;
DROP POLICY IF EXISTS "Enable delete access to all users" ON assets;

-- Strict RLS policies for assets table
CREATE POLICY "Organisation users can read their assets"
ON assets FOR SELECT
USING (
    auth.uid() IN (
        SELECT user_id 
        FROM user_organisations 
        WHERE organisation_id = assets.organisation_id
        AND is_active = true
    )
);

CREATE POLICY "Organisation users can create assets"
ON assets FOR INSERT
WITH CHECK (
    -- Verify organisation membership
    auth.uid() IN (
        SELECT user_id 
        FROM user_organisations 
        WHERE organisation_id = assets.organisation_id
        AND is_active = true
    )
    AND (
        -- Enforce file type validation
        type = ANY(ARRAY[
            'image/jpeg',
            'image/png',
            'image/gif',
            'video/mp4',
            'video/quicktime'
        ])
    )
    AND (
        -- Enforce size limit (100MB)
        size <= 104857600
    )
    AND (
        -- Rate limiting (100 uploads per hour)
        (
            SELECT COUNT(*)
            FROM assets a
            WHERE a.organisation_id = assets.organisation_id
            AND a.created_at > NOW() - INTERVAL '1 hour'
        ) < 100
    )
);

CREATE POLICY "Organisation users can update their assets"
ON assets FOR UPDATE
USING (
    -- Verify organisation membership
    auth.uid() IN (
        SELECT user_id 
        FROM user_organisations 
        WHERE organisation_id = assets.organisation_id
        AND is_active = true
    )
)
WITH CHECK (
    -- Prevent organisation_id changes
    OLD.organisation_id = NEW.organisation_id
    AND (
        -- Only allow updates to safe fields
        NEW.name IS NOT NULL
        AND NEW.name = OLD.name
        AND NEW.type = OLD.type
        AND NEW.size = OLD.size
    )
);

CREATE POLICY "Organisation users can delete their assets"
ON assets FOR DELETE
USING (
    -- Verify organisation membership and role
    auth.uid() IN (
        SELECT user_id 
        FROM user_organisations uo
        JOIN user_roles ur ON uo.user_id = ur.user_id
        WHERE uo.organisation_id = assets.organisation_id
        AND uo.is_active = true
        AND ur.role IN ('admin', 'manager')
    )
);

-- Enhanced audit logging
CREATE OR REPLACE FUNCTION log_asset_operations()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id uuid;
    v_organisation_id uuid;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    -- Get organisation context
    SELECT organisation_id INTO v_organisation_id
    FROM user_organisations
    WHERE user_id = v_user_id
    AND is_active = true
    LIMIT 1;

    -- Log operation
    INSERT INTO audit_logs (
        operation_id,
        table_name,
        record_id,
        operation_type,
        user_id,
        organisation_id,
        old_data,
        new_data,
        ip_address,
        user_agent
    ) VALUES (
        gen_random_uuid(),
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        v_user_id,
        v_organisation_id,
        CASE 
            WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)
            WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD)
            ELSE NULL
        END,
        CASE 
            WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW)
            ELSE NULL
        END,
        current_setting('request.headers')::json->>'x-forwarded-for',
        current_setting('request.headers')::json->>'user-agent'
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger to assets table
DROP TRIGGER IF EXISTS assets_audit_trigger ON assets;
CREATE TRIGGER assets_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON assets
    FOR EACH ROW EXECUTE FUNCTION log_asset_operations();

-- Rate limiting function
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_organisation_id uuid,
    p_action text,
    p_limit integer,
    p_window interval
)
RETURNS boolean AS $$
DECLARE
    v_count integer;
BEGIN
    SELECT COUNT(*)
    INTO v_count
    FROM audit_logs
    WHERE organisation_id = p_organisation_id
    AND operation_type = p_action
    AND created_at > NOW() - p_window;

    RETURN v_count < p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate asset data
CREATE OR REPLACE FUNCTION validate_asset()
RETURNS trigger AS $$
BEGIN
    -- Check file type
    IF NEW.type NOT IN (
        'image/jpeg',
        'image/png',
        'image/gif',
        'video/mp4',
        'video/quicktime'
    ) THEN
        RAISE EXCEPTION 'Invalid file type';
    END IF;

    -- Check file size
    IF NEW.size > 104857600 THEN -- 100MB
        RAISE EXCEPTION 'File size exceeds maximum limit of 100MB';
    END IF;

    -- Check rate limit
    IF NOT check_rate_limit(
        NEW.organisation_id,
        'INSERT',
        100,
        interval '1 hour'
    ) THEN
        RAISE EXCEPTION 'Upload rate limit exceeded';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply validation trigger
DROP TRIGGER IF EXISTS asset_validation_trigger ON assets;
CREATE TRIGGER asset_validation_trigger
    BEFORE INSERT ON assets
    FOR EACH ROW EXECUTE FUNCTION validate_asset();
