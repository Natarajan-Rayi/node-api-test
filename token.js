const axios = require("axios");
const jwt = require('jsonwebtoken');
const secretKey = 'ZkTCP1MMbChTPCe_BD90j_8qgW5uNJTsoV3skP06Vj'; // Replace with your secret key

// Function to generate an access token
function generateAccessToken(user) {
  const payload = {
    // Include relevant user information in the payload
    userId: user.id,
    email: user.email,
    // Add any additional data you need
  };

  const options = {
    expiresIn: '1m', // Token expiration time
  };

  return jwt.sign(payload, secretKey, options);
}

// Function to generate a refresh token
function generateRefreshToken(user) {
  const payload = {
    userId: user.id,
  };

  const options = {
    expiresIn: '7d', // Token expiration time
  };

  return jwt.sign(payload, secretKey, options);
}

// Function to verify and refresh the access token
function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, secretKey);
    return decoded;
  } catch (error) {
    // Token verification failed
    return null;
  }
}

// Function to refresh the access token using a valid refresh token
function refreshAccessToken(refreshToken) {
  try {
    const decoded = jwt.verify(refreshToken, secretKey);
    const user = {
      id: decoded.userId,
      email: decoded.email,
    };
    return generateAccessToken(user);
  } catch (error) {
    // Refresh token verification failed
    return null;
  }
}

module.exports = { generateAccessToken, generateRefreshToken, verifyAccessToken, refreshAccessToken };