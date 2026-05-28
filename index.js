import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import axios from "axios";

const app = express();
const port = 3000;

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "World",
    password: "PosT973_L",
    port: 5432,
});

db.connect();



app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})