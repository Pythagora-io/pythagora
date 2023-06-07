describe('compareJsonDetailed tests', () => {
  test('should return empty differences for the same primitive types', () => {
    const { compareJsonDetailed } = require('../../../../../src/utils/common.js');
    const result = compareJsonDetailed(5, 5);
    expect(result).toEqual({ capture: {}, test: {} });
  });

  test('should return empty differences for the same objects', () => {
    const { compareJsonDetailed } = require('../../../../../src/utils/common.js');
    const result = compareJsonDetailed({ a: 'test', b: 3 }, { a: 'test', b: 3 });
    expect(result).toEqual({ capture: {}, test: {} });
  });

  test('should return empty differences for the same arrays', () => {
    const { compareJsonDetailed } = require('../../../../../src/utils/common.js');
    const result = compareJsonDetailed([1, 2, 3], [1, 2, 3]);
    expect(result).toEqual({ capture: {}, test: {} });
  });

  test('should return differences for different primitive types', () => {
    const { compareJsonDetailed } = require('../../../../../src/utils/common.js');
    const result = compareJsonDetailed(5, '5');
    expect(result).toEqual({ capture: { type: { a: 'number', b: 'string' } }, test: { type: { a: 'number', b: 'string' } } });
  });

  test('should return differences for different objects', () => {
    const { compareJsonDetailed } = require('../../../../../src/utils/common.js');
    const result = compareJsonDetailed({ a: 'test', b: 3 }, { a: 'test', b: 4 });
    expect(result).toEqual({ capture: { b: 3 }, test: { b: 4 } });
  });

  test('should return differences for different arrays', () => {
    const { compareJsonDetailed } = require('../../../../../src/utils/common.js');
    const result = compareJsonDetailed([1, 2, 3], [1, 2, '3']);
    expect(result['capture']['[2]']).toBeDefined();
    expect(result['test']['[2]']).toBeDefined();
  });

  test('should return differences for objects with different property lengths', () => {
    const { compareJsonDetailed } = require('../../../../../src/utils/common.js');
    const result = compareJsonDetailed({ a: 1, b: 2 }, { a: 1 });
    expect(result).toEqual({ capture: { propsLength: 2 }, test: { propsLength: 1 } });
  });

  test('should return differences for arrays with different lengths', () => {
    const { compareJsonDetailed } = require('../../../../../src/utils/common.js');
    const result = compareJsonDetailed([1, 2], [1, 2, 3]);
    expect(result).toEqual({ capture: { length: 2 }, test: { length: 3 } });
  });

  test('should return empty differences for the same object ids', () => {
    const { compareJsonDetailed } = require('../../../../../src/utils/common.js');
    const result = compareJsonDetailed('ObjectId("604fd71b5d12d1eee4e9531a")', 'ObjectId("604fd71b5d12d1eee4e9531b")', false);
    expect(result).toEqual({ capture: {}, test: {} });
  });

  test('should return differences for different object ids in strict mode', () => {
    const { compareJsonDetailed } = require('../../../../../src/utils/common.js');
    const result = compareJsonDetailed('ObjectId("604fd71b5d12d1eee4e9531a")', 'ObjectId("604fd71b5d12d1eee4e9531b")', true);
    expect(result).toEqual({ capture: { value: 'ObjectId("604fd71b5d12d1eee4e9531a")' }, test: { value: 'ObjectId("604fd71b5d12d1eee4e9531b")' } });
  });
});