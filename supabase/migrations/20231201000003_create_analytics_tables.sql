-- Create analytics_events table
CREATE TABLE analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  variation_id UUID NOT NULL REFERENCES campaign_variations(id),
  platform_id UUID NOT NULL REFERENCES platforms(id),
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id TEXT,
  session_id TEXT,
  organisation_id UUID NOT NULL REFERENCES organisations(id)
);

-- Create analytics_metrics table for aggregated metrics
CREATE TABLE analytics_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  variation_id UUID REFERENCES campaign_variations(id),
  platform_id UUID REFERENCES platforms(id),
  segment_id UUID REFERENCES audience_segments(id),
  metric_type TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  organisation_id UUID NOT NULL REFERENCES organisations(id)
);

-- Create audience_segments table
CREATE TABLE audience_segments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  criteria JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  organisation_id UUID NOT NULL REFERENCES organisations(id)
);

-- Create indexes for better query performance
CREATE INDEX idx_analytics_events_campaign ON analytics_events(campaign_id);
CREATE INDEX idx_analytics_events_variation ON analytics_events(variation_id);
CREATE INDEX idx_analytics_events_platform ON analytics_events(platform_id);
CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_occurred ON analytics_events(occurred_at);
CREATE INDEX idx_analytics_events_org ON analytics_events(organisation_id);

CREATE INDEX idx_analytics_metrics_campaign ON analytics_metrics(campaign_id);
CREATE INDEX idx_analytics_metrics_variation ON analytics_metrics(variation_id);
CREATE INDEX idx_analytics_metrics_platform ON analytics_metrics(platform_id);
CREATE INDEX idx_analytics_metrics_segment ON analytics_metrics(segment_id);
CREATE INDEX idx_analytics_metrics_type ON analytics_metrics(metric_type);
CREATE INDEX idx_analytics_metrics_date ON analytics_metrics(metric_date);
CREATE INDEX idx_analytics_metrics_org ON analytics_metrics(organisation_id);

CREATE INDEX idx_audience_segments_campaign ON audience_segments(campaign_id);
CREATE INDEX idx_audience_segments_org ON audience_segments(organisation_id);

-- Enable RLS on all tables
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE audience_segments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for analytics_events

-- Policy for inserting events
CREATE POLICY "Service accounts can insert analytics events"
  ON analytics_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt() ->> 'role' = 'service_account' AND
    auth.jwt() ->> 'service' = 'analytics'
  );

-- Policy for viewing events
CREATE POLICY "Users can view analytics events for their organisation"
  ON analytics_events
  FOR SELECT
  TO authenticated
  USING (
    organisation_id IN (
      SELECT org_id 
      FROM user_organisations 
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for analytics_metrics

-- Policy for inserting metrics
CREATE POLICY "Service accounts can insert analytics metrics"
  ON analytics_metrics
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt() ->> 'role' = 'service_account' AND
    auth.jwt() ->> 'service' = 'analytics'
  );

-- Policy for viewing metrics
CREATE POLICY "Users can view analytics metrics for their organisation"
  ON analytics_metrics
  FOR SELECT
  TO authenticated
  USING (
    organisation_id IN (
      SELECT org_id 
      FROM user_organisations 
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for audience_segments

-- Policy for creating segments
CREATE POLICY "Users can create audience segments for their organisation"
  ON audience_segments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organisation_id IN (
      SELECT org_id 
      FROM user_organisations 
      WHERE user_id = auth.uid()
    )
  );

-- Policy for viewing segments
CREATE POLICY "Users can view audience segments for their organisation"
  ON audience_segments
  FOR SELECT
  TO authenticated
  USING (
    organisation_id IN (
      SELECT org_id 
      FROM user_organisations 
      WHERE user_id = auth.uid()
    )
  );

-- Policy for updating segments
CREATE POLICY "Users can update audience segments for their organisation"
  ON audience_segments
  FOR UPDATE
  TO authenticated
  USING (
    organisation_id IN (
      SELECT org_id 
      FROM user_organisations 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organisation_id IN (
      SELECT org_id 
      FROM user_organisations 
      WHERE user_id = auth.uid()
    )
  );

-- Policy for deleting segments
CREATE POLICY "Users can delete audience segments for their organisation"
  ON audience_segments
  FOR DELETE
  TO authenticated
  USING (
    organisation_id IN (
      SELECT org_id 
      FROM user_organisations 
      WHERE user_id = auth.uid()
    )
  );

-- Create functions for analytics queries

-- Function to get overall campaign metrics
CREATE OR REPLACE FUNCTION get_campaign_metrics(
  p_campaign_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_platforms UUID[] DEFAULT NULL,
  p_variations UUID[] DEFAULT NULL,
  p_segments UUID[] DEFAULT NULL
)
RETURNS TABLE (
  views BIGINT,
  completions BIGINT,
  clicks BIGINT,
  conversions BIGINT,
  share_rate NUMERIC,
  average_watch_time NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN metric_type = 'views' THEN metric_value::BIGINT ELSE 0 END), 0) as views,
    COALESCE(SUM(CASE WHEN metric_type = 'completions' THEN metric_value::BIGINT ELSE 0 END), 0) as completions,
    COALESCE(SUM(CASE WHEN metric_type = 'clicks' THEN metric_value::BIGINT ELSE 0 END), 0) as clicks,
    COALESCE(SUM(CASE WHEN metric_type = 'conversions' THEN metric_value::BIGINT ELSE 0 END), 0) as conversions,
    CASE 
      WHEN COALESCE(SUM(CASE WHEN metric_type = 'views' THEN metric_value ELSE 0 END), 0) > 0 
      THEN COALESCE(SUM(CASE WHEN metric_type = 'shares' THEN metric_value ELSE 0 END), 0) / 
           COALESCE(SUM(CASE WHEN metric_type = 'views' THEN metric_value ELSE 0 END), 1)
      ELSE 0
    END as share_rate,
    COALESCE(AVG(CASE WHEN metric_type = 'watch_time' THEN metric_value ELSE NULL END), 0) as average_watch_time
  FROM analytics_metrics
  WHERE campaign_id = p_campaign_id
    AND (p_start_date IS NULL OR metric_date >= p_start_date::DATE)
    AND (p_end_date IS NULL OR metric_date <= p_end_date::DATE)
    AND (p_platforms IS NULL OR platform_id = ANY(p_platforms))
    AND (p_variations IS NULL OR variation_id = ANY(p_variations))
    AND (p_segments IS NULL OR segment_id = ANY(p_segments));
END;
$$;

-- Function to get platform-specific metrics
CREATE OR REPLACE FUNCTION get_platform_metrics(
  p_campaign_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_platforms UUID[] DEFAULT NULL,
  p_variations UUID[] DEFAULT NULL,
  p_segments UUID[] DEFAULT NULL
)
RETURNS TABLE (
  platform_id UUID,
  platform_name TEXT,
  views BIGINT,
  completions BIGINT,
  clicks BIGINT,
  conversions BIGINT,
  share_rate NUMERIC,
  average_watch_time NUMERIC,
  cost_per_view NUMERIC,
  cost_per_click NUMERIC,
  cost_per_conversion NUMERIC,
  total_spend NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH platform_stats AS (
    SELECT
      am.platform_id,
      p.name as platform_name,
      SUM(CASE WHEN metric_type = 'views' THEN metric_value ELSE 0 END) as views,
      SUM(CASE WHEN metric_type = 'completions' THEN metric_value ELSE 0 END) as completions,
      SUM(CASE WHEN metric_type = 'clicks' THEN metric_value ELSE 0 END) as clicks,
      SUM(CASE WHEN metric_type = 'conversions' THEN metric_value ELSE 0 END) as conversions,
      SUM(CASE WHEN metric_type = 'spend' THEN metric_value ELSE 0 END) as spend,
      AVG(CASE WHEN metric_type = 'watch_time' THEN metric_value ELSE NULL END) as avg_watch_time
    FROM analytics_metrics am
    JOIN platforms p ON p.id = am.platform_id
    WHERE am.campaign_id = p_campaign_id
      AND (p_start_date IS NULL OR metric_date >= p_start_date::DATE)
      AND (p_end_date IS NULL OR metric_date <= p_end_date::DATE)
      AND (p_platforms IS NULL OR platform_id = ANY(p_platforms))
      AND (p_variations IS NULL OR variation_id = ANY(p_variations))
      AND (p_segments IS NULL OR segment_id = ANY(p_segments))
    GROUP BY am.platform_id, p.name
  )
  SELECT
    ps.platform_id,
    ps.platform_name,
    ps.views::BIGINT,
    ps.completions::BIGINT,
    ps.clicks::BIGINT,
    ps.conversions::BIGINT,
    CASE 
      WHEN ps.views > 0 THEN ps.completions::NUMERIC / ps.views
      ELSE 0
    END as share_rate,
    ps.avg_watch_time,
    CASE 
      WHEN ps.views > 0 THEN ps.spend / ps.views
      ELSE 0
    END as cost_per_view,
    CASE 
      WHEN ps.clicks > 0 THEN ps.spend / ps.clicks
      ELSE 0
    END as cost_per_click,
    CASE 
      WHEN ps.conversions > 0 THEN ps.spend / ps.conversions
      ELSE 0
    END as cost_per_conversion,
    ps.spend as total_spend
  FROM platform_stats ps;
END;
$$;

-- Function to get variation-specific metrics
CREATE OR REPLACE FUNCTION get_variation_metrics(
  p_campaign_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_platforms UUID[] DEFAULT NULL,
  p_variations UUID[] DEFAULT NULL,
  p_segments UUID[] DEFAULT NULL
)
RETURNS TABLE (
  variation_id UUID,
  variation_name TEXT,
  views BIGINT,
  completions BIGINT,
  clicks BIGINT,
  conversions BIGINT,
  share_rate NUMERIC,
  average_watch_time NUMERIC,
  performance NUMERIC,
  confidence_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH variation_stats AS (
    SELECT
      am.variation_id,
      cv.name as variation_name,
      SUM(CASE WHEN metric_type = 'views' THEN metric_value ELSE 0 END) as views,
      SUM(CASE WHEN metric_type = 'completions' THEN metric_value ELSE 0 END) as completions,
      SUM(CASE WHEN metric_type = 'clicks' THEN metric_value ELSE 0 END) as clicks,
      SUM(CASE WHEN metric_type = 'conversions' THEN metric_value ELSE 0 END) as conversions,
      AVG(CASE WHEN metric_type = 'watch_time' THEN metric_value ELSE NULL END) as avg_watch_time
    FROM analytics_metrics am
    JOIN campaign_variations cv ON cv.id = am.variation_id
    WHERE am.campaign_id = p_campaign_id
      AND (p_start_date IS NULL OR metric_date >= p_start_date::DATE)
      AND (p_end_date IS NULL OR metric_date <= p_end_date::DATE)
      AND (p_platforms IS NULL OR platform_id = ANY(p_platforms))
      AND (p_variations IS NULL OR variation_id = ANY(p_variations))
      AND (p_segments IS NULL OR segment_id = ANY(p_segments))
    GROUP BY am.variation_id, cv.name
  )
  SELECT
    vs.variation_id,
    vs.variation_name,
    vs.views::BIGINT,
    vs.completions::BIGINT,
    vs.clicks::BIGINT,
    vs.conversions::BIGINT,
    CASE 
      WHEN vs.views > 0 THEN vs.completions::NUMERIC / vs.views
      ELSE 0
    END as share_rate,
    vs.avg_watch_time,
    -- Performance score (example formula)
    (
      (vs.completions::NUMERIC / NULLIF(vs.views, 0) * 0.3) +
      (vs.clicks::NUMERIC / NULLIF(vs.views, 0) * 0.3) +
      (vs.conversions::NUMERIC / NULLIF(vs.clicks, 0) * 0.4)
    ) * 100 as performance,
    -- Confidence score based on sample size (example formula)
    LEAST(
      100,
      GREATEST(
        0,
        (LN(GREATEST(vs.views, 1))::NUMERIC / LN(1000)) * 100
      )
    ) as confidence_score
  FROM variation_stats vs;
END;
$$;

-- Function to get audience segment metrics
CREATE OR REPLACE FUNCTION get_audience_segments(
  p_campaign_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_platforms UUID[] DEFAULT NULL,
  p_variations UUID[] DEFAULT NULL,
  p_segments UUID[] DEFAULT NULL
)
RETURNS TABLE (
  segment_id UUID,
  segment_name TEXT,
  segment_size BIGINT,
  views BIGINT,
  completions BIGINT,
  clicks BIGINT,
  conversions BIGINT,
  share_rate NUMERIC,
  average_watch_time NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH segment_stats AS (
    SELECT
      am.segment_id,
      ase.name as segment_name,
      SUM(CASE WHEN metric_type = 'segment_size' THEN metric_value ELSE 0 END) as segment_size,
      SUM(CASE WHEN metric_type = 'views' THEN metric_value ELSE 0 END) as views,
      SUM(CASE WHEN metric_type = 'completions' THEN metric_value ELSE 0 END) as completions,
      SUM(CASE WHEN metric_type = 'clicks' THEN metric_value ELSE 0 END) as clicks,
      SUM(CASE WHEN metric_type = 'conversions' THEN metric_value ELSE 0 END) as conversions,
      AVG(CASE WHEN metric_type = 'watch_time' THEN metric_value ELSE NULL END) as avg_watch_time
    FROM analytics_metrics am
    JOIN audience_segments ase ON ase.id = am.segment_id
    WHERE am.campaign_id = p_campaign_id
      AND (p_start_date IS NULL OR metric_date >= p_start_date::DATE)
      AND (p_end_date IS NULL OR metric_date <= p_end_date::DATE)
      AND (p_platforms IS NULL OR platform_id = ANY(p_platforms))
      AND (p_variations IS NULL OR variation_id = ANY(p_variations))
      AND (p_segments IS NULL OR segment_id = ANY(p_segments))
    GROUP BY am.segment_id, ase.name
  )
  SELECT
    ss.segment_id,
    ss.segment_name,
    ss.segment_size::BIGINT,
    ss.views::BIGINT,
    ss.completions::BIGINT,
    ss.clicks::BIGINT,
    ss.conversions::BIGINT,
    CASE 
      WHEN ss.views > 0 THEN ss.completions::NUMERIC / ss.views
      ELSE 0
    END as share_rate,
    ss.avg_watch_time
  FROM segment_stats ss;
END;
$$;

-- Function to get time series data
CREATE OR REPLACE FUNCTION get_timeseries_data(
  p_campaign_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_platforms UUID[] DEFAULT NULL,
  p_variations UUID[] DEFAULT NULL,
  p_segments UUID[] DEFAULT NULL
)
RETURNS TABLE (
  metric_date DATE,
  views BIGINT,
  completions BIGINT,
  clicks BIGINT,
  conversions BIGINT,
  share_rate NUMERIC,
  average_watch_time NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    am.metric_date,
    SUM(CASE WHEN metric_type = 'views' THEN metric_value::BIGINT ELSE 0 END) as views,
    SUM(CASE WHEN metric_type = 'completions' THEN metric_value::BIGINT ELSE 0 END) as completions,
    SUM(CASE WHEN metric_type = 'clicks' THEN metric_value::BIGINT ELSE 0 END) as clicks,
    SUM(CASE WHEN metric_type = 'conversions' THEN metric_value::BIGINT ELSE 0 END) as conversions,
    CASE 
      WHEN SUM(CASE WHEN metric_type = 'views' THEN metric_value ELSE 0 END) > 0 
      THEN SUM(CASE WHEN metric_type = 'completions' THEN metric_value ELSE 0 END)::NUMERIC / 
           SUM(CASE WHEN metric_type = 'views' THEN metric_value ELSE 0 END)
      ELSE 0
    END as share_rate,
    AVG(CASE WHEN metric_type = 'watch_time' THEN metric_value ELSE NULL END) as average_watch_time
  FROM analytics_metrics am
  WHERE campaign_id = p_campaign_id
    AND (p_start_date IS NULL OR metric_date >= p_start_date::DATE)
    AND (p_end_date IS NULL OR metric_date <= p_end_date::DATE)
    AND (p_platforms IS NULL OR platform_id = ANY(p_platforms))
    AND (p_variations IS NULL OR variation_id = ANY(p_variations))
    AND (p_segments IS NULL OR segment_id = ANY(p_segments))
  GROUP BY am.metric_date
  ORDER BY am.metric_date;
END;
$$;
