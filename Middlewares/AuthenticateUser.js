const jwt = require('jsonwebtoken');
const secret = process.env.SECRET_KEY;

// Middleware to check the token
const authenticateUser = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
        return res.status(401).send('Access denied, no token provided');
    }

    jwt.verify(token, secret, (err, decoded) => {
        if (err) {
            return res.status(401).send('Invalid or expired token');
        }
        req.user = decoded;
        next();
    });
};

module.exports = authenticateUser;