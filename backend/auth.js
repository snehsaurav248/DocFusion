const jwt = require("jsonwebtoken");
const SECRET_KEY = "your_secret_key";
const authenticateUser = async(req, res, next) => {
    const token = req.header("Authorization")?.split(" ")[1];
  
    if (!token) return res.status(401).json({ message: "Unauthorized! No token provided." });
  
    await jwt.verify(token, SECRET_KEY, (err, decoded) => {
      if (err) return res.status(403).json({ message: "Invalid or expired token!" });
  
      req.user = decoded; // Set user in request
      next();
    });
  };
  module.exports = {authenticateUser};

  