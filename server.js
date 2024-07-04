const express = require("express");
const axios = require("axios");
const { Pool } = require("pg");
const path = require("path");
const app = express();

require('dotenv').config();
const port = process.env.port||4000;

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));


app.use(express.static(path.join(__dirname, "public")));


pool.query(
  `
    CREATE TABLE IF NOT EXISTS crypto_data (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50),
        last FLOAT,
        buy FLOAT,
        sell FLOAT,
        volume FLOAT,
        base_unit VARCHAR(50)
    )
`,
  (err, res) => {
    if (err) throw err;
  }
);


async function fetchData() {
  try {
    const response = await axios.get("https://api.wazirx.com/api/v2/tickers");
    const tickers = response.data;
    const top10 = Object.values(tickers).slice(0, 10);


    await pool.query("DELETE FROM crypto_data");

    top10.forEach(async (ticker) => {
      const { name, last, buy, sell, volume, base_unit } = ticker;
      await pool.query(
        "INSERT INTO crypto_data (name, last, buy, sell, volume, base_unit) VALUES ($1, $2, $3, $4, $5, $6)",
        [name, last, buy, sell, volume, base_unit]
      );
    });

    console.log("Data fetched and stored successfully");
  } catch (error) {
    console.error("Error fetching data:", error);
  }
}


setInterval(fetchData, 3600000);
fetchData();


app.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM crypto_data");
    res.render("index", { data: result.rows });
  } catch (err) {
    console.error("Error retrieving data:", err);
    res.status(500).send("Server Error");
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
