const Product = require("../models/product");
const Order = require("../models/order");
const fs = require("fs");
const path = require("path");
// the package for pdf generation
const PDFDocument = require("pdfkit");

// put appropriate stripe key
const stripe = require('stripe')(process.env.STRIPE_KEY);



const ITEMS_PER_PAGE = 2;

exports.getProducts = (req, res, next) => {

  // req.query === http://localhost:3000/?
  // "query" parameter is "?" sign
  // it allow us get access to the page address
  // req.query.page === http://localhost:3000/?page=<number of the page>
  // if req.query.page is null to be used 1, especially for index page http://localhost:3000/
  const page = +req.query.page || 1;

  let totalItems;

  Product.find()
      .countDocuments()
      .then(numProducts => {

        totalItems = numProducts;

        return Product.find()
            // mongodb method pagination define how many first items to be skipped ( to be split) to show on the second and sequent pages
            .skip((page - 1) * ITEMS_PER_PAGE)
            // mongodb method pagination define how many items to be shown on the page
            .limit(ITEMS_PER_PAGE);

      })
      .then(products => {
        res.render("shop/product-list", {
          prods: products,
          pageTitle: "Products",
          path: "/products",
          currentPage: page,
          hasNextPage: ITEMS_PER_PAGE * page < totalItems,
          hasPreviousPage: page > 1,
          nextPage: page + 1,
          previousPage: page - 1,
          lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
        });
      })
      .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
};

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
      .then(product => {
        res.render("shop/product-detail", {
          product: product,
          pageTitle: product.title,
          path: "/products"
        });
      })
      .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
};

exports.getIndex = (req, res, next) => {

  // req.query === http://localhost:3000/?
  // "query" parameter is "?" sign
  // it allow us get access to the page address
  // req.query.page === http://localhost:3000/?page=<number of the page>
  // if req.query.page is null to be used 1, especially for index page http://localhost:3000/
  const page = +req.query.page || 1;

  let totalItems;

  Product.find()
      .countDocuments()
      .then(numProducts => {

        totalItems = numProducts;

        return Product.find()
            // mongodb method pagination define how many first items to be skipped ( to be split) to show on the second and sequent pages
            .skip((page - 1) * ITEMS_PER_PAGE)
            // mongodb method pagination define how many items to be shown on the page
            .limit(ITEMS_PER_PAGE);

      })
      .then(products => {
        res.render("shop/index", {
          prods: products,
          pageTitle: "Shop",
          path: "/",
          currentPage: page,
          hasNextPage: ITEMS_PER_PAGE * page < totalItems,
          hasPreviousPage: page > 1,
          nextPage: page + 1,
          previousPage: page - 1,
          lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
        });
      })
      .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
};

exports.getCart = (req, res, next) => {
  req.user
      .populate("cart.items.productId")
      .execPopulate()
      .then(user => {
        const products = user.cart.items;
        res.render("shop/cart", {
          path: "/cart",
          pageTitle: "Your Cart",
          products: products
        });
      })
      .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
};

exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
      .then(product => {
        return req.user.addToCart(product);
      })
      .then(result => {

        res.redirect("/cart");
      })
      .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  req.user
      .removeFromCart(prodId)
      .then(result => {
        res.redirect("/cart");
      })
      .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
};


exports.getCheckout = (req, res, next) => {
  let products;
  let total = 0;
  req.user
      .populate('cart.items.productId')
      .execPopulate()
      .then(user => {
        products = user.cart.items;
        total = 0;
        products.forEach(p => {
          total += p.quantity * p.productId.price;
        });

        return stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: products.map(p => {
            return {
              name: p.productId.title,
              description: p.productId.description,
              amount: p.productId.price * 100,
              currency: 'usd',
              quantity: p.quantity
            };
          }),
          //`${req.protocol}://${req.get('host')}/checkout/success` === http://localhost:3000/checkout/success
          success_url: `${req.protocol}://${req.get("host")}/checkout/success`,
          cancel_url: `${req.protocol}://${req.get("host")}/checkout/cancel`
        });
      })
      .then(session => {
        res.render('shop/checkout', {
          path: '/checkout',
          pageTitle: 'Checkout',
          products: products,
          totalSum: total,
          sessionId: session.id
        });
      })
      .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
};



/*
exports.getCheckout = (req, res, next) => {

  let products;
  let total = 0;

  req.user
      .populate("cart.items.productId")
      .execPopulate()
      .then(user => {
        const products = user.cart.items;

        let total = 0;
        products.forEach(p => {
          total += p.quantity * p.productId.price;
        });

        return stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: products.map(p => {
            return {
              name: p.productId.title,
              description: p.productId.description,
              amount: p.productId.price * 100,
              currency: "usd",
              quantity: p.quantity
            };
          }),
          //`${req.protocol}://${req.get('host')}/checkout/success` === http://localhost:3000/checkout/success
          // success_url: `${req.protocol}://${req.get("host")}/checkout/success`,
          // cancel_url: `${req.protocol}://${req.get("host")}/checkout/cancel`
          // success_url: req.protocol + '://' + req.get('host') + '/checkout/success',
          // cancel_url: req.protocol + '://' + req.get('host') + '/checkout/cancel'
        });

      })
      .then(session => {

        res.render("shop/checkout", {
          path: "/checkout",
          pageTitle: "Checkout",
          products: products,
          totalSum: total,
          sessionId: session.id

        });
      })
      .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });

};

 */



exports.getCheckoutSuccess = (req, res, next) => {
  req.user
      .populate("cart.items.productId")
      .execPopulate()
      .then(user => {
        const products = user.cart.items.map(i => {
          return { quantity: i.quantity, product: { ...i.productId._doc } };
        });
        const order = new Order({
          user: {
            email: req.user.email,
            userId: req.user
          },
          products: products
        });
        return order.save();
      })
      .then(result => {
        return req.user.clearCart();
      })
      .then(() => {
        res.redirect("/orders");
      })
      .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
};

/*

exports.postOrder = (req, res, next) => {
  req.user
      .populate("cart.items.productId")
      .execPopulate()
      .then(user => {
        const products = user.cart.items.map(i => {
          return { quantity: i.quantity, product: { ...i.productId._doc } };
        });
        const order = new Order({
          user: {
            email: req.user.email,
            userId: req.user
          },
          products: products
        });
        return order.save();
      })
      .then(result => {
        return req.user.clearCart();
      })
      .then(() => {
        res.redirect("/orders");
      })
      .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
};

 */

exports.getOrders = (req, res, next) => {
  Order.find({ "user.userId": req.user._id })
      .then(orders => {
        res.render("shop/orders", {
          path: "/orders",
          pageTitle: "Your Orders",
          orders: orders
        });
      })
      .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
};

exports.getInvoice = (req, res, next) => {

  const orderId = req.params.orderId;

  // order authorization
  Order.findById(orderId)
      .then(order => {

        if (!order) {
          return next(new Error("No order found"));
        }

        if (order.user.userId.toString() !== req.user._id.toString()) {
          return next(new Error("Unauthorized!"));
        }

        const invoiceName = "invoice-" + orderId + ".pdf";
        // system folder 'data', subsystem folder 'invoices', invoiceName is name of the file
        const invoicePath = path.join("data", "invoices", invoiceName);

        // alternative GOOD approach with PDF Generation
        const pdfDoc = new PDFDocument();

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "inline; filename=\"" + invoiceName + "\"");

        pdfDoc.pipe(fs.createWriteStream(invoicePath));
        pdfDoc.pipe(res);

        // pdfDoc.text("Hi there, it's the pdf document!");
        pdfDoc.fontSize(26)
            .text("Invoice", {
              underline: true
            });
        pdfDoc.text("=======================");

        let totalPrice = 0;

        order.products.forEach(prod => {

          totalPrice += prod.quantity * prod.product.price;

          return pdfDoc.fontSize(14)
              .text(
                  `${prod.product.title} ${prod.quantity} x $${prod.product.price}`
              );
        });

        pdfDoc.text("--------------------");
        pdfDoc.fontSize(20)
            .text(`Total Price: $ ${totalPrice}`);

        pdfDoc.end();

        // it's fine only for the small files
        // it is not good approach because
        // the operation is simply read the file and return it
        // operation: nodejs access the file, read the entire content into
        // memory and then return it with the response. This means that for
        // bigger files, this will take every long before a response is sent
        // and the memory on the server might be overflow at some point for many
        // incoming requests because it has to read all the data into memory which is limited
        /*
        fs.readFile(invoicePath, (err, data) => {
          if (err) {
            next(err);
          }

          res.setHeader("Content-Type", "application/pdf");
          res.setHeader("Content-Disposition", "inline; filename=\"" + invoiceName + "\"");
          res.send(data);
        });
         */

        /*
        // the GOOD approach without PDF generation is it should be a streaming response
        // it will be read a stream and nodejs will be able to use that to read in the file
        // step by step in different chunks
        const file = fs.createReadStream(invoicePath);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "inline; filename=\"" + invoiceName + "\"");

        // pipe() to forward the data that is read in with that stream to my response
        // because the response object is a writable stream actually and it can use readable
        // stream to pipe their output into a writable stream into the response
        // for a large files it's an advantage because node never has to pre-load all the data
        // into memory but just streams it to the client on the fly and the most it has to store is
        // one chunk of data. The buffer gives access to the chunks, we don't wait for all chunks to
        // be concatenated in an one object instead it forwarded them to the browser which then is
        // be able to concatenated the incoming data chunks into the final file
        file.pipe(res);
         */

      })
      .catch(err => {
        next(err);
      });
};