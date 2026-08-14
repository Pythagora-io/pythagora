describe("Update Metadata", () => {
  const { updateMetadata, getMetadata } = require("../../../../../src/utils/common.js");
  const fs = require("fs");
  const path = require("path");
  const { PYTHAGORA_METADATA_DIR, METADATA_FILENAME } = require("../../../../../src/const/common");

  afterEach(() => {
    fs.writeFileSync(path.join(".", PYTHAGORA_METADATA_DIR, METADATA_FILENAME), "{}");
  });

  test("should update metadata with given object", () => {
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    const newMetadata = { key: "value", validId: "5f43cec373fa0a9c8147a9b6" };

    updateMetadata(newMetadata);

    const metadata = getMetadata();
    expect(metadata).toMatchObject({ key: "value" });

    // Check if validId is ObjectId string
    expect(metadata.validId).toEqual(expect.stringMatching(objectIdRegex));
  });

  test("should update metadata with an empty object", () => {
    updateMetadata({});

    const metadata = getMetadata();
    expect(metadata).toMatchObject({});
  });

  test("should update metadata with nested object", () => {
    const newMetadata = { nested: { key: "value" } };

    updateMetadata(newMetadata);

    const metadata = getMetadata();
    expect(metadata).toMatchObject({ nested: { key: "value" } });
  });

  test("should update metadata with array value", () => {
    const newMetadata = { array: [1, 2, 3] };

    updateMetadata(newMetadata);

    const metadata = getMetadata();
    expect(metadata).toMatchObject({ array: [1, 2, 3] });
  });
});
