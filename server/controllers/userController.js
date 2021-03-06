var mongoose = require('mongoose');
var User = require('../models/userModel');
User = mongoose.model('user');

var Verification = require('../models/verificationModel');
Verification = mongoose.model('verification');

var Payment = require('../controllers/paymentController');

var jwt = require('jsonwebtoken');
var bcrypt = require('bcryptjs');
var config = require('../config');

Mail = require('../helper/mail');
var responses = require('../helper/responses');
var AuthoriseUser = require('../helper/authoriseUser');

module.exports.register = function (req, res) {
    var hashedPassword = bcrypt.hashSync(req.body.password, 8);

    req.body.password = hashedPassword;
    User.create(req.body,
        function (err, user) {
            if (err) {

                if ((err.name && err.name == "UserExistsError") || (err.code && err.code == 11000)) {
                    return responses.errorMsg(res, 409, "Conflict", "user already exists.", null);

                } else if (err.name && err.name == "ValidationError") {
                    errors = {
                        "index": Object.keys(err.errors)
                    };
                    return responses.errorMsg(res, 400, "Bad Request", "validation failed.", errors);

                } else if (err.name && err.name == "CastError") {
                    errors = {
                        "index": err.path
                    };
                    return responses.errorMsg(res, 400, "Bad Request", "cast error.", errors);

                } else {
                    console.log(err);
                    return responses.errorMsg(res, 500, "Unexpected Error", "unexpected error.", null);
                }
            }

            // create a token
            var token = jwt.sign({
                id: user._id
            }, config.secret, {
                expiresIn: 86400 // expires in 24 hours
            });

            Verification.create({
                    userID: user._id,
                    key: token
                },
                function (err, verification) {
                    if (err) {
                        return responses.errorMsg(res, 500, "Unexpected Error", "unexpected error.", null);
                    } else {

                        var link = 'http://localhost:3000/verify/email/' + token;

                        Mail.verification_mail(req.body.email, link);

                        return responses.successMsg(res, null);
                    }
                });

        });
};

module.exports.login = function (req, res) {

    User.findOne({
        email: req.body.email
    }, function (err, user) {

        if (err) {
            console.log(err);
            return responses.errorMsg(res, 500, "Unexpected Error", "unexpected error.", null);
        }

        if (!user) {
            return responses.errorMsg(res, 404, "Not Found", "user not found", null);
        }

        var passwordIsValid = bcrypt.compareSync(req.body.password, user.password);

        if (!passwordIsValid) {
            errors = {
                auth: false,
                token: null,
                "msg": null
            };
            return responses.errorMsg(res, 401, "Unauthorized", "incorrect password.", errors);
        }

        if (!user.isVerifiedEmail) {
            errors = {
                auth: false,
                token: null,
                "msg": null
            };
            return responses.errorMsg(res, 401, "Unauthorized", "Verify your account to login.", errors);
        }

        var token = jwt.sign({
            id: user._id
        }, config.secret, {
            expiresIn: 86400 // expires in 24 hours
        });

        results = {
            auth: true,
            token: token
        };
        return responses.successMsg(res, results);
    });
};

module.exports.current_user = function (req, res) {
    AuthoriseUser.getUser(req, res, function (user) {
        user.password = undefined;
        user.__v = undefined;
        results = {
            user: user
        };
        return responses.successMsg(res, results);
    });
};

module.exports.verify = function (req, res) {
    if (!req.id || req.id.length !== 24) {
        return responses.errorMsg(res, 400, "Bad Request", "incorrect user id.");
    }
    Verification.findOneAndRemove({
        userID: req.id
    }, function (err, verified) {
        if (err) {
            return responses.errorMsg(res, 500, "Unexpected Error", "unexpected error.", null);
        }
        if (!verified) {
            return responses.errorMsg(res, 410, "Gone", "link has been expired.", null);
        } else {
            User.findOneAndUpdate({
                _id: req.id
            }, {
                isVerifiedEmail: true
            }, function (err, user) {
                if (err) {
                    return responses.errorMsg(res, 500, "Unexpected Error", "unexpected error.", null);
                }

                if (!user) {
                    return responses.errorMsg(res, 404, "Not Found", "user not found.", null);
                }
                user.email_verification = true;
                return res.redirect("http://localhost:80");
            });
        }
    });
};

module.exports.sendVerificationLink = function (req, res) {

    User.findOne({
        email: req.body.email
    }, function (err, user) {

        if (err) {
            return responses.errorMsg(res, 500, "Unexpected Error", "unexpected error.", null);
        }

        if (!user) {
            return responses.errorMsg(res, 404, "Not Found", "user not found.", null);
        }

        if (user.isVerifiedEmail !== false) {
            return responses.errorMsg(res, 208, "Already Reported", "already verified.", null);
        } else {
            var token = jwt.sign({
                id: user._id
            }, config.secret, {
                expiresIn: 86400 // expires in 24 hours
            });

            Verification.findOneAndUpdate({
                    email: req.body.email
                }, {
                    key: token
                },
                function (err, verification) {
                    if (err) {
                        return responses.errorMsg(res, 500, "Unexpected Error", "unexpected error.", null);
                    } else {
                        user.password = undefined;

                        var link = 'http://localhost:3000/verify/email/' + token;

                        Mail.verification_mail(req.body.email, link);

                        return responses.successMsg(res, null);
                    }
                });
        }
    });
};

module.exports.deduct = function (req, res, userID, invoices, balance, amount, tax, charge, bill) {

    User.findOneAndUpdate({
        _id: userID
    }, {
        balance: balance
    }, function (err, user) {
        if (err) {
            return responses.errorMsg(res, 500, "Unexpected Error", "unexpected error.", null);
        }

        if (!user) {
            return responses.errorMsg(res, 404, "Not Found", "user not found.", null);
        }

        Payment.create(req, res, userID, invoices, amount, tax, charge, bill);
    });
};

module.exports.addMoney = function(req, res, email, amount){
    User.findOneAndUpdate({
        email: email
    }, {
        $inc: { balance: amount }
    },
    function (err, user) {
        if (err) {
            return responses.errorMsg(res, 500, "Unexpected Error", "unexpected error.", null);
        } else {

            return responses.successMsg(res, null);
        }
    });
}

module.exports.update = function(req, res){
    AuthoriseUser.getUser(req, res, function (user) {
        User.findByIdAndUpdate(user._id, {
            fname: req.body.fname,
            mname: req.body.mname,
            lname: req.body.lname,
            mobile: req.body.mobile
        },
        function (err, user) {
            if (err) {
                if (err.name && err.name == "ValidationError") {
                    errors = {
                        "index": Object.keys(err.errors)
                    };
                    return responses.errorMsg(res, 400, "Bad Request", "validation failed.", errors);

                } else if (err.name && err.name == "CastError") {
                    errors = {
                        "index": err.path
                    };
                    return responses.errorMsg(res, 400, "Bad Request", "cast error.", errors);

                } else {
                    console.log(err);
                    return responses.errorMsg(res, 500, "Unexpected Error", "unexpected error.", null);
                }
            } else {
                return responses.successMsg(res, null);
            }
        });
    });
};