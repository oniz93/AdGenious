export interface TargetingSpec {
  age_min: number;
  age_max: number;
  genders?: number[];
  geo_locations?: Record<string, unknown>;
  interests?: Array<{ id: string; name?: string }>;
  behaviors?: Array<{ id: string; name?: string }>;
  publisher_platforms?: string[];
  facebook_positions?: string[];
  instagram_positions?: string[];
  device_platforms?: string[];
}

export interface BroadAudience {
  ageMin: number;
  ageMax: number;
  genders?: number[];
  countries?: string[];
  interests?: Array<{ id: string; name?: string }>;
  behaviors?: Array<{ id: string; name?: string }>;
  publisherPlatforms?: string[];
  facebookPositions?: string[];
  instagramPositions?: string[];
}

const DEFAULT_PLATFORMS = ['facebook', 'instagram'];
const DEFAULT_FACEBOOK_POSITIONS = ['feed'];
const DEFAULT_INSTAGRAM_POSITIONS = ['stream'];

function clampAge(age: number, min = 18, max = 65): number {
  return Math.min(max, Math.max(min, age));
}

export function buildAgeBuckets(ageMin: number, ageMax: number): Array<{ min: number; max: number }> {
  const min = clampAge(ageMin);
  const max = clampAge(ageMax);
  const buckets: Array<{ min: number; max: number }> = [];

  const standardBuckets: Array<{ min: number; max: number }> = [
    { min: 18, max: 24 },
    { min: 25, max: 34 },
    { min: 35, max: 44 },
    { min: 45, max: 54 },
    { min: 55, max: 64 },
    { min: 65, max: 65 },
  ];

  for (const bucket of standardBuckets) {
    if (bucket.max < min) continue;
    if (bucket.min > max) break;
    buckets.push({ min: Math.max(min, bucket.min), max: Math.min(max, bucket.max) });
  }

  if (buckets.length === 0) {
    buckets.push({ min, max });
  }
  return buckets;
}

export function buildTargetingSpec(audience: BroadAudience, overrides: Partial<TargetingSpec> = {}): TargetingSpec {
  const spec: TargetingSpec = {
    age_min: clampAge(audience.ageMin),
    age_max: clampAge(audience.ageMax),
    genders: audience.genders && audience.genders.length > 0 ? audience.genders : [1, 2],
    geo_locations: audience.countries && audience.countries.length > 0 ? { countries: audience.countries } : undefined,
    interests: audience.interests && audience.interests.length > 0 ? audience.interests : undefined,
    behaviors: audience.behaviors && audience.behaviors.length > 0 ? audience.behaviors : undefined,
    publisher_platforms: audience.publisherPlatforms ?? DEFAULT_PLATFORMS,
    facebook_positions: audience.facebookPositions ?? DEFAULT_FACEBOOK_POSITIONS,
    instagram_positions: audience.instagramPositions ?? DEFAULT_INSTAGRAM_POSITIONS,
    device_platforms: ['mobile', 'desktop'],
  };
  return { ...spec, ...overrides };
}

export function generateSubAudiences(audience: BroadAudience, count = 6): TargetingSpec[] {
  const buckets = buildAgeBuckets(audience.ageMin, audience.ageMax);
  const genders = audience.genders && audience.genders.length > 0 ? audience.genders : [1, 2];
  const interests = audience.interests ?? [];
  const result: TargetingSpec[] = [];

  let interestIndex = 0;
  for (const bucket of buckets) {
    for (const gender of genders) {
      if (result.length >= count) break;

      const spec = buildTargetingSpec(audience, {
        age_min: bucket.min,
        age_max: bucket.max,
        genders: [gender],
      });

      if (interests.length > 0) {
        const picked = [interests[interestIndex % interests.length]];
        if (interests.length > 1) {
          picked.push(interests[(interestIndex + 1) % interests.length]);
        }
        spec.interests = picked;
        interestIndex += 1;
      }

      result.push(spec);
    }
    if (result.length >= count) break;
  }

  return result;
}
