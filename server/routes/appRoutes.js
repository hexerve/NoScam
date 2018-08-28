'use strict';
module.exports = function (app) {
    var VerifyToken = require('../helper/verifyToken');
    var responses = require('../helper/responses');

    var User = require('../controllers/userController');
    var Product = require('../controllers/productController');
    var Invoice = require('../controllers/invoiceController');
    var payController = require('../controllers/payController');
    var errors, results;

    // Routes
    app.get("/", function (req, res) {
        results = {
            "message": "you have successfully reached the api"
        };
        return responses.successMsg(res, results);
    });

    //user
    app.post('/login', User.login);

    app.get('/verify/email/:token', VerifyToken, User.verify);

    app.post('/verify/email', User.sendVerificationLink);

    app.post('/user', User.register);

    app.get('/user', VerifyToken, User.current_user);


    //product
    app.get('/products/:page', VerifyToken, Product.getProducts);
    
    app.post('/products', VerifyToken, Product.addProduct);

    app.put('/products', VerifyToken, Product.updateProduct);

    app.delete('/products', VerifyToken, Product.deleteProduct);

    app.get('/products/:page/seller/:sellerId', VerifyToken, Product.getProductsBySeller);

    //Cart
    app.get('/cart', VerifyToken, Invoice.getCart);

    app.put('/cart', VerifyToken, Invoice.updateCart);

    app.post('/cart', VerifyToken, Invoice.createInvoice);
    
    app.delete('/cart', VerifyToken, Invoice.deleteInvoice);

    app.put('/cart/checkout', VerifyToken, Invoice.checkout);

    app.get('/orders', VerifyToken, Invoice.getOrders);



    app.post('/payment/payumoney',payController.payUMoneyPayment);

    app.post('/payment/payumoney/response', payController.payUMoneyPaymentResponse);

    
    // star routes
    app.get('*', function (req, res) {
        return responses.errorMsg(res, 404, "Not Found", "path not found.", null);
    });

    app.put('*', function (req, res) {
        return responses.errorMsg(res, 404, "Not Found", "path not found.", null);
    });

    app.delete('*', function (req, res) {
        return responses.errorMsg(res, 404, "Not Found", "path not found.", null);
    });

    app.post('*', function (req, res) {
        return responses.errorMsg(res, 404, "Not Found", "path not found.", null);
    });

};