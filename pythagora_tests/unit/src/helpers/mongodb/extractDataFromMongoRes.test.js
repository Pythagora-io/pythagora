describe("extractDataFromMongoRes tests", () => {
  const { extractDataFromMongoRes } = require("../../../../../src/helpers/mongodb");

  test("should return empty object for empty input", () => {
    expect(extractDataFromMongoRes({})).toEqual({});
  });

  test("should return input object when not a CommandResult or special object", () => {
    const input = { a: 1, b: 2 };
    expect(extractDataFromMongoRes(input)).toEqual(input);
  });

  test("should return result object for CommandResult input", () => {
    const input = {
      result: { a: 1, b: 2 },
      electionId: "electionId",
      opTime: "opTime",
      $clusterTime: "clusterTime",
      operationTime: "operationTime",
      __proto__: { constructor: { name: "CommandResult" } },
    };
    const expected = { a: 1, b: 2 };
    expect(extractDataFromMongoRes(input)).toEqual(expected);
  });

  test("should return value object for special object input", () => {
    const input = {
      value: { a: 1, b: 2 },
      lastErrorObject: "lastErrorObject",
      ok: "ok",
      __proto__: { constructor: { name: "Object" } },
    };
    const expected = { a: 1, b: 2 };
    expect(extractDataFromMongoRes(input)).toEqual(expected);
  });
});
