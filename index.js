require("dotenv").config();

const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
const cors = require("cors");
const stripe = require("stripe")(process.env.SECRET_KEY);

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const jwt = require("jsonwebtoken");

// Middleware------
app.use(express.json());
app.use(cors());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xxu5i.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// jwt verify======================

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "UnAuthorized access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}
// jwt verify======================

// client section start================================================================

async function run() {
  try {
    // collection start====================================
    await client.connect();
    const toolsCollection = client
      .db("toolscollection_database")
      .collection("alltools");
    const profileCollection = client
      .db("toolscollection_database")
      .collection("profile");
    const reviewCollection = client
      .db("toolscollection_database")
      .collection("reviews");
    const orderCollection = client
      .db("toolscollection_database")
      .collection("orders");
    const paymentCollection = client
      .db("toolscollection_database")
      .collection("payment");
    const userCollection = client
      .db("toolscollection_database")
      .collection("users");
    // collection end=============================================
    app.post("/tool", verifyJWT, async (req, res) => {
      const newproduct = req.body;
      const result = await toolsCollection.insertOne(newproduct);
      res.send(result);
    });

    // app.put("/inventory/:id", async (req, res) => {
    //   const id = req.params.id;
    //   const updateProduct = req.body;
    //   const query = { _id: ObjectId(id) };
    //   const options = { upsert: true };
    //   const updateDoc = {
    //     $set: {
    //       quantity: updateProduct.newQuantity,
    //     },
    //   };

    //   const result = await toolsCollection.updateOne(query, updateDoc, options);
    //   res.send(result);
    // });

    app.get("/tool", verifyJWT, async (req, res) => {
      const query = {};
      const result = await toolsCollection.find(query).toArray();
      res.send(result);
    });
    app.delete("/tool/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await toolsCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/manageorder", verifyJWT, async (req, res) => {
      const query = {};
      const result = await orderCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/tool/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await toolsCollection.findOne(query);
      res.send(result);
    });

    // payment method api start===========================
    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const service = req.body;
      // console.log(service);
      const price = service?.price;
      // console.log("this is price", price);
      const amount = price * 100;
      // console.log("this is amount", amount);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({ clientSecret: paymentIntent.client_secret });
    });

    // payment method api end===========================

    // update user start===================================================

    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "40d" }
      );
      res.send({ result, token });
    });
    app.get("/user", verifyJWT, async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });

    // update user end===================================================
    // make admin ======================
    app.put("/user/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({
        email: requester,
      });
      if (requesterAccount.role === "admin") {
        const filter = { email: email };
        const updateDoc = {
          $set: { role: "admin" },
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
      } else {
        res.status(403).send({ message: "forbidden access" });
      }
    });

    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user?.role === "admin";
      res.send({ admin: isAdmin });
    });

    // make admin end ======================

    // reviews section start========================
    app.get("/review", async (req, res) => {
      const query = {};
      const review = await reviewCollection.find(query).toArray();
      res.send(review);
    });
    app.post("/review", async (req, res) => {
      const newreview = req.body;
      const result = await reviewCollection.insertOne(newreview);
      res.send(result);
    });

    // reviews section end========================
    // order post section start==================
    app.post("/order", async (req, res) => {
      const placeorder = req.body;
      const orderresult = await orderCollection.insertOne(placeorder);

      res.send(orderresult);
    });
    app.get("/myorder/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const decodedemail = req.decoded.email;
      if (email === decodedemail) {
        const query = { email: email };
        const result = await orderCollection.find(query).toArray();

        res.send(result);
      } else {
        return res.status(403).send({ message: "forbidden access" });
      }
    });

    // find order with id===================
    app.get("/payorder/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await orderCollection.findOne(query);
      res.send(result);
    });

    // find order with id===================

    app.patch("/paymentorder/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          paid: true,
          status: "pending",
          transactionId: payment.transactionId,
        },
      };

      const result = await paymentCollection.insertOne(payment);
      const updatedOrder = await orderCollection.updateOne(filter, updatedDoc);
      res.send(updatedOrder);
    });

    //orders update api
    app.patch("/manageOrder/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const updateDoc = {
        $set: {
          status: "shipped",
        },
      };
      const result = await orderCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.delete("/admindelete/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await orderCollection.deleteOne(query);
      res.send(result);
    });

    // order post section end==================
    // update profile start=============
    app.put("/profile/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const update = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: update,
      };
      const result = await profileCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });
    app.get("/updatedprofile/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const decodedemail = req.decoded.email;
      if (email === decodedemail) {
        const result = await profileCollection.findOne(query);
        res.send(result);
      } else {
        return res.status(403).send({ message: "forbidden access" });
      }
    });
    // update profile end=============
    // delete order start=================
    app.delete("/myorder/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await orderCollection.deleteOne(query);
      res.send(result);
    });

    // delete order end=================
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
