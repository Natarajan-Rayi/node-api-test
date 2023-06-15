const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const app = express();
var admin = require("firebase-admin");
const jwt = require("jsonwebtoken");
const secretKey = "ZkTCP1MMbChTPCe_BD90j_8qgW5uNJTsoV3skP06Vj"; // Replace with your secret key

const {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  refreshAccessToken,
} = require("./token");

const port = process.env.PORT || 5002; // Set the port to listen on

// Parse URL-encoded bodies
app.use(bodyParser.urlencoded({ extended: true }));

// Parse JSON bodies
app.use(bodyParser.json());

app.use(express.static("./cred"));

// setInterval(refreshAccessToken, 1000 * 60 * 5);

var serviceAccount = require("./cred/surfgeo-sale.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// Configure CORS middleware
const allowedOrigins = ["*"]; // Add your allowed origins
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

function authenticateToken(req, res, next) {
  // Get the authorization header
  const authHeader = req.headers.authorization;

  if (typeof authHeader !== "undefined") {
    // Extract the token from the authorization header
    const token = authHeader.split(" ")[1]; // Bearer <token>

    // Verify the token
    jwt.verify(token, secretKey, (err, decoded) => {
      if (err) {
        // Token verification failed
        return res
          .status(403)
          .json({ ErrorMessage: "Access Token is expires." });
      }

      // Token is valid, you can access the decoded data if needed
      req.user = decoded;
      next();
    });
  } else {
    // No token provided
    res.status(401).json({ ErrorMessage: "Access Token is Unauthorized." }); // Unauthorized
  }
}

// app.use(cors(corsOptions));
// Define routes and middleware
app.get("/JWT", (req, res) => {
  // Example usage
  const user = {
    id: "123",
    email: "user@example.com",
  };

  // Generate tokens
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  console.log("Access Token:", accessToken);
  console.log("Refresh Token:", refreshToken);

  // Verify access token
  const decodedToken = verifyAccessToken(accessToken);
  if (decodedToken) {
    console.log("Access Token is valid.");
    console.log("User ID:", decodedToken.userId);
    console.log("User Email:", decodedToken.email);
  } else {
    console.log("Access Token is invalid.");
    res.status(401).json({ ErrorMessage: "Access Token is invalid." });
  }

  // Refresh access token using refresh token
  const newAccessToken = refreshAccessToken(refreshToken);
  if (newAccessToken) {
    console.log("Access Token refreshed successfully.");
    console.log("New Access Token:", newAccessToken);
  } else {
    console.log("Refresh Token is invalid.");
    res.status(401).json({ ErrorMessage: "Refresh Token is invalid." });
  }

  res.status(200).json({
    UserID: decodedToken.userId,
    Email: decodedToken.email,
    accessToken: newAccessToken,
    refreshToken: refreshToken,
  });
});

// submission detail store
app.get("/device-info", authenticateToken, (req, res) => {
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

app.post("/submit-form", authenticateToken, (req, res) => {
  const data = req.body;
  if (data.brand !== "" && data.model !== "" && data.device !== "") {
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
    if (data.device === "") {
      errorMessage = "Fill in the empty device name field";
    } else if (data.model === "") {
      errorMessage = "Fill in the empty model name field";
    } else if (data.brand === "") {
      errorMessage = "Fill in the empty brand name field";
    } else {
      errorMessage = "Fill in the all empty";
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
