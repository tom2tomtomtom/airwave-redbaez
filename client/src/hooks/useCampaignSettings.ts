import { useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export interface CampaignSettings {
  name: string;
  objective: string;
  targetAudience: string;
  platforms: string[];
  dimensions: {
    width: number;
    height: number;
  };
  duration: number;
  optimiseForMobile: boolean;
  brandSafetyChecks: boolean;
  autoGenerateSubtitles: boolean;
}

interface UseCampaignSettingsProps {
  campaignId: string;
  initialSettings?: CampaignSettings;
}

const defaultSettings: CampaignSettings = {
  name: '',
  objective: '',
  targetAudience: '',
  platforms: [],
  dimensions: {
    width: 1920,
    height: 1080,
  },
  duration: 30,
  optimiseForMobile: true,
  brandSafetyChecks: true,
  autoGenerateSubtitles: false,
};

export const useCampaignSettings = ({ campaignId, initialSettings }: UseCampaignSettingsProps) => {
  const [settings, setSettings] = useState<CampaignSettings>(initialSettings || defaultSettings);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('campaign_settings')
        .select('*')
        .eq('campaign_id', campaignId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to load campaign settings: ${fetchError.message}`);
      }

      if (data) {
        setSettings(data.settings);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load settings';
      setError(errorMessage);
      console.error('Error loading campaign settings:', err);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  const saveSettings = useCallback(async (newSettings: CampaignSettings) => {
    try {
      setLoading(true);
      setError(null);

      // First check if settings exist for this campaign
      const { data: existingSettings } = await supabase
        .from('campaign_settings')
        .select('id')
        .eq('campaign_id', campaignId)
        .single();

      let result;
      
      if (existingSettings) {
        // Update existing settings
        result = await supabase
          .from('campaign_settings')
          .update({
            settings: newSettings,
            updated_at: new Date().toISOString(),
          })
          .eq('campaign_id', campaignId)
          .select()
          .single();
      } else {
        // Insert new settings
        result = await supabase
          .from('campaign_settings')
          .insert([
            {
              campaign_id: campaignId,
              settings: newSettings,
            },
          ])
          .select()
          .single();
      }

      if (result.error) {
        throw new Error(`Failed to save campaign settings: ${result.error.message}`);
      }

      setSettings(newSettings);
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save settings';
      setError(errorMessage);
      console.error('Error saving campaign settings:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  const updateSettings = useCallback((newSettings: Partial<CampaignSettings>) => {
    setSettings((prevSettings) => ({
      ...prevSettings,
      ...newSettings,
    }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
    setError(null);
  }, []);

  const validateSettings = useCallback((settingsToValidate: CampaignSettings): string[] => {
    const errors: string[] = [];

    if (!settingsToValidate.name) {
      errors.push('Campaign name is required');
    }

    if (!settingsToValidate.objective) {
      errors.push('Campaign objective is required');
    }

    if (!settingsToValidate.targetAudience) {
      errors.push('Target audience is required');
    }

    if (settingsToValidate.platforms.length === 0) {
      errors.push('At least one platform must be selected');
    }

    if (settingsToValidate.dimensions.width < 1 || settingsToValidate.dimensions.height < 1) {
      errors.push('Invalid dimensions specified');
    }

    if (settingsToValidate.duration < 1) {
      errors.push('Duration must be greater than 0 seconds');
    }

    return errors;
  }, []);

  const getPlatformDefaults = useCallback((platform: string) => {
    const defaults: Record<string, { width: number; height: number; duration: number }> = {
      youtube: {
        width: 1920,
        height: 1080,
        duration: 30,
      },
      meta: {
        width: 1080,
        height: 1080,
        duration: 15,
      },
      tiktok: {
        width: 1080,
        height: 1920,
        duration: 60,
      },
      linkedin: {
        width: 1920,
        height: 1080,
        duration: 30,
      },
      twitter: {
        width: 1600,
        height: 900,
        duration: 30,
      },
    };

    return defaults[platform] || defaults.youtube;
  }, []);

  const optimiseForPlatform = useCallback((platform: string) => {
    const platformDefaults = getPlatformDefaults(platform);
    
    updateSettings({
      dimensions: {
        width: platformDefaults.width,
        height: platformDefaults.height,
      },
      duration: platformDefaults.duration,
    });
  }, [getPlatformDefaults, updateSettings]);

  return {
    settings,
    loading,
    error,
    loadSettings,
    saveSettings,
    updateSettings,
    resetSettings,
    validateSettings,
    optimiseForPlatform,
  };
};

export type CampaignSettingsHook = ReturnType<typeof useCampaignSettings>;
