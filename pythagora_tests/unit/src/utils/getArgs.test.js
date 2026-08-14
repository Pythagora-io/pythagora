const originalProcessEnv = { ...process.env };

beforeEach(() => {
    jest.resetModules(); // this is important - it clears the cache
    process.env = { ...originalProcessEnv }; // restore the original env
});

afterAll(() => {
    process.env = originalProcessEnv; // restore original env after all tests
});

describe('PYTHAGORA_CONFIG parsing', () => {
    test('should parse environment variables correctly', () => {
        process.env.PYTHAGORA_CONFIG = '--var1 value1 --var2 value2 value3 --var3 --var4 value4';

        const args = require('../../../../src/utils/getArgs'); // path to your script

        expect(args).toHaveProperty('var1', 'value1');
        expect(args).toHaveProperty('var2', ['value2', 'value3']);
        expect(args).toHaveProperty('var3', true);
        expect(args).toHaveProperty('var4', 'value4');
    });

    test('should replace "-" with "_" in variable names', () => {
        process.env.PYTHAGORA_CONFIG = '--var-name value';

        const args = require('../../../../src/utils/getArgs'); // path to your script

        expect(args).toHaveProperty('var_name', 'value');
    });
});
