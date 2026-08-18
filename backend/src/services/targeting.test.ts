import { buildAgeBuckets, buildTargetingSpec, generateSubAudiences } from './targeting';

describe('buildAgeBuckets', () => {
  it('returns standard Meta age buckets within the requested range', () => {
    const buckets = buildAgeBuckets(18, 65);
    expect(buckets).toEqual([
      { min: 18, max: 24 },
      { min: 25, max: 34 },
      { min: 35, max: 44 },
      { min: 45, max: 54 },
      { min: 55, max: 64 },
      { min: 65, max: 65 },
    ]);
  });

  it('clamps buckets to a narrow age range', () => {
    const buckets = buildAgeBuckets(22, 40);
    expect(buckets).toEqual([
      { min: 22, max: 24 },
      { min: 25, max: 34 },
      { min: 35, max: 40 },
    ]);
  });
});

describe('buildTargetingSpec', () => {
  it('builds a Meta-compatible targeting spec with defaults', () => {
    const spec = buildTargetingSpec({
      ageMin: 18,
      ageMax: 40,
      countries: ['US', 'GB'],
      interests: [{ id: '123', name: 'Running' }],
    });
    expect(spec.age_min).toBe(18);
    expect(spec.age_max).toBe(40);
    expect(spec.genders).toEqual([1, 2]);
    expect(spec.geo_locations).toEqual({ countries: ['US', 'GB'] });
    expect(spec.publisher_platforms).toEqual(['facebook', 'instagram']);
  });
});

describe('generateSubAudiences', () => {
  it('generates the requested number of sub-audiences', () => {
    const subAudiences = generateSubAudiences(
      {
        ageMin: 25,
        ageMax: 54,
        genders: [1, 2],
        countries: ['US'],
      },
      4
    );
    expect(subAudiences).toHaveLength(4);
  });

  it('assigns interests round-robin and keeps age buckets ordered', () => {
    const subAudiences = generateSubAudiences(
      {
        ageMin: 18,
        ageMax: 24,
        genders: [1],
        countries: ['US'],
        interests: [{ id: 'a', name: 'Interest A' }, { id: 'b', name: 'Interest B' }],
      },
      2
    );
    expect(subAudiences[0].age_min).toBe(18);
    expect(subAudiences[0].interests?.map((i) => i.id)).toEqual(['a', 'b']);
  });
});
