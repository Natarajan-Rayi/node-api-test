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
        res.status(200).json({
          status: res.status,
          message: "Device register stored successfully",
        });
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

app.post("/user-signin", authenticateToken, (req, res) => {
  const body = req.body;
  if (body.userName == "" && body.password == "") {
    res.status(200).json({
      status: res.status,
      message: "Please enter your user name and password",
    });
  } else if (body.userName == "") {
    res
      .status(200)
      .json({ status: res.status, message: "Please enter a user name" });
  } else if (body.password == "") {
    res
      .status(200)
      .json({ status: res.status, message: "Please enter a password" });
  } else {
    // db.collection("user_register")
    //   .add({
    //     user_name: body.userName,
    //     password: body.password,
    //     secret_code: "",
    //   })
    //   .then((docRef) => {})
    //   .catch((error) => {
    //     res.status(500).json({ message: error });
    //   });
    const collectionRef = db.collection("user_register");

    // Query to check if both fields exist
    const query = collectionRef
      .where("user_name", "==", body.userName)
      .where("password", "==", body.password);

    query
      .get()
      .then((querySnapshot) => {
        if (querySnapshot.empty) {
          res.status(500).json({
            status: res.status,
            message: "User name or password is incorrect",
          });
        } else {
          querySnapshot.forEach((docRef) => {
            const data = {
              key1: docRef.id,
            };

            // Build the query string from the data object
            const queryString = Object.keys(data)
              .map(
                (key) =>
                  `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`
              )
              .join("&");

            res.redirect(`/secret-code-generate?${queryString}`);
            res.status(200).json({
              status: res.status,
              message: "user detail correct",
            });
          });
          console.log("Fields exist in the documents");
          // Perform further operations if needed
        }
      })
      .catch((error) => {
        console.error("Error checking fields:", error);
      });
  }
});

app.get("/secret-code-generate", (req, res) => {
  const { key1 } = req.query;
  const min = 100000;
  const max = 999999;
  const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;

  db.collection("user_register")
    .doc(key1) // Replace docId with the ID of the document you want to update
    .update({
      secret_code: parseInt(randomNumber),
      timestamp: admin.firestore.Timestamp.now(),
      // Update the 'secret_code' field with a new value
    })
    .then(() => {
      res.status(200).json({
        status: res.status,
        doc_id: key1,
        secret_code: randomNumber,
      });
    })
    .catch((error) => {
      res.status(500).json({ message: error });
    });
});

app.post("/verify-secret-code", authenticateToken, (req, res) => {
  /* This code is querying the Firestore database to check if a document exists with a specific
  `doc_id` and `secret_code`. If the query returns an empty result, it means that the secret code is
  incorrect and the server responds with a JSON message indicating that. */
  const body = req.body;
  const collectionRef = db.collection("user_register");
  const query = collectionRef
    // .where("doc_id", "==", body.doc_id)
    .where("secret_code", "==", body.secret_code);

  query.get().then((querySnapshot) => {
    if (querySnapshot.empty) {
      res.status(200).json({
        status: res.status,
        message: "Secret code is incorrect",
      });
    } else {
      const documentData = querySnapshot.docs[0].data();
      const timestamp = documentData.timestamp;
      const currentTime = admin.firestore.Timestamp.now();

      // Compare the timestamp with the current time
      const diffInSeconds = Math.abs(currentTime.seconds - timestamp.seconds);

      if (diffInSeconds <= 60) {
        res.status(200).json({
          status: res.status,
          message: "login successfully",
        });
      } else {
        res.status(200).json({
          status: res.status,
          message: "The time is more than 60 seconds please try again.",
        });
        console.log("The time is more than 60 seconds please try again.");
      }
    }
  });
});
// mail notification send
app.get("/notification-send", (req, res) => {});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
