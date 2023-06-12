const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const app = express();
var admin = require("firebase-admin");

const port = process.env.PORT || 5001; // Set the port to listen on

// Parse JSON bodies
app.use(bodyParser.json());

// Parse URL-encoded bodies
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("./cred"));
var serviceAccount = require("./cred/surfgeo-sale.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// Configure CORS middleware
const allowedOrigins = ["https://med4us.in", "*"]; // Add your allowed origins
const corsOptions = {
  origin: function (origin, callback) {
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
};

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "null");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// app.use(cors(corsOptions));
// Define routes and middleware
app.get("/", (req, res) => {
  res.send("Hello, World!");
});

// submission detail store
app.get("/GetAllProductsSpecs", (req, res) => {
  const data = req.body;
  console.log(data);

  db.collection("enquiry_collection")
    .get()
    .then((snapshot) => {
      let snapshotdb = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        data.id = doc.id; // Set the doc.id as the value of the id field
        snapshotdb.push(data);
      });
      console.log(snapshotdb, "snapshotdb");
      res.status(200).json({ Products_Specs: snapshotdb });
    })
    .catch((error) => {
      console.error("Error getting documents: ", error);
    });
});

app.post("/submit-form", (req, res) => {
  const data = req.body;
  if (data.Products_Specs.Mobile_name !== "" && String(data.Products_Specs.Mobile_number).length === 10) {
    db.collection("enquiry_collection")
      .add(data)
      .then((docRef) => {
        res.status(200).json({ message: "Data stored successfully" });
      })
      .catch((error) => {
        res.status(500).json({ message: error });
      });
  } else {
    let errorMessage;
    if (data.Products_Specs.Mobile_name === "") {
      errorMessage = "Fill in the empty Mobile name field";
    } else if (String(data.Products_Specs.Mobile_number).length !== 10) {
      errorMessage = "Enter at least 10 mobile numbers";
    } else {
      errorMessage = "Fill in the empty Mobile name field and Mobile number";
    }

    res.status(200).json({ message: errorMessage });
  }
});


// mail notification send
app.get("/notification-send", (req, res) => {});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
