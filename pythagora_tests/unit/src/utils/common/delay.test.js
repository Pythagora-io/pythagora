describe("Testing delay function", () => {
  test("Task is delayed correctly", async () => {
    const { delay } = require('../../../../../src/utils/common.js');
    const startTime = new Date();
    await delay(1000);
    const endTime = new Date();
    expect(endTime - startTime).toBeGreaterThanOrEqual(1000);
  });

  test("Task continues executing after delay", async () => {
    const { delay } = require('../../../../../src/utils/common.js');
    const startTime = new Date();
    await delay(1000);
    const executionTime = new Date() - startTime;
    await delay(1000);
    const endTime = new Date();
    expect(endTime - startTime).toBeGreaterThanOrEqual(executionTime + 1000);
  });

  test("Task executes immediately with zero delay", async () => {
    const { delay } = require('../../../../../src/utils/common.js');
    const startTime = new Date();
    await delay(0);
    const endTime = new Date();
    expect(endTime - startTime).toBeLessThanOrEqual(100);
  });

  test("Task throws error on negative delay value", async () => {
    const { delay } = require('../../../../../src/utils/common.js');
    await expect(() => delay(-1000)).rejects.toThrow("Delay must be a positive number");
  });
});
