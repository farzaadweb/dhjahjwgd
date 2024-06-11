const decompress = require("decompress");
const { promisify } = require("util");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const tempFilesPath = path.resolve(process.cwd(), process.env.TEMP_PATHS);
const exportLocation = process.env.EXPORT_LOCATION;

const ERROR_CODES = {
  FILE_NOT_FOUND: 1001,
  MYSQL_CONNECT_ERROR: 1003,
  DB_CREATION_ERROR: 1004,
  DB_CHANGE_ERROR: 1005,
  SQL_FILE_NOT_FOUND: 1006,
  SQL_READ_ERROR: 1007,
  SQL_EXECUTION_ERROR: 1008,
  CONFIG_READ_ERROR: 1009,
  CONFIG_WRITE_ERROR: 1010,
  USER_CREATION_ERROR: 1011,
  SUCCESS: 1000,
};

async function checkFileExists(filePath) {
  return fs.promises
    .access(filePath, fs.constants.F_OK)
    .then(() => true)
    .catch(() => false);
}

async function extractFile(filePath, destination) {
  await decompress(filePath, destination);
}

async function connectToDatabase(dbConnection) {
  return new Promise((resolve, reject) => {
    dbConnection.connect((error) => {
      if (error) {
        reject(new Error(ERROR_CODES.MYSQL_CONNECT_ERROR));
      } else {
        console.log("✨✨ Connected to MySQL");
        resolve();
      }
    });
  });
}

async function createDatabase(dbConnection, dbName) {
  const createDbQuery = `CREATE DATABASE IF NOT EXISTS ${dbName}`;
  return promisify(dbConnection.query).bind(dbConnection)(createDbQuery);
}

async function changeDatabase(dbConnection, dbName) {
  return new Promise((resolve, reject) => {
    dbConnection.changeUser({ database: dbName }, (error) => {
      if (error) {
        reject(new Error(ERROR_CODES.DB_CHANGE_ERROR));
      } else {
        resolve();
      }
    });
  });
}

async function createDatabaseUser(
  dbConnection,
  dbName,
  dbUsername,
  dbPassword
) {
  const createUserQuery = `CREATE USER '${dbUsername}'@'%' IDENTIFIED BY '${dbPassword}'`;
  const grantPrivilegesQuery = `GRANT ALL PRIVILEGES ON ${dbName}.* TO '${dbUsername}'@'%'`;
  const flushPrivilegesQuery = "FLUSH PRIVILEGES";

  await promisify(dbConnection.query).bind(dbConnection)(createUserQuery);
  await promisify(dbConnection.query).bind(dbConnection)(grantPrivilegesQuery);
  await promisify(dbConnection.query).bind(dbConnection)(flushPrivilegesQuery);
}

async function importDatabase(dbConnection, sqlFile) {
  const sql = await fs.promises.readFile(sqlFile, "utf8");
  return promisify(dbConnection.query).bind(dbConnection)(sql);
}

async function updateConfigFile(configFilePath, dbName, dbUser, dbPassword) {
  let configContent = await fs.promises.readFile(configFilePath, "utf8");
  configContent = configContent.replace(
    /define\(\s*'DB_NAME',\s*'[^']*'\s*\);/,
    `define( 'DB_NAME', '${dbName}' );`
  );
  configContent = configContent.replace(
    /define\(\s*'DB_USER',\s*'[^']*'\s*\);/,
    `define( 'DB_USER', '${dbUser}' );`
  );
  configContent = configContent.replace(
    /define\(\s*'DB_PASSWORD',\s*'[^']*'\s*\);/,
    `define( 'DB_PASSWORD', '${dbPassword}' );`
  );
  await fs.promises.writeFile(configFilePath, configContent, "utf8");
}

async function Installer(
  dbConnection,
  zipFileName,
  sqlFileName,
  identifier,
  dbName,
  dbUsername,
  dbPassword
) {
  try {
    console.log(
      "zipFileName : ",
      zipFileName,
      "sqlFileName : ",
      sqlFileName,
      "identifier : ",
      identifier,
      "dbName : ",
      dbName,
      "dbUsername : ",
      dbUsername,
      "dbPassword : ",
      dbPassword
    );

    const tempFilePath = path.resolve(tempFilesPath, zipFileName);
    const exportFolderPath = path.resolve(
      exportLocation,
      identifier,
      "public_html"
    );
    console.log(
      `🧩🧩 Setting tempFilePath: ${tempFilePath} - Set exportFolderPath: ${exportFolderPath}`
    );

    if (!(await checkFileExists(tempFilePath))) {
      console.log("🟥🟥 Entered tempFilePath path not exist");
      throw new Error(ERROR_CODES.FILE_NOT_FOUND);
    }

    if (!(await checkFileExists(exportFolderPath))) {
      console.log("🟥🟥 Entered exportFolderPath path not exist");
      await extractFile(tempFilePath, exportFolderPath);
    }

    await connectToDatabase(dbConnection);

    await createDatabase(dbConnection, dbName);
    console.log("✅✅ Database created successfully");

    await changeDatabase(dbConnection, dbName);
    console.log("🧩🧩 Database Successfully changed");

    const sqlFilePath = path.resolve(exportFolderPath, `${sqlFileName}.sql`);
    console.log("📎📎 SQL file path: ", sqlFilePath);
    if (!(await checkFileExists(sqlFilePath))) {
      console.log("🟥🟥 Entered sqlFilePath path not exist");
      throw new Error(ERROR_CODES.SQL_FILE_NOT_FOUND);
    }

    await importDatabase(dbConnection, sqlFilePath);
    console.log("✅✅ Database imported successfully");

    await createDatabaseUser(dbConnection, dbName, dbUsername, dbPassword);
    console.log(
      `✅✅ User ${dbUsername} created successfully with access to ${dbName}`
    );

    const configFilePath = path.resolve(exportFolderPath, "wp-config.php");
    await updateConfigFile(configFilePath, dbName, dbUsername, dbPassword);
    console.log("✅✅ wp-config file updated successfully");

    return ERROR_CODES.SUCCESS;
  } catch (error) {
    console.error("🟥🟥 An error occurred:", error.message);
    return error.message;
  }
}

module.exports = Installer;
