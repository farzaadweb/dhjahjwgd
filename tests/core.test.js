const install = require("../src/core");
const decompress = require("decompress");
const path = require("path");
const fs = require("fs");

jest.mock("fs");
jest.mock("decompress");
jest.mock("mysql2");
jest.mock("util", () => ({
  promisify: jest.fn((fn) => fn),
}));

describe("install function", () => {
  let dbConnection;

  beforeEach(() => {
    dbConnection = {
      connect: jest.fn(),
      query: jest.fn(),
      changeUser: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should install correctly", async () => {
    const fileName = "example.zip";
    const databaseName = "sokansite_shop_ostadio1";
    const dbUsername = "example_user";
    const dbPassword = "example_password";
    const tempFilePath = path.resolve(
      process.cwd(),
      process.env.TEMP_PATHS,
      fileName
    );
    const exportFolderPath = path.resolve(
      process.cwd(),
      process.env.EXPORT_LOCATION,
      fileName.split(".")[0]
    );
    const sqlFilePath = path.resolve(exportFolderPath, `${databaseName}.sql`);
    const configFilePath = path.resolve(exportFolderPath, "wp-config.php");

    fs.promises.access.mockResolvedValue(true);
    decompress.mockResolvedValue();
    dbConnection.connect.mockImplementation((cb) => cb(null));
    dbConnection.query.mockImplementation((query, cb) => cb(null, {}));
    dbConnection.changeUser.mockImplementation((user, cb) => cb(null));
    fs.promises.readFile.mockResolvedValue(
      "define('DB_NAME', ''); define('DB_USER', ''); define('DB_PASSWORD', '');"
    );
    fs.promises.writeFile.mockResolvedValue();

    const result = await install(
      dbConnection,
      fileName,
      databaseName,
      dbUsername,
      dbPassword
    );

    expect(result).toBe(1000);
    expect(fs.promises.access).toHaveBeenCalledWith(
      tempFilePath,
      fs.constants.F_OK
    );
    expect(decompress).toHaveBeenCalledWith(tempFilePath, exportFolderPath);
    expect(dbConnection.connect).toHaveBeenCalled();
    expect(dbConnection.query).toHaveBeenCalledWith(
      `CREATE DATABASE IF NOT EXISTS ${databaseName}`,
      expect.any(Function)
    );
    expect(dbConnection.changeUser).toHaveBeenCalledWith(
      { database: databaseName },
      expect.any(Function)
    );
    expect(fs.promises.readFile).toHaveBeenCalledWith(sqlFilePath, "utf8");
    expect(fs.promises.writeFile).toHaveBeenCalledWith(
      configFilePath,
      expect.any(String),
      "utf8"
    );
  });

  test("should return error code if file does not exist", async () => {
    fs.promises.access.mockRejectedValue(new Error());

    const result = await install(
      dbConnection,
      "nonexistent.zip",
      "database",
      "user",
      "password"
    );

    expect(result).toBe(1001);
  });
});
