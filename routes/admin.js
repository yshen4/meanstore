var express = require('express');
var router = express.Router();
var Cart = require('../models/cart');
var Category = require('../models/category');
var Product = require('../models/product');
var User = require('../models/user');
var Ticket = require('../models/ticket');
var Order = require('../models/order');
var passport = require('passport');
var moment = require('moment');
var mongoose = require('mongoose');
// var csrf = require('csurf');
var User = require('../models/user');
var Payment = require('../models/payment');
var fileUpload = require('express-fileupload');
var fs = require('fs');
var csv = require('ya-csv');
var uuid = require('uuid');
var Config = require('../config/config');
var Stats = require('../local_modules/stats');
// var csrfProtection = csrf();

// router.use(csrfProtection);

/* GET home page. */
router.get('/', function(req, res, next) {
	errorMsg = req.flash('error')[0];
	successMsg = req.flash('success')[0];
    var tot = totalSales(function(err,next) {
    	if (err) {
    		console.log(err.message);
    		return res.error('err');
    	}
     	console.log('back with total ', tot);
    });
    Order.find({}, function(err, docs) {
        console.log("orders: " + docs);
        Product.find(function(err, products) {
            productChunks = [];
            chunkSize = 5;
            for (var i = (5 - chunkSize); i < products.length; i += chunkSize) {
                productChunks.push(docs.slice(i, i + chunkSize))
            }
            // res.render('shop/index', {
            // 	title: 'MEAN Store', 
            // 	products: productChunks,
            // 	user: user
            //   	});
            res.render('admin/index', {
                layout: 'admin-page.hbs',
                products: productChunks,
                errorMsg: errorMsg,
                successMsg: successMsg,
                noErrorMsg: !errorMsg,
                noMessage: !successMsg,
                totalSales: tot,
                orders: docs,
                noErrors: 1
            });
        });
    });
});
router.get('/orders:filter?',function(req, res, next) {

    var filter = req.query.filter;
    console.log("Filter " + filter);

    if (!filter || filter=='allOrders') {
        var allOrders = true;
        var pendingOrders = false;
        var pickedUpOrders = false;
        qryFilter = {};
    } else {
        if (filter=='pendingOrders') {
            var allOrders = false;
            var pendingOrders = true;
            var pickedUpOrders = false;
            qryFilter = {$or: [{ receipt_status: 'pending'},{receipt_status: 'partial'}, {receipt_status: 'New'}, {receipt_status: ''}]};
        } else {
            if (filter=='pickedUpOrders'|| filter=='complete') {
                var allOrders = false;
                var pendingOrders = false;
                var pickedUpOrders = true;
                qryFilter = {receipt_status: 'complete'};
            } 
        }
    }
    successMsg = req.flash('success')[0];
    errorMsg = req.flash('error')[0];
    var adminPageTitle = "Orders";
    var adminPageUrl = "/admin/orders";

    console.log("Stats in route " + JSON.stringify(res.locals.stats));
    Order.find(qryFilter, function(err, orders) {
        Stats.getStats(function(err,stats){
            console.log("Got Stats? " + JSON.stringify(stats));
            if (err) {
                console.log(error.message);
                res.send(500,"error fetching orders");
            }
            res.render('admin/orders', {
                adminPageTitle: adminPageTitle,
                adminPageUrl: adminPageUrl,
                layout: 'admin-page.hbs',
                // csrfToken: req.csrfToken(),
                noMessage: !successMsg,
                noErrorMsg: !errorMsg,
                allOrders: allOrders,
                pendingOrders: pendingOrders,
                pickedUpOrders: pickedUpOrders,
                errorMsg: errorMsg,
                user: req.user, 
                stats: stats,
                orders: orders,
                isLoggedIn:req.isAuthenticated(),
                successMsg: successMsg
            });
        })

    })
})

router.post('/delete-order', function(req, res, next) {
    successMsg = req.flash('success')[0];
    errorMsg = req.flash('error')[0];
    var order_id = req.body._id;

    Order.remove({_id: order_id}, function(err) {
        if (err) {
            res.send(500,'Error deleting order.');
        }
        res.redirect('/admin/orders');
    })
})

router.post('/update-order', function(req, res, next) {
    successMsg = req.flash('success')[0];
    errorMsg = req.flash('error')[0];
    var status = req.body.status;
    var receiver = req.body.receiver;
    var note = req.body.note;
    var order_id = req.body._id;
    var query = { '_id': order_id };
    Order.findOne({_id: order_id}, function(err, order) {
        console.log("Order: " + order);
        if (err) {
            res.send(500,'Error deleting order.');
        }
        order.receipt_status = status;
        order.note = note;
        order.receiver = receiver;
        order.save(function(err) {
            if (err)
                console.log("ERROR: " + err.message);
        })
        res.redirect('/admin/orders');
    })
})

router.get('/users:filter?',function(req, res, next) {

    var filter = req.query.filter;
    console.log("Filter " + filter);
    qryFilter = {};

    if (!filter || filter=='allOrders') {
        var allUsers = true;
        var adminUsers = false;
        var nonAdminUsers = false;
        qryFilter = {};
    } else {
        if (filter=='adminUsers') {
            var allUsers = false;
            var adminUsers = true;
            var nonAdminUsers = false;
            qryFilter = { role: 'admin'};
        } else {
            if (filter=='nonAdminUsers') {
                var allUsers = false;
                var adminUsers = false;
                var nonAdminUsers = true;
                qryFilter = {$or: [{ role: ''},{role: 'user'}, {role: 'New'}, {role: 'visitor'}]};
            }
        }
    }
    successMsg = req.flash('success')[0];
    errorMsg = req.flash('error')[0];
    var adminPageTitle = "Users";
    var adminPageUrl = "/admin/users";

    console.log("Stats in route " + JSON.stringify(res.locals.stats));
    User.find(qryFilter, function(err, users) {
        Stats.getStats(function(err,stats){
            console.log("Got Stats? " + JSON.stringify(stats));
            if (err) {
                console.log(error.message);
                res.send(500,"error fetching orders");
            }
            res.render('admin/users', {
                adminPageTitle: adminPageTitle,
                adminPageUrl: adminPageUrl,
                layout: 'admin-page.hbs',
                // csrfToken: req.csrfToken(),
                noMessage: !successMsg,
                noErrorMsg: !errorMsg,
                allUsers: allUsers,
                adminUsers: adminUsers,
                nonAdminUsers: nonAdminUsers,
                errorMsg: errorMsg,
                user: req.user, 
                stats: stats,
                users: users,
                isLoggedIn:req.isAuthenticated(),
                successMsg: successMsg
            });
        })

    })
})


/* Display all tickets purchased */
router.get('/tickets',function(req, res, next) {

    Ticket.find({},function(err,tickets) {
        if (err) {
            console.log("Error: " + err.message);
        }
        res.render('admin/tickets', {
            layout: 'admin-page.hbs',
            // csrfToken: req.csrfToken(),
            noMessage: !successMsg,
            noErrorMsg: !errorMsg,
            errorMsg: errorMsg,
            user: req.user, 
            isLoggedIn:req.isAuthenticated(),
            successMsg: successMsg
        });
    })

})
/* Render file upload for data input */
router.get('/import', function(req, res, next) {
    successMsg = req.flash('success')[0];
    errorMsg = req.flash('error')[0]
    res.render('admin/import', {
	    layout: 'admin-page.hbs',
		// csrfToken: req.csrfToken(),
	    noMessage: !successMsg,
	    noErrorMsg: !errorMsg,
	    errorMsg: errorMsg,
	    user: req.user, 
	    isLoggedIn:req.isAuthenticated(),
	    successMsg: successMsg
	});
});

/* Recieve posted CSV */
router.post('/import', function(req, res, next) {
    var sampleFile;
    console.log('File name is ' + req.files.csvFile.name);
    console.log('File size is ' + req.files.csvFile.size);
    console.log('File size is ' + req.files.csvFile.path);
 	var firstHeaders = req.body.header;
    if (!req.files) {
    	if (!req.body.csvPaste) {
        	res.send('No files were uploaded and no data pasted.');
        	return;
    	}
    }
    csvFile = req.files.csvFile;
    tmpFile = uuid.v4() + '.csv'
    csvFile.mv('/var/tmp/' + tmpFile, function(err) {
        if (err) {
            res.status(500).send(err);
        } else {
        	// req.flash('success','File successfully uploaded');
            // res.send('File uploaded!');
            var reader = csv.createCsvFileReader('/var/tmp/' + tmpFile, {
			    'separator': ',',
			    'quote': '"',
			    'escape': '"',       
			    'comment': '',
			    'columnsFromHeader': firstHeaders
			});
			reader.addListener('data', function(data) {
			    writer.writeRecord([ data[0] ]);
			});
			console.log(data);
        }
    });
});

/* GET home page. */
router.get('/products',function(req, res, next) {
    successMsg = req.flash('success')[0];
    errorMsg = req.flash('error')[0];
    var adminPageTitle = "Products";
    var adminPageUrl = "/admin/products";
    Product.find({}, function(err, products) {
        Category.find({},function(err,allcats) {

        Stats.getStats(function(err,stats){
            if (err) {
                console.log(error.message);
                res.send(500,"error fetching products");
            }
            res.render('admin/products', {
                adminPageTitle: adminPageTitle,
                adminPageUrl: adminPageUrl,
                layout: 'admin-page.hbs',
                // csrfToken: req.csrfToken(),
                noMessage: !successMsg,
                noErrorMsg: !errorMsg,
                errorMsg: errorMsg,
                user: req.user,
                stats: stats,
                products: products,
                allcats: allcats,
                isLoggedIn:req.isAuthenticated(),
                successMsg: successMsg
            });
        })
    });


    })
})

router.get('/edit-product/:id', function(req, res, next) {
	productId = req.params.id;
	errorMsg = req.flash('error')[0];
	successMsg = req.flash('success')[0];
	Product.findById(req.params.id, function(err, product) {
    	if (err) {
    		req.flash('error','Error: ' + err.message);
    		return res.redirect('/admin');
    	}
    	console.log("product: " + product);
    	res.render('admin/editProduct',{
    		product: product,
    		layout: 'fullpage.hbs',
    		product: product,
    		errorMsg: errorMsg,
    		successMsg: successMsg,
    		noErrorMsg: !errorMsg,
    		noMessage: !successMsg

    	})
    });
})

router.post('/product/:id', function(req, res, next) {
    productID = req.params.id;
    Product.findById(req.params.id, function(err, product) {
        product.title = req.body.title;
        product.description = req.body.description;
        product.price = req.body.price;
        product.type = req.body.price;
        product.updated = Date.now();
        product.imagePath = req.body.imagePath;
    });
    product.save(function(err) {
        if (!err) {
            console.log("updated");
        } else {
            console.log(err);
        }
        res.render('admin/index', {
            products: productChunks,
            noErrors: 1
        });
    })
});

router.get('/setup', isAdmin, function(req, res, next) {
	errorMsg = req.flash('error')[0];
	successMsg = req.flash('success')[0];
	res.render('admin/setup',{
		config: Config
	})
})

module.exports = router;
function isAdmin(req, res, next) {
	console.log(req.user);
	if (req.user.role =='admin') {
		return next();
	}
	req.flash('error','Not authorized');
	res.redirect('/');
}

function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/');
}

function notLoggedIn(req, res, next) {
    if (!req.isAuthenticated()) {
        return next();
    }
    res.redirect('/');
}

var totalSales = function() {
    Order.aggregate({
        $match: {
            "status": "approved"
        }
    }, {
        $group: {
            _id: null,
            'Total': {
                $sum: '$cart.totalPrice'
            }
        }
    }, function(err, doc) {
    	if (err) {
    		console.log("err: " + err.message);
    	}
        console.log('Total ', doc[0].Total);
		return doc;

    });
}
