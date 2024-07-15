require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const bcrypt = require("bcryptjs");
// const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion } = require("mongodb");
const port = 3000;

// middleware

app.use(cors());
app.use(express.json());

// const verifyUserToken = (req, res, next) => {
//   let token = req.headers.authorization;
//   if (!token)
//     return res.status(401).send("Access Denied / Unauthorized request");

//   try {
//     token = token.split(" ")[1]; // Remove Bearer from string

//     if (token === "null" || !token)
//       return res.status(401).send("Unauthorized request");

//     let verifiedUser = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET); // config.TOKEN_SECRET => 'secretKey'
//     if (!verifiedUser) return res.status(401).send("Unauthorized request");

//     req.user = verifiedUser; // user_id & user_type_id
//     next();
//   } catch (error) {
//     res.status(400).send("Invalid Token");
//   }
// };

const uri = "mongodb://localhost:27017";
// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster81657.uygasmd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster81657`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection

    const usersCollection = client.db("bongoDB").collection("users");

    app.post("/register", async (req, res) => {
      // Hash pin
      const salt = await bcrypt.genSalt(10);
      const hashedPin = await bcrypt.hash(req.body.pin, salt);
      console.log("hashed pin: " + hashedPin);

      // Create a user object
      let user = {
        name: req.body.name,
        email: req.body.email,
        pin: hashedPin,
        phone: req.body.phone,
      };

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.get("/login/:email", async (req, res) => {
      const email = req.params.email;
      // if (email !== req.decoded.email) {
      //   return res.status(403).send({ message: "forbidden access" });
      // }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      res.send(user);
    });

    app.get("/register", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
