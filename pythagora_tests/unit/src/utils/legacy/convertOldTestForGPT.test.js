const { convertOldTestForGPT } = require('../../../../../src/utils/legacy.js');
const _ = require('lodash');
describe('convertOldTestForGPT', () => {
  test('should return expected keys after conversion', () => {
    const originalTest = {
      id: '1',
      url: '/test',
      trace: 'abc',
      traceId: 'xyz',
      asyncStore: {},
      traceLegacy: [],
      createdAt: new Date(),
      params: {
        param1: 'value1',
        param2: 'value2',
      },
      responseData: JSON.stringify({ success: true }),
      mongoQueriesCapture: 5,
      query: {
        key1: 'value1',
        key2: 'value2',
      },
      body: {
        data: 'sample',
      },
      intermediateData: [
        {
          preQueryRes: 'pre-result',
          postQueryRes: 'post-result',
          mongoRes: 'res-data',
          query: 'query-data',
          options: {
            opt1: 'opt-value',
          },
          op: 'operation-type',
        },
      ],
    };
    
    const expectedTest = {
      testId: '1',
      response: {
        success: true,
      },
      mongoQueryNum: 5,
      reqQuery: {
        key1: 'value1',
        key2: 'value2',
      },
      reqBody: { data: 'sample' },
      mongoQueries: [
        {
          preQueryDocs: 'pre-result',
          postQueryDocs: 'post-result',
          mongoResponse: 'res-data',
          mongoQuery: 'query-data',
          mongoOptions: {
            opt1: 'opt-value',
          },
          mongoOperation: 'operation-type',
        },
      ],
    };
    
    expect(convertOldTestForGPT(originalTest)).toEqual(expectedTest);
  });

  test('should handle responseData already being a JSON object', () => {
    const originalTest = {
      id: '1',
      responseData: { success: true },
      mongoQueriesCapture: 5,
      query: {},
      body: {},
      intermediateData: [],
    };

    expect(() => convertOldTestForGPT(originalTest)).not.toThrow();
  });

  test('should create the same result when given the same input', () => {
    const originalTest = {
      id: '1',
      responseData: JSON.stringify({ success: true }),
      mongoQueriesCapture: 5,
      query: {
        key1: 'value1',
      },
      body: {
        data: 'sample',
      },
      intermediateData: [
        {
          preQueryRes: 'pre-result',
          postQueryRes: 'post-result',
          mongoRes: 'res-data',
          query: 'query-data',
          options: {
            opt1: 'opt-value',
            opt2: 'opt-value2',
          },
          op: 'operation-type',
        },
      ],
    };

    const convertedTest1 = convertOldTestForGPT(_.cloneDeep(originalTest));
    const convertedTest2 = convertOldTestForGPT(_.cloneDeep(originalTest));

    expect(convertedTest1).toEqual(convertedTest2);
  });
});

