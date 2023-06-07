const fs = require("fs");
const { getMetadata, ObjectId } = require("../../../../../src/utils/common");

describe("getMetadata tests", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.mock("fs");
  });

  test("getMetadata returns correct data when file exists", () => {
    const metadataMock = {
      key1: "value1",
      key2: "value2",
      key3: 3,
      key4: { subKey: "value" },
      key5: [1, 2, 3],
    };
    fs.readFileSync = jest.fn().mockReturnValue(JSON.stringify(metadataMock));

    const result = getMetadata();
    expect(result).toEqual(metadataMock);
  });

  test("getMetadata throws an error if file does not exist", () => {
    fs.readFileSync = jest.fn().mockImplementation(() => {
      throw new Error("File not found");
    });

    expect(() => getMetadata()).toThrow(Error);
  });

  test("getMetadata throws an error if file content is not valid JSON", () => {
    fs.readFileSync = jest.fn().mockReturnValue("Invalid JSON");

    expect(() => getMetadata()).toThrow(SyntaxError);
  });
});
