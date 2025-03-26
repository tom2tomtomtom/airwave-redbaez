-- Enable RLS on all tables
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Organisation users can view their assets" ON assets;
DROP POLICY IF EXISTS "Organisation users can create assets" ON assets;
DROP POLICY IF EXISTS "Organisation users can update their assets" ON assets;
DROP POLICY IF EXISTS "Organisation users can delete their assets" ON assets;

-- Asset policies
CREATE POLICY "Organisation users can view their assets"
ON assets FOR SELECT
USING (
    auth.uid() IN (
        SELECT user_id 
        FROM user_organisations 
        WHERE organisation_id = assets.organisation_id
    )
);

CREATE POLICY "Organisation users can create assets"
ON assets FOR INSERT
WITH CHECK (
    auth.uid() IN (
        SELECT user_id 
        FROM user_organisations 
        WHERE organisation_id = assets.organisation_id
    )
    AND (
        -- File type validation
        type = ANY(ARRAY[
            'image/jpeg',
            'image/png',
            'image/gif',
            'video/mp4',
            'video/quicktime'
        ])
    )
    AND (
        -- Size limit (100MB)
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
    auth.uid() IN (
        SELECT user_id 
        FROM user_organisations 
        WHERE organisation_id = assets.organisation_id
    )
)
WITH CHECK (
    auth.uid() IN (
        SELECT user_id 
        FROM user_organisations 
        WHERE organisation_id = assets.organisation_id
    )
);

CREATE POLICY "Organisation users can delete their assets"
ON assets FOR DELETE
USING (
    auth.uid() IN (
        SELECT user_id 
        FROM user_organisations 
        WHERE organisation_id = assets.organisation_id
    )
);

-- Audit logging trigger
CREATE OR REPLACE FUNCTION log_asset_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (
        record_id,
        table_name,
        action,
        organisation_id,
        user_id,
        old_data,
        new_data
    ) VALUES (
        COALESCE(NEW.id, OLD.id),
        TG_TABLE_NAME,
        TG_OP,
        COALESCE(NEW.organisation_id, OLD.organisation_id),
        auth.uid(),
        CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS asset_audit_trigger ON assets;
CREATE TRIGGER asset_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON assets
    FOR EACH ROW EXECUTE FUNCTION log_asset_changes();

-- Campaign policies
CREATE POLICY "Organisation users can view their campaigns"
ON campaigns FOR SELECT
USING (
    auth.uid() IN (
        SELECT user_id 
        FROM user_organisations 
        WHERE organisation_id = campaigns.organisation_id
    )
);

CREATE POLICY "Organisation users can create campaigns"
ON campaigns FOR INSERT
WITH CHECK (
    auth.uid() IN (
        SELECT user_id 
        FROM user_organisations 
        WHERE organisation_id = campaigns.organisation_id
    )
);

CREATE POLICY "Organisation users can update their campaigns"
ON campaigns FOR UPDATE
USING (
    auth.uid() IN (
        SELECT user_id 
        FROM user_organisations 
        WHERE organisation_id = campaigns.organisation_id
    )
)
WITH CHECK (
    auth.uid() IN (
        SELECT user_id 
        FROM user_organisations 
        WHERE organisation_id = campaigns.organisation_id
    )
);

CREATE POLICY "Organisation users can delete their campaigns"
ON campaigns FOR DELETE
USING (
    auth.uid() IN (
        SELECT user_id 
        FROM user_organisations 
        WHERE organisation_id = campaigns.organisation_id
    )
);

-- Brief policies
CREATE POLICY "Organisation users can view their briefs"
ON briefs FOR SELECT
USING (
    auth.uid() IN (
        SELECT user_id 
        FROM user_organisations 
        WHERE organisation_id = briefs.organisation_id
    )
);

CREATE POLICY "Organisation users can create briefs"
ON briefs FOR INSERT
WITH CHECK (
    auth.uid() IN (
        SELECT user_id 
        FROM user_organisations 
        WHERE organisation_id = briefs.organisation_id
    )
);

CREATE POLICY "Organisation users can update their briefs"
ON briefs FOR UPDATE
USING (
    auth.uid() IN (
        SELECT user_id 
        FROM user_organisations 
        WHERE organisation_id = briefs.organisation_id
    )
)
WITH CHECK (
    auth.uid() IN (
        SELECT user_id 
        FROM user_organisations 
        WHERE organisation_id = briefs.organisation_id
    )
);

CREATE POLICY "Organisation users can delete their briefs"
ON briefs FOR DELETE
USING (
    auth.uid() IN (
        SELECT user_id 
        FROM user_organisations 
        WHERE organisation_id = briefs.organisation_id
    )
);

-- Audit log policies
CREATE POLICY "Organisation users can view their audit logs"
ON audit_logs FOR SELECT
USING (
    auth.uid() IN (
        SELECT user_id 
        FROM user_organisations 
        WHERE organisation_id = audit_logs.organisation_id
    )
);

-- Audit logs are insert-only through triggers
CREATE POLICY "System can create audit logs"
ON audit_logs FOR INSERT
WITH CHECK (true);

-- No direct updates or deletes of audit logs
CREATE POLICY "No audit log modifications"
ON audit_logs FOR UPDATE
USING (false);

CREATE POLICY "No audit log deletions"
ON audit_logs FOR DELETE
USING (false);
