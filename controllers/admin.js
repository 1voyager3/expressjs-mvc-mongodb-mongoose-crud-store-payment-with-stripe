const Product = require("../models/product");
const { validationResult } = require("express-validator/check");
// the function for deleting the files from a file system
const fileHelper = require("../util/file");

exports.getAddProduct = (req, res, next) => {

  // this is route protection but it's not a scalable way
  /*
  if (!req.session.isLoggedIn) {
    return res.redirect("/login");
  }
  */

  res.render("admin/edit-product", {
    pageTitle: "Add Product",
    path: "/admin/add-product",
    editing: false,
    hasError: false,
    errorMessage: null,
    validationErrors: []
  });
};

exports.postAddProduct = (req, res, next) => {
  const title = req.body.title;
  const image = req.file;
  const price = req.body.price;
  const description = req.body.description;

  if (!image) {
    return res.status(422)
        .render("admin/edit-product", {
          pageTitle: "Add Product",
          path: "/admin/add-product",
          editing: false,
          hasError: true,
          product: {
            title: title,
            price: price,
            description: description
          },
          errorMessage: "Attached file is not an image.",
          validationErrors: []
        });
  }

  const imageUrl = image.path;

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422)
        .render("admin/edit-product", {
          pageTitle: "Add Product",
          path: "/admin/add-product",
          editing: false,
          hasError: true,
          product: {
            title: title,
            imageUrl: imageUrl,
            price: price,
            description: description
          },
          errorMessage: errors.array()[0].msg,
          validationErrors: errors.array()
        });
  }

  const product = new Product({
    // for testing errors
    // _id: new mongoose.Types.ObjectId("5f94799cee257827ab94f848"),
    title: title,
    price: price,
    description: description,
    imageUrl: imageUrl,
    userId: req.user
  });

  product.save()
      .then(result => {
        // console.log(result);
        console.log("Created Product");
        res.redirect("/admin/products");
      })
      .catch(err => {

        // alternative way
        /*
        console.log('An error occurred!');
        console.log(err);
         */

        // other alternative way
        /*
        return res.status(500).render("admin/edit-product", {
              pageTitle: "Add Product",
              path: "/admin/add-product",
              editing: false,
              hasError: true,
              product: {
                title: title,
                imageUrl: imageUrl,
                price: price,
                description: description
              },
              errorMessage: 'Database operation failed, please try again',
              validationErrors: []
            });
         */

        // other alternative way
        /*
        res.redirect("/500");
         */

        // other alternative way
        const error = new Error(err);
        error.httpStatusCode = 500;

        // when we call next with an error passed as an argument, then we actually
        // let expressjs know that an error occurred and it will skip other middlewares
        // and move right away to an error handling  middleware that
        // is defined in app.js --> app.use((error, req, res, next) => {res.redirect("/500");});
        return next(error);

      });
};

exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect("/");
  }
  const prodId = req.params.productId;
  Product.findById(prodId)
      .then(product => {
        if (!product) {
          return res.redirect("/");
        }
        res.render("admin/edit-product", {
          pageTitle: "Edit Product",
          path: "/admin/edit-product",
          editing: editMode,
          product: product,
          hasError: false,
          errorMessage: null,
          validationErrors: []
        });
      })
      .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
};

exports.postEditProduct = (req, res, next) => {
  const prodId = req.body.productId;
  const updatedTitle = req.body.title;
  const updatedPrice = req.body.price;
  const image = req.file;
  const updatedDesc = req.body.description;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422)
        .render("admin/edit-product", {
          pageTitle: "Edit Product",
          path: "/admin/edit-product",
          editing: true,
          hasError: true,
          product: {
            title: updatedTitle,
            price: updatedPrice,
            description: updatedDesc
          },
          errorMessage: errors.array()[0].msg,
          validationErrors: errors.array()
        });
  }

  Product.findById(prodId)
      .then(product => {

        if (product.userId.toString() !== req.user._id.toString()) {
          return res.redirect("/");
        }

        product.title = updatedTitle;
        product.price = updatedPrice;
        product.description = updatedDesc;

        if (image) {
          // to be deleted old file after updating in images folder
          fileHelper.deleteFile(product.imageUrl);

          product.imageUrl = image.path;
        }

        return product.save()
            .then(result => {
              console.log("UPDATED PRODUCT!");
              res.redirect("/admin/products");
            });
      })
      .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
};

exports.getProducts = (req, res, next) => {

  Product.find({ userId: req.user._id })
      // .select('title price -_id')
      // .populate('userId', 'name')
      .then(products => {
        console.log(products);
        res.render("admin/products", {
          prods: products,
          pageTitle: "Admin Products",
          path: "/admin/products"
        });
      })
      .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
};

exports.deleteProduct = (req, res, next) => {

  // req.params.productId === "/product/:productId" in the routes --> admin.js
  const prodId = req.params.productId;

  Product.findById(prodId)
      .then(product => {

        if (!product) {
          next(new Error("Product not found."));
        }

        // to be deleted old file after updating in images folder
        fileHelper.deleteFile(product.imageUrl);

        return Product.deleteOne({ _id: prodId, userId: req.user._id });

      })
      .then(() => {
        console.log("DESTROYED PRODUCT");

        res.status(200).json({message: 'Success!'});

      })
      .catch(err => {
        res.status(500).json({ message: 'Deleting product failed.'});
      });
};
