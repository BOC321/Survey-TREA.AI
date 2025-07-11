const crypto = require('crypto');

const addNonce = (req, res, next) => {
    res.locals.nonce = crypto.randomBytes(16).toString('base64');
    next();
};

module.exports = { addNonce };