import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import mongodb from "mongodb";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { MongoClient } from "mongodb";
import nodemailer from "nodemailer";
const PORT = process.env.PORT;
const URL = process.env.DB;
const PASSWORD = process.env.PASSWORD;
const app = express();
const mailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "",
    pass: PASSWORD,
  },
});
// MidleWare
app.use(express.json());
app.use(cors());

// Connecting MongoDB
const createConnection = async () => {
  const client = new MongoClient(URL);
  await client.connect();
  console.log("MongoDB connected");
  return client;
};
const client = await createConnection();

app.get("/", (req, res) => {
  res.json({ message: "welcome" });
});

// create
app.post("/log", async (req, res) => {
  try {
    let response = await client
      .db("forgot")
      .collection("forgotEmail")
      .insertOne(req.body);
    let resUser = await client
      .db("forgot")
      .collection("forgotEmail")
      .find()
      .toArray();
    res.status(200).json(resUser);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err });
  }
});

// register
app.post("/register", async (req, res) => {
  try {
    let user = client.db("forgot").collection("user");
    let salt = await bcrypt.genSalt(10);
    let hash = await bcrypt.hash(req.body.password, salt);
    req.body.password = hash;
    let final = await user.insertOne(req.body);
    res.json({ message: "User successfully registered" });
  } catch (err) {
    console.log(err);
    res.json(err);
  }
});

// login
app.post("/login", async (req, res) => {
  try {
    // getting the data from the db for the sent email
    let user = await client
      .db("forgot")
      .collection("user")
      .findOne({ email: req.body.email });
    // Login logic
    if (user) {
      let compare = await bcrypt.compare(req.body.password, user.password);
      if (compare) {
        let token = jwt.sign({ _id: user._id }, process.env.SECRET, {
          expiresIn: "30m",
        });
        let userValues = {
          name: user.FirstName,
          token: token,
          message: "success",
        };
        res.json({ userValues });
        // res.json({ message: "logged in successfully" });
      } else {
        let userValues = {
          message: "wrong password",
        };
        res.json({ userValues });
      }
    } else {
      res.status(401).json({ message: "user email not found" });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Something went wrong" });
  }
});

app.post("/password", async (req, res) => {
  try {
    let user = await client
      .db("forgot")
      .collection("user")
      .findOne({ email: req.body.email });
    console.log(user);
    if (user) {
      let random = Math.floor(1000 + Math.random() * 9000);
      let lib = client
        .db("forgot")
        .collection("user")
        .updateOne({ email: user.email }, { $set: { random: random } });
      let details = {
        from: "",
        to: user.email,
        subject: "Click the below link to Reset the password",
        text: "http://localhost:3000/reset",
      };
      mailTransporter.sendMail(details, (err) => {
        if (err) {
          console.log("it has an error", err);
        } else console.log("Email sent");
      });
      res.status(200).json({ message: "success" });
    } else {
      res.status(401).json({ message: "user email not found" });
    }
  } catch (err) {
    console.log(err);
    res.json(err);
  }
});

app.listen(PORT || 3001, () => {
  console.log(`server listening on Port ${PORT}`);
});
