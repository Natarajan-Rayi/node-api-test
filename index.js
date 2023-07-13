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
  res.setHeader("xdc32332332uei5g", "X-Api-key");
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
          .json({ status: 500, ErrorMessage: "Access Token is expires." });
      }

      // Token is valid, you can access the decoded data if needed
      req.user = decoded;
      next();
    });
  } else {
    // No token provided
    res
      .status(401)
      .json({ status: 400, ErrorMessage: "Access Token is Unauthorized." }); // Unauthorized
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
    status: 200,
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
      res.status(200).json({ status: 200, Products_Specs: snapshotdb });
    })
    .catch((error) => {
      console.error("Error getting documents: ", error);
    });
});

app.post("/device-register", authenticateToken, (req, res) => {
  let data = req.body;
  if (data.devicename !== "" && data.model !== "" && data.device !== "") {
    const collectionRef = db.collection("enquiry_collection");
    const query = collectionRef.where("udid", "==", data.udid);

    query.get().then((querySnapshot) => {
      if (querySnapshot.empty) {
        data.created_date = new Date();
        data.modified_date = new Date();
        db.collection("enquiry_collection")
          .add(data)
          .then((docRef) => {
            res.status(200).json({
              status: 200,
              token_id: docRef.id,
              message: "Device register stored successfully",
            });
          })
          .catch((error) => {
            res.status(400).json({ status: 400, message: error });
          });
      } else {
        let doc_id = querySnapshot.docs[0].id;
        let documentData = querySnapshot.docs[0].data();
        const create_date = documentData.created_date;
        data.created_date = create_date;
        data.modified_date = new Date();
        db.collection("enquiry_collection")
          .doc(doc_id)
          .update(data)
          .then(() => {
            res.status(200).json({
              status: 200,
              token_id: doc_id,
              message: "Device updated successfully",
            });
          })
          .catch((error) => {
            res.status(400).json({ status: 400, message: error });
          });
      }
    });
  } else {
    let errorMessage;
    if (data.device === "") {
      errorMessage = "Fill in the empty device name field";
    } else if (data.model === "") {
      errorMessage = "Fill in the empty model name field";
    } else if (data.devicename === "") {
      errorMessage = "Fill in the empty brand name field";
    } else {
      errorMessage = "Fill in the all empty";
    }

    res.status(500).json({ status: 500, message: errorMessage });
  }
});

app.post("/user-signin", authenticateToken, (req, res) => {
  const body = req.body;
  if (body.userName == "" && body.password == "") {
    res.status(500).json({
      status: 500,
      message: "Please enter your user name and password",
    });
  } else if (body.userName == "") {
    res.status(500).json({ status: 500, message: "Please enter a user name" });
  } else if (body.password == "") {
    res.status(500).json({ status: 500, message: "Please enter a password" });
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
            // const data = {
            //   key1: docRef.id,
            // };

            // // Build the query string from the data object
            // const queryString = Object.keys(data)
            //   .map(
            //     (key) =>
            //       `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`
            //   )
            //   .join("&");

            res.status(200).json({
              status: res.status,
              doc_id: docRef.id,
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

app.get("/secret-code-generate", authenticateToken, (req, res) => {
  const key1 = req.body.doc_id;
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
        status: 200,
        doc_id: key1,
        secret_code: randomNumber,
      });
    })
    .catch((error) => {
      res.status(400).json({ status: 400, message: error });
    });
});

app.post("/verify-secret-code", authenticateToken, (req, res) => {
  /* This code is querying the Firestore database to check if a document exists with a specific
  `doc_id` and `secret_code`. If the query returns an empty result, it means that the secret code is
  incorrect and the server responds with a JSON message indicating that. */
  const body = req.body;
  const collectionRef = db.collection("user_register");
  const query = collectionRef
    .where("doc_id", "==", body.doc_id)
    .where("secret_code", "==", body.secret_code);

  query.get().then((querySnapshot) => {
    if (querySnapshot.empty) {
      res.status(400).json({
        status: 400,
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
          status: 200,
          message: "login successfully",
        });
      } else {
        res.status(500).json({
          status: 500,
          message: "The time is more than 60 seconds please try again.",
        });
        console.log("The time is more than 60 seconds please try again.");
      }
    }
  });
});
// mail notification send
app.get("/notification-send", (req, res) => {});

app.post("/user-register", authenticateToken, (req, res) => {
  const body = req.body;
  if (
    body.user_name !== "" &&
    body.password !== "" &&
    body.mobile_umber !== "" &&
    body.email !== ""
  ) {
    const collectionRef = db.collection("user_register");
    const query = collectionRef.where(
      "mobile_number",
      "==",
      body.mobile_number
    );

    query.get().then((querySnapshot) => {
      if (querySnapshot.empty) {
        body.created_date = admin.firestore.Timestamp.now();
        db.collection("user_register")
          .add(body)
          .then((docRef) => {
            res.status(200).json({
              status: 200,
              token_id: docRef.id,
              message: "user register successfully",
            });
          })
          .catch((error) => {
            res.status(400).json({ status: 400, message: error });
          });
      } else {
        res.status(200).json({
          status: res.status,
          message: "user already exist",
        });
      }
    });
  } else {
    if (
      body.user_name == "" &&
      body.password == "" &&
      body.mobile_number == "" &&
      body.email == ""
    ) {
      res.status(500).json({
        status: res.status,
        message: "Required fields are missing",
      });
    } else if (body.user_name == "") {
      res.status(500).json({
        status: res.status,
        message: "user name missing",
      });
    } else if (body.password == "") {
      res.status(500).json({
        status: res.status,
        message: "Password is missing",
      });
    } else if (body.mobile_number == "") {
      res.status(500).json({
        status: res.status,
        message: "Mobile number missing",
      });
    } else {
      res.status(500).json({
        status: res.status,
        message: "email is missing",
      });
    }
  }
});

app.get("/user-detail", authenticateToken, (req, res) => {
  let user_data_get = [];
  db.collection("user_register")
    .get()
    .then((querySnapshot) => {
      querySnapshot.forEach((doc) => {
        // doc.data() is never undefined for query doc snapshots
        console.log(doc.id, " => ", doc.data());
        let data = doc.data();
        data.doc_id = doc.id;
        user_data_get.push(data);
      });
      res.status(200).json({
        status: 200,
        user_data: user_data_get,
      });
    })
    .catch((error) => {
      res.status(400).json({
        status: 400,
        message: error,
      });
    });
});

app.post("/add-config", (req, res) => {
  const body = req.body;
  db.collection("app_config")
    .doc("config-id-2023")
    .add(body)
    .then((docRef) => {
      res.status(200).json({
        status: 200,
        doc_id: docRef.id,
        message: "app config added successfully",
      });
    })
    .catch((error) => {
      res.status(400).json({ status: 400, message: error });
    });
});

app.get("/get-config", (req, res) => {
  let config_detail = [];
  db.collection("app_config")
    .get()
    .then((querySnapshot) => {
      querySnapshot.forEach((doc) => {
        // doc.data() is never undefined for query doc snapshots
        console.log(doc.id, " => ", doc.data());
        let data = doc.data();
        data.doc_id = doc.id;
        config_detail.push(data);
      });
      res.status(200).json({
        status: 200,
        config: config_detail,
        message: "app config get successfully",
      });
    });
});

app.post("/case-id-add", authenticateToken, (req, res) => {
  const body = req.body;
  var docRef = db.collection("user_register").doc(body.doc_id);

  docRef
    .get()
    .then((doc) => {
      if (doc.exists) {
        let case_id_array = [];
        console.log("Document data:", doc.data());
        let get_exist_id = doc.data().case_id;
        if (get_exist_id === "") {
          case_id_array = [];
        } else {
          case_id_array = get_exist_id;
        }
        if (typeof body.case_id === "string") {
          case_id_array.push(body.case_id);
          var collectionRef = db.collection("user_register").doc(body.doc_id);

          // Atomically increment the population of the city by 50.
          collectionRef.update({
            case_id: case_id_array,
          });
          res.status(200).json({
            status: 200,
            msg: "case id successfully added",
          });
        } else {
          let concat_exist_id = case_id_array.concat(body.case_id);
          var collectionRef = db.collection("user_register").doc(body.doc_id);

          // Atomically increment the population of the city by 50.
          collectionRef.update({
            case_id: concat_exist_id,
          });
          res.status(200).json({
            status: 200,
            msg: "case id successfully added",
          });
        }
      } else {
        // doc.data() will be undefined in this case
        console.log("No such document!");
        res.status(500).json({
          status: 500,
          msg: "No such us a document",
        });
      }
    })
    .catch((error) => {
      console.log("Error getting document:", error);
      res.status(500).json({
        status: 400,
        msg: error,
      });
    });
});

app.post("/product-api-add", (req, res) => {
  const body = req.body;
  db.collection("product_api")
    .add(body)
    .then((docRef) => {
      res.status(200).json({
        status: 200,
        doc_id: docRef.id,
        message: "product api added successfully",
      });
    })
    .catch((error) => {
      res.status(400).json({ status: 400, message: error });
    });
});

app.get("/product-api-get", (req, res) => {
  let config_detail = [];
  db.collection("product_api")
    .get()
    .then((querySnapshot) => {
      querySnapshot.forEach((doc) => {
        // doc.data() is never undefined for query doc snapshots
        console.log(doc.id, " => ", doc.data());
        let data = doc.data();
        data.doc_id = doc.id;
        config_detail.push(data);
      });
      res.status(200).json({
        status: 200,
        data: config_detail,
        message: "product api get successfully",
      });
    });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
