require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = 3000;

// middleware

app.use(cors());
app.use(express.json());

const verifyUserToken = (req, res, next) => {
  let token = req.headers.authorization;
  if (!token)
    return res.status(401).send("Access Denied / Unauthorized request");

  try {
    token = token.split(" ")[1]; // Remove Bearer from string

    if (token === "null" || !token)
      return res.status(401).send("Unauthorized request");

    let verifiedUser = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET); // config.TOKEN_SECRET => 'secretKey'
    if (!verifiedUser) return res.status(401).send("Unauthorized request");

    req.user = verifiedUser; // user_id & user_type_id
    next();
  } catch (error) {
    res.status(400).send("Invalid Token");
  }
};

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
    const transactionCollection = client
      .db("bongoDB")
      .collection("transaction");

    // for users
    app.post("/register", async (req, res) => {
      // Hash pin
      const salt = await bcrypt.genSalt(10);
      const hashedPin = await bcrypt.hash(req.body.pin, salt);

      let user = {
        name: req.body.name,
        email: req.body.email,
        pin: hashedPin,
        phone: req.body.phone,
        role: "user",
        balance: 40,
      };

      const result = await usersCollection.insertOne(user);
      let payload = { id: result.insertedId };
      const token = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET);
      console.log("token", token);

      res.status(200).send({ token });
    });

    app.post("/login", async (req, res) => {
      const email = req.body.email;
      const pin = req.body.pin;
      const query = { email: email };
      const result = await usersCollection.findOne(query);
      console.log("result", result);

      // console.log("result.pin", result.pin);
      // console.log("pin", pin);
      // const salt = await bcrypt.genSalt(10);
      // const hashedPin = await bcrypt.hash(req.body.pin, salt);
      // console.log("hashedPin", hashedPin);

      if (result) {
        const validPass = await bcrypt.compare(pin, result.pin);
        console.log("valid pass?", validPass);
        if (!validPass) return res.status(401).send("Pin is wrong");

        //       // Create and assign token
        //       let payload = { id: user._id };
        //       const token = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET);

        //       res.status(200).header("auth-token", token).send({ token: token });
        //     } else {
        //       res.status(401).send("Invalid mobile");
        //     }
      }
      res.send(result);
      // });
    });

    app.post("/cash-in", async (req, res) => {
      const email = req.body.email;
      const amount = parseFloat(req.body.amount);
      const status = req.body.status;
      const query = { email, amount, status };
      const result = await transactionCollection.insertOne(query);
      res.send(result);
    });

    app.post("/cash-out", async (req, res) => {
      const cashOutRequest = req.body;
      const result = await transactionCollection.insertOne(cashOutRequest);
      res.send(result);
    });

    // for agents

    app.get("/cash-in/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      console.log(query);
      const result = await transactionCollection.findOne(query);
      res.send(result);
    });

    app.patch("/cash-in/:id", async (req, res) => {
      const id = req.params.id;
      const email = req.body.email;
      const amount = req.body.amount;
      console.log("email", email);
      console.log("amount", amount);

      const filter = { _id: new ObjectId(id) };
      const updateStatus = req.body;
      console.log(updateStatus);

      const updateDoc = {
        $set: {
          status: updateStatus.status,
        },
      };

      const result = await transactionCollection.updateOne(filter, updateDoc);

      const balance = req.body;
      const emailFilter = { email };
      const updateBalanceDoc = {
        $inc: {
          balance: amount,
        },
      };
      const result2 = await usersCollection.updateOne(
        emailFilter,
        updateBalanceDoc
      );

      res.send(result2);
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
