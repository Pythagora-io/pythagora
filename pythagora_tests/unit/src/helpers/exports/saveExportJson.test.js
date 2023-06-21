const { saveExportJson } = require('../../../../../src/helpers/exports.js');
const fs = require('fs');
const {
  PYTHAGORA_METADATA_DIR,
  EXPORT_METADATA_FILENAME,
} = require('../../../../../src/const/common');

describe('saveExportJson', () => {
  afterEach(() => {
    if (fs.existsSync(`./${PYTHAGORA_METADATA_DIR}/${EXPORT_METADATA_FILENAME}`)) {
      fs.unlinkSync(`./${PYTHAGORA_METADATA_DIR}/${EXPORT_METADATA_FILENAME}`);
    }
  });

  test('should save export metadata when valid input is given', () => {
    const exportsMetadata = {};
    const test = {id: '123', endpoint: '/test'};
    const testName = 'Test Name';

    saveExportJson(exportsMetadata, test, testName);

    const savedMetadata = JSON.parse(fs.readFileSync(`./${PYTHAGORA_METADATA_DIR}/${EXPORT_METADATA_FILENAME}`, 'utf-8'));
    expect(savedMetadata[test.id]).toEqual({
      endpoint: test.endpoint,
      testName,
    });
  });

  test('should add to existing metadata when file already exists', () => {
    const existingMetadata = {
      '124': {
        endpoint: '/existing',
        testName: 'Existing Test',
      },
    };
    fs.writeFileSync(`./${PYTHAGORA_METADATA_DIR}/${EXPORT_METADATA_FILENAME}`, JSON.stringify(existingMetadata));

    const exportsMetadata = existingMetadata;
    const test = {id: '123', endpoint: '/test'};
    const testName = 'Test Name';

    saveExportJson(exportsMetadata, test, testName);

    const savedMetadata = JSON.parse(fs.readFileSync(`./${PYTHAGORA_METADATA_DIR}/${EXPORT_METADATA_FILENAME}`, 'utf-8'));
    expect(savedMetadata).toEqual({
      ...existingMetadata,
      [test.id]: {
        endpoint: test.endpoint,
        testName,
      },
    });
  });

  test('should update existing test metadata when test ID already exists', () => {
    const existingMetadata = {
      '123': {
        endpoint: '/old-test',
        testName: 'Old Test Name',
      },
    };
    fs.writeFileSync(`./${PYTHAGORA_METADATA_DIR}/${EXPORT_METADATA_FILENAME}`, JSON.stringify(existingMetadata));

    const exportsMetadata = existingMetadata;
    const test = {id: '123', endpoint: '/new-test'};
    const testName = 'New Test Name';

    saveExportJson(exportsMetadata, test, testName);

    const savedMetadata = JSON.parse(fs.readFileSync(`./${PYTHAGORA_METADATA_DIR}/${EXPORT_METADATA_FILENAME}`, 'utf-8'));
    expect(savedMetadata[test.id]).toEqual({
      endpoint: test.endpoint,
      testName,
    });
  });
});
