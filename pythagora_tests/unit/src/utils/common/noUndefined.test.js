describe('noUndefined', () => {
  test('returns value if value is not undefined or null', () => {
    const { noUndefined } = require('../../../../../src/utils/common.js');
    expect(noUndefined(1)).toBe(1);
    expect(noUndefined("test")).toBe("test");
    expect(noUndefined(true)).toBe(true);
    expect(noUndefined(false)).toBe(false);
    expect(noUndefined({ a: 1 })).toEqual({ a: 1 });
  });

  test('returns replaceValue if value is undefined', () => {
    const { noUndefined } = require('../../../../../src/utils/common.js');
    expect(noUndefined(undefined)).toEqual({});
    expect(noUndefined(undefined, -1)).toBe(-1);
  });

  test('returns replaceValue if value is null', () => {
    const { noUndefined } = require('../../../../../src/utils/common.js');
    expect(noUndefined(null)).toEqual({});
    expect(noUndefined(null, -1)).toBe(-1);
  });

  test('returns empty object if value is undefined and replaceValue is undefined', () => {
    const { noUndefined } = require('../../../../../src/utils/common.js');
    expect(noUndefined(undefined, undefined)).toEqual({});
  });

  test('returns empty object as default replaceValue when not provided', () => {
    const { noUndefined } = require('../../../../../src/utils/common.js');
    expect(noUndefined(null)).toEqual({});
    expect(noUndefined(undefined)).toEqual({});
  });
});