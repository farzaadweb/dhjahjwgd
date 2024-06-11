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

RoutesBoot(app, connection);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
