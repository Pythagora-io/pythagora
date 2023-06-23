describe('processAst', () => {
  const { processAst } = require('../../../../../src/utils/code.js');
  const babelParser = require("@babel/parser");

  test('module.exports object', () => {
    const code = `
      function func1() {}
      module.exports = {
        func1
      };
    `;

    const ast = babelParser.parse(code);
    const mockCallback = jest.fn();
    processAst(ast, mockCallback);
    expect(mockCallback.mock.calls[1][0]).toBe('func1');
    expect(mockCallback.mock.calls[1][2]).toBe('exportObj');
  });

  test('ES6 export and function declarations', () => {
    const code = `
      export function func1() {}
      export default function func2() {}
    `;
    const ast = babelParser.parse(code, { sourceType: 'module' });
    const mockCallback = jest.fn();
    processAst(ast, mockCallback);
    expect(mockCallback.mock.calls.length).toBe(4);
    expect(mockCallback.mock.calls[0][0]).toBe('func1');
    expect(mockCallback.mock.calls[0][2]).toBe('exportFnDef');
    expect(mockCallback.mock.calls[2][0]).toBe('func2');
    expect(mockCallback.mock.calls[2][2]).toBe('exportFn');
  });

  test('module.exports and function declaration, function expression', () => {
    const code = `
      function func1() {}
      module.exports = func1;
      module.exports.func2 = function() {};
    `;
    const ast = babelParser.parse(code);
    const mockCallback = jest.fn();
    processAst(ast, mockCallback);
    expect(mockCallback.mock.calls.length).toBe(3);
    expect(mockCallback.mock.calls[1][0]).toBe('func1');
    expect(mockCallback.mock.calls[1][2]).toBe('exportFn');
    expect(mockCallback.mock.calls[2][0]).toBe('func2');
    expect(mockCallback.mock.calls[2][2]).toBe('exportObj');
  });

  test('module.exports and function expression with arrow function', () => {
    const code = `
      const func1 = () => {};
      module.exports = {
        func1
      };
    `;
    const ast = babelParser.parse(code);
    const mockCallback = jest.fn();
    processAst(ast, mockCallback);
    expect(mockCallback.mock.calls.length).toBe(2);
    expect(mockCallback.mock.calls[1][0]).toBe('func1');
    expect(mockCallback.mock.calls[1][2]).toBe('exportObj');
  });

  test('TypeScript exports', () => {
    const code = `
      function func1() {}
      exports.func1 = func1;
    `;
    const ast = babelParser.parse(code);
    const mockCallback = jest.fn();
    processAst(ast, mockCallback);
    expect(mockCallback.mock.calls.length).toBe(2);
    expect(mockCallback.mock.calls[1][0]).toBe('func1');
    expect(mockCallback.mock.calls[1][2]).toBe('exportObj');
  });

  test('ClassMethods', () => {
    const code = `
      class MyClass {
        method1() {}
      };
      module.exports = MyClass;
    `;
    const ast = babelParser.parse(code);
    const mockCallback = jest.fn();
    processAst(ast, mockCallback);
    expect(mockCallback.mock.calls.length).toBe(2);
    expect(mockCallback.mock.calls[0][0]).toBe('MyClass.method1');
  });

  test('anonymous arrow function added to exports', () => {
    const code = `
      const myFunc = () => {};
      module.exports.myFunc = myFunc;
    `;

    const ast = babelParser.parse(code);
    const mockCallback = jest.fn();
    processAst(ast, mockCallback);
    expect(mockCallback.mock.calls.length).toBe(2);
    expect(mockCallback.mock.calls[1][0]).toBe('myFunc');
    expect(mockCallback.mock.calls[1][2]).toBe('exportObj');
  });

  test('named function expression added to exports', () => {
    const code = `
      const namedFunc = function myFunc() {};
      module.exports.myFunc = namedFunc;
    `;

    const ast = babelParser.parse(code);
    const mockCallback = jest.fn();
    processAst(ast, mockCallback);
    expect(mockCallback.mock.calls.length).toBe(2);
    expect(mockCallback.mock.calls[1][0]).toBe('myFunc');
    expect(mockCallback.mock.calls[1][2]).toBe('exportObj');
  });

  test('export object with default', () => {
    const code = `
      function func1() {}
      function func2() {}
      export default {
        func1,
        func2
      };
    `;

    const ast = babelParser.parse(code, { sourceType: 'module' });
    const mockCallback = jest.fn();
    processAst(ast, mockCallback);
    expect(mockCallback.mock.calls.length).toBe(4);
    expect(mockCallback.mock.calls[2][0]).toBe('func1');
    expect(mockCallback.mock.calls[2][2]).toBe('exportObj');
    expect(mockCallback.mock.calls[3][0]).toBe('func2');
    expect(mockCallback.mock.calls[3][2]).toBe('exportObj');
  });

  test('export class with methods', () => {
    const code = `
      export class MyClass {
        method1() {}
        method2() {}
      }
    `;

    const ast = babelParser.parse(code, { sourceType: 'module' });
    const mockCallback = jest.fn();
    processAst(ast, mockCallback);
    expect(mockCallback.mock.calls.length).toBe(3);
    expect(mockCallback.mock.calls[0][0]).toBe('MyClass');
    expect(mockCallback.mock.calls[0][2]).toBe('exportFnDef');
    expect(mockCallback.mock.calls[1][0]).toBe('MyClass.method1');
    expect(mockCallback.mock.calls[2][0]).toBe('MyClass.method2');
  });
});

describe('processAst coverage tests', () => {
  const { processAst } = require('../../../../../src/utils/code.js');
  const babelParser = require("@babel/parser");

  test('module exports named function expression', () => {
    const code = `
      module.exports = function namedFunc() {};
    `;

    const ast = babelParser.parse(code);
    const mockCallback = jest.fn();
    processAst(ast, mockCallback);
    expect(mockCallback.mock.calls.length).toBe(1);
    expect(mockCallback.mock.calls[0][0]).toBe('namedFunc');
    expect(mockCallback.mock.calls[0][2]).toBe('exportFnDef');
  });

  test('module.exports anonymous function', () => {
    const code = `
      module.exports = function() {};
    `;

    const ast = babelParser.parse(code);
    const mockCallback = jest.fn();
    processAst(ast, mockCallback);
    expect(mockCallback.mock.calls.length).toBe(1);
    const anonFuncRegex = /^anon_func_\d+_\d+$/;
    expect(mockCallback.mock.calls[0][0]).toMatch(anonFuncRegex);
    expect(mockCallback.mock.calls[0][2]).toBe('exportFnDef');
  });

  test('Export default unnamed class', () => {
    const code = `
      export default class {};
    `;
    const ast = babelParser.parse(code, { sourceType: 'module' });
    const mockCallback = jest.fn();
    processAst(ast, mockCallback);
    expect(mockCallback.mock.calls.length).toBe(1);
    expect(mockCallback.mock.calls[0][0]).toBe(undefined);
    expect(mockCallback.mock.calls[0][1]).toBe(null);
    expect(mockCallback.mock.calls[0][2]).toBe('exportFnDef');
  });

  test('Export named variable declaration', () => {
    const code = `
      const func1 = () => {};
      export { func1 };
    `;
    const ast = babelParser.parse(code, { sourceType: 'module' });
    const mockCallback = jest.fn();
    processAst(ast, mockCallback);
    expect(mockCallback.mock.calls.length).toBe(2);
    expect(mockCallback.mock.calls[1][0]).toBe('func1');
    expect(mockCallback.mock.calls[1][1]).toBe(null);
    expect(mockCallback.mock.calls[1][2]).toBe('exportObj');
  });
  
});
