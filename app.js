const RoutesBoot = require("./src/route");
const express = require("express");

const dotenv = require("dotenv");
const mysql = require("mysql2");
const path = require("path");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const app = express();
const port = 3333;

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: +process.env.DB_PORT,
  multipleStatements: true,
});

(async function connectToDatabase(dbConnection) {
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
})(connection);

RoutesBoot(app, connection);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
