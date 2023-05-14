const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
var jwt = require('jsonwebtoken');
require("dotenv").config();
const app = express();
const cors = require("cors");
const port = process.env.PORT || 5000;

// Middle ware //
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mjqzlpi.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ erorr: true, message: "unauthorize user 1" });
  }
  const token = authorization.split(" ")[1];
  console.log("MY TOKENNNNNNN___________", authorization);
  jwt.verify(token, process.env.SECRATE_KEY, (error, decoded) => {
    if (error) {
      console.log("33 unauth-2", error);
      return res
        .status(401)
        .send({ error: true, message: "unauthorize user 2" });
    }
    req.decoded = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const servicesCollection = client.db("carDoctors").collection("services");
    const orderCollection = client.db("carDoctors").collection("bookings");

    // JWT token //
    app.post("/jwt", (req, res) => {
      const user = req.body;
      // console.log("DECODED", req.decoded);
      const token = jwt.sign(user, process.env.SECRATE_KEY, {
        expiresIn: "1hr",
      });
      console.log({ token });
      res.send({ token });
    });

    app.get("/services", async (req, res) => {
      const cursor = servicesCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await servicesCollection.findOne(query);
      res.send(result);
    });

    app.post("/order", async (req, res) => {
      const chekout = req.body;
      // console.log(chekout);
      const result = await orderCollection.insertOne(chekout);
      res.send(result);
    });

    app.get("/order", verifyJWT, async (req, res) => {
      // console.log(req.query);
      console.log("DECODED", req.decoded);
      const decoded = req.decoded;
      if (decoded.email !== req.query.email) {
        return res.status(403).send({ error: 1, message: "forbidden access" });
      }

      let quary = {};
      if (req.query?.email) {
        quary = { email: req.query.email };
      }
      const result = await orderCollection.find(quary).toArray();
      res.send(result);
    });

    app.delete("/order/:id", async (req, res) => {
      const id = req.params.id;
      const quary = { _id: new ObjectId(id) };
      const result = orderCollection.deleteOne(quary);
      res.send(result);
    });

    app.patch("/order/:id", async (req, res) => {
      const id = req.params.id;
      const orderStatus = req.body;
      console.log(orderStatus.status);
      const filter = { _id: new ObjectId(id) };
      const updatedDocs = {
        $set: {
          status: orderStatus.status,
        },
      };
      const result = await orderCollection.updateOne(filter, updatedDocs);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
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
  res.send("Car Doctor!!");
});

app.listen(port, () => {
  console.log(`http://localhost:${port}`);
});
