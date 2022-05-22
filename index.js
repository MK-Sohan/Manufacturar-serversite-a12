const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

require("dotenv").config();
// Middleware------
app.use(express.json());
app.use(cors());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xxu5i.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
// client section start================================================================

async function run() {
  try {
    await client.connect();
    const toolsCollection = client
      .db("toolscollection_database")
      .collection("alltools");
    const reviewCollection = client
      .db("toolscollection_database")
      .collection("reviews");
    const orderCollection = client
      .db("toolscollection_database")
      .collection("orders");
    app.get("/tool", async (req, res) => {
      const query = {};
      const result = await toolsCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/tool/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await toolsCollection.findOne(query);
      res.send(result);
    });
    // reviews section start========================
    app.get("/review", async (req, res) => {
      const query = {};
      const review = await reviewCollection.find(query).toArray();
      res.send(review);
    });

    // reviews section end========================
    // order post section start==================
    app.post("/order", async (req, res) => {
      const placeorder = req.body;
      const orderresult = await orderCollection.insertOne(placeorder);

      res.send(orderresult);
    });

    // order post section end==================
  } finally {
  }
}
run().catch(console.dir);

// client section end================================================================

app.get("/", (req, res) => {
  res.send("Assignment-12 server is running");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
