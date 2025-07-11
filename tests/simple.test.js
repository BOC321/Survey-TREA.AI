// Simple test to verify Jest setup
describe('Jest Setup', () => {
  test('should run basic test', () => {
    expect(1 + 1).toBe(2);
  });

  test('should have mocked globals', () => {
    expect(global.fetch).toBeDefined();
    expect(global.localStorage).toBeDefined();
    expect(global.sessionStorage).toBeDefined();
  });

  test('should have window mock', () => {
    console.log('global.window:', global.window);
    console.log('global.AnalyticsConfig:', global.AnalyticsConfig);
    expect(global.window).toBeDefined();
    expect(global.AnalyticsConfig).toBeDefined();
  });
});