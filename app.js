// const express = require("express");
// const path = require("path");
// const { open } = require("sqlite");
// const sqlite3 = require("sqlite3");
// const bcrypt = require("bcrypt");
// const jwt = require("jsonwebtoken");

// const app = express();
// app.use(express.json());

// const dbPath = path.join(__dirname, "covid19IndiaPortal.db");

// let db = null;

// const initializeDbAndServer = async () => {
//   try {
//     db = await open({
//       filename: dbPath,
//       driver: sqlite3.Database,
//     });
//     app.listen(3000, () => {
//       console.log("Server Running at http://localhost:3000/");
//     });
//   } catch (e) {
//     console.log(`DB Error: ${e.message}`);
//     process.exit(1);
//   }
// };

// initializeDbAndServer();

const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "covid19IndiaPortal.db");

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

// const authenticationOfToken = (req, res, next) => {
//   let jwtToken;
//   const authHeader = req.headers["Authorization"];
//   if (authHeader !== undefined) {
//     jwtToken = authHeader.split(" ")[1];
//   }
//   if (jwtToken === undefined) {
//     res.status(401);
//     res.send("Invalid JWT Token");
//   } else {
//     jwt.verify(jwtToken, "qwertyuiop", async (error, payload) => {
//       if (error) {
//         res.status(401);
//         res.send("Invalid Access Token");
//       } else {
//         next();
//       }
//     });
//   }
// };

const authenticationOfToken = (req, res, next) => {
  let jwtToken;
  const authHeader = req.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    res.status(401);
    res.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "qwertyuiop", async (error, payload) => {
      if (error) {
        res.status(401);
        res.send("Invalid Access Token");
      } else {
        next();
      }
    });
  }
};

app.post("/login/", async (req, res) => {
  const { username, password } = req.body;
  const getUserDetails = `
        SELECT * 
        FROM user
        WHERE username = '${username}'; 
    `;
  const userDb = await db.get(getUserDetails);
  //   res.send(userDb);
  if (userDb === undefined) {
    res.status(400);
    res.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, userDb.password);
    if (isPasswordMatched) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "qwertyuiop");
      res.send({ jwtToken });
    } else {
      res.status(400);
      res.send("Invalid password");
    }
  }
});

app.get("/states/", authenticationOfToken, async (req, res) => {
  const getAllStatesQuery = `
        SELECT 
            state_id AS stateId,
            state_name AS stateName,
            population AS population
        FROM state
    `;
  const statesList = await db.all(getAllStatesQuery);
  res.send(statesList);
});

app.get("/states/:stateId/", authenticationOfToken, async (req, res) => {
  const { stateId } = req.params;
  const getStateDetails = `
        SELECT
            state_id AS stateId,
            state_name AS stateName,
            population AS population
        FROM state
        WHERE state_id = ${stateId};
    `;
  const stateDetails = await db.get(getStateDetails);
  res.send(stateDetails);
});

app.post("/districts/", authenticationOfToken, async (req, res) => {
  const districtDetails = req.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const postDistrictDetails = `
        INSERT INTO 
            district (district_name,state_id,cases,cured,active,deaths)
        VALUES 
            (
                '${districtName}',
                ${stateId},
                ${cases},
                ${cured},
                ${active},
                ${deaths}
            );
    `;
  const dbResponse = await db.run(postDistrictDetails);
  const districtId = dbResponse.lastID;
  res.send("District Successfully Added");
});

app.get("/districts/:districtId/", authenticationOfToken, async (req, res) => {
  const { districtId } = req.params;
  const getDistrictDetailsQuery = `
        SELECT 
            district_id AS districtId,
            district_name AS districtName,
            state_id AS stateId,
            cases AS cases,
            cured,
            active,
            deaths
        FROM district 
        WHERE district_id = ${districtId};
    `;
  const distDetails = await db.get(getDistrictDetailsQuery);
  res.send(distDetails);
});

app.put("/districts/:districtId/", authenticationOfToken, async (req, res) => {
  const { districtId } = req.params;
  const { districtName, stateId, cases, cured, active, deaths } = req.body;
  const updateDistrictQuery = `
        UPDATE district
        SET 
            district_name = '${districtName}',
            state_id = ${stateId},
            cases = ${cases},
            cured = ${cured},
            active = ${active},
            deaths = ${deaths}
        WHERE district_id = ${districtId};
    `;
  await db.run(updateDistrictQuery);
  res.send("District Details Updated");
});

app.get("/states/:stateId/stats", authenticationOfToken, async (req, res) => {
  const { stateId } = req.params;
  //   console.log(stateId);
  const getStatsQuery = `
        SELECT 
            SUM(cases) AS totalCases,
            SUM(cured) AS totalCured,
            SUM(active) AS totalActive,
            SUM(deaths) AS totalDeaths
        FROM district
        WHERE state_id = ${stateId};
    `;
  const stats = await db.get(getStatsQuery);
  res.send(stats);
});
app.delete(
  "/districts/:districtId/",
  authenticationOfToken,
  async (req, res) => {
    const { districtId } = req.params;
    const deleteDistrictQuery = `
        DELETE 
        FROM 
            district
        WHERE district_id = ${districtId};
    `;
    await db.run(deleteDistrictQuery);
    res.send("District Removed");
  }
);

module.exports = app;
