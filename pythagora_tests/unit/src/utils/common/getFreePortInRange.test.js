describe("getFreePortInRange", () => {
  const { getFreePortInRange } = require('../../../../../src/utils/common.js');

  test("should find a free port between valid min and max port range", async () => {
    const minPort = 4000;
    const maxPort = 5000;
    const freePort = await getFreePortInRange(minPort, maxPort);
    expect(freePort).toBeGreaterThanOrEqual(minPort);
    expect(freePort).toBeLessThanOrEqual(maxPort);
  });

  test("should find a free port in edge case of min and max being the same", async () => {
    const minAndMax = 4000;
    const freePort = await getFreePortInRange(minAndMax, minAndMax);
    expect(freePort).toBe(minAndMax);
  });

  test("should throw error for invalid min and max range", async () => {
    const invalidMinPort = 70000;
    const invalidMaxPort = 80000;
    await expect(getFreePortInRange(invalidMinPort, invalidMaxPort)).rejects.toThrow();
  });
});
