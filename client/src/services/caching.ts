import { supabase } from '../supabaseClient';

interface CacheOptions {
  ttl: number;
  organisationId: string;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  organisationId: string;
}

class CachingService {
  private static instance: CachingService;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private prefetchQueue: Set<string> = new Set();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    // Clean up expired cache entries periodically
    setInterval(() => this.cleanExpiredEntries(), 60 * 1000);
  }

  public static getInstance(): CachingService {
    if (!CachingService.instance) {
      CachingService.instance = new CachingService();
    }
    return CachingService.instance;
  }

  private generateKey(key: string, organisationId: string): string {
    return `${organisationId}:${key}`;
  }

  private isExpired(entry: CacheEntry<any>, ttl: number): boolean {
    return Date.now() - entry.timestamp > ttl;
  }

  private cleanExpiredEntries() {
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry, this.DEFAULT_TTL)) {
        this.cache.delete(key);
      }
    }
  }

  public async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: Partial<CacheOptions> = {}
  ): Promise<T> {
    const organisationId = options.organisationId || 'default';
    const ttl = options.ttl || this.DEFAULT_TTL;
    const cacheKey = this.generateKey(key, organisationId);

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && !this.isExpired(cached, ttl)) {
      return cached.data as T;
    }

    // Fetch fresh data
    const data = await fetcher();
    this.set(key, data, { ttl, organisationId });
    return data;
  }

  public set<T>(
    key: string,
    data: T,
    options: Partial<CacheOptions> = {}
  ): void {
    const organisationId = options.organisationId || 'default';
    const cacheKey = this.generateKey(key, organisationId);

    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      organisationId,
    });
  }

  public invalidate(key: string, organisationId: string = 'default'): void {
    const cacheKey = this.generateKey(key, organisationId);
    this.cache.delete(cacheKey);
  }

  public invalidateByPrefix(
    prefix: string,
    organisationId: string = 'default'
  ): void {
    const prefixKey = this.generateKey(prefix, organisationId);
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefixKey)) {
        this.cache.delete(key);
      }
    }
  }

  public async prefetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: Partial<CacheOptions> = {}
  ): Promise<void> {
    const organisationId = options.organisationId || 'default';
    const cacheKey = this.generateKey(key, organisationId);

    // Avoid duplicate prefetch requests
    if (this.prefetchQueue.has(cacheKey)) {
      return;
    }

    this.prefetchQueue.add(cacheKey);

    try {
      const data = await fetcher();
      this.set(key, data, options);
    } finally {
      this.prefetchQueue.delete(cacheKey);
    }
  }

  public async getCampaignData(
    campaignId: string,
    organisationId: string
  ): Promise<any> {
    return this.get(
      `campaign:${campaignId}`,
      async () => {
        const { data, error } = await supabase
          .from('campaigns')
          .select('*, campaign_variations(*)')
          .eq('id', campaignId)
          .eq('organisation_id', organisationId)
          .single();

        if (error) throw error;
        return data;
      },
      { organisationId }
    );
  }

  public async getAssetsList(
    organisationId: string,
    options: { page: number; limit: number } = { page: 1, limit: 20 }
  ): Promise<any> {
    const key = `assets:list:${options.page}:${options.limit}`;
    return this.get(
      key,
      async () => {
        const { data, error } = await supabase
          .from('assets')
          .select('*')
          .eq('organisation_id', organisationId)
          .range(
            (options.page - 1) * options.limit,
            options.page * options.limit - 1
          )
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
      },
      { organisationId }
    );
  }

  public async prefetchCampaignAssets(
    campaignId: string,
    organisationId: string
  ): Promise<void> {
    await this.prefetch(
      `campaign:${campaignId}:assets`,
      async () => {
        const { data, error } = await supabase
          .from('assets')
          .select('*')
          .eq('campaign_id', campaignId)
          .eq('organisation_id', organisationId);

        if (error) throw error;
        return data;
      },
      { organisationId }
    );
  }

  public clearOrganisationCache(organisationId: string): void {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.organisationId === organisationId) {
        this.cache.delete(key);
      }
    }
  }
}

export const caching = CachingService.getInstance();
