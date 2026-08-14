describe('searchAllModuleFolders', () => {
  const fs = require('fs');
  const path = require('path');
  const { searchAllModuleFolders } = require("../../../../../src/helpers/starting");

  test('returns empty object when no modules', () => {
    const result = searchAllModuleFolders('.', []);
    expect(result).toEqual({});
  });

  test('returns empty module paths when modules not found', () => {
    const result = searchAllModuleFolders('.', ['nonexistent']);
    expect(result).toEqual({ nonexistent: [] });
  });

  test('finds nested node_modules directories', () => {
    const module1Path = path.join('.', 'testdir', 'node_modules', 'module1');
    fs.mkdirSync(module1Path, { recursive: true });
    const result = searchAllModuleFolders('.', ['module1']);
    expect(result).toEqual({ module1: [module1Path] });
    fs.rmdirSync(path.join('.', 'testdir'), { recursive: true });
  });

  test('finds multiple node_modules directories for multiple modules', () => {
    const module1Path = path.join('.', 'testdir', 'node_modules', 'module1');
    const module2Path = path.join('.', 'testdir', 'node_modules', 'module2');

    fs.mkdirSync(module1Path, { recursive: true });
    fs.mkdirSync(module2Path, { recursive: true });

    const result = searchAllModuleFolders('.', ['module1', 'module2']);
    expect(result).toEqual({
      module1: [module1Path],
      module2: [module2Path]
    });

    fs.rmdirSync(path.join('.', 'testdir'), { recursive: true });
  });

  test('finds deeply nested node_modules directories', () => {
    const module1Path = path.join('.', 'testdir', 'subdir', 'node_modules', 'module1');
    fs.mkdirSync(module1Path, { recursive: true });

    const result = searchAllModuleFolders('.', ['module1']);
    expect(result).toEqual({ module1: [module1Path] });

    fs.rmdirSync(path.join('.', 'testdir'), { recursive: true });
  });
});
