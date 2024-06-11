const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Core = require("./core");

const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, path.resolve(process.cwd(), "temp"));
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname);
    },
  }),
});

async function deleteFile(path) {
  try {
    if (fs.existsSync(path)) {
      await fs.unlink(path, (error) => {
        if (error) throw error;
      });
    }
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
}

function bootRoutes(app, db) {
  app.get("/", (req, res) => {
    res.send("Hello World! I am your new NodeJS app!");
  });
  app.post("/", upload.single("zipFile"), async (req, res) => {
    try {
      console.log("✨✨ Request received");
      if (!req.file) return res.status(400).json({ errorCode: 1011 });

      const filePath = path.resolve(
        process.cwd(),
        "temp",
        req.file.originalname
      );
      const accounts = req.body.accounts.split(",");

      if (
        !req.body ||
        !req.body.accounts ||
        !Array.isArray(accounts) ||
        !req.body.sqlFileName
      ) {
        console.log("⚠️⚠️ Handle delete zip file");
        await deleteFile(filePath);
        return res.status(400).json({ errorCode: 1011 });
      }

      let createdAccounts = [];
      let canceledAccounts = [];

      for (account of accounts) {
        console.log("🟦🟦 Start handle account : ", account);
        const createdAccountStatus = await Core(
          db,
          req.file.originalname,
          req.body.sqlFileName,
          account,
          account,
          account,
          account
        );
        if (createdAccountStatus == 1000) {
          createdAccounts.push(accounts);
          console.log("✅✅ ", account, " was successfully confined");
        } else {
          canceledAccounts.push(accounts);
          console.log("🟥🟥 ", account, " wasn't confined");
        }
        console.log("------------ ⚪⚪ Finished handle account : ", account);
      }

      return res.status(201).json({
        createdAccounts,
        canceledAccounts,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ errorCode: 1002 });
    }
  });
}

module.exports = bootRoutes;
