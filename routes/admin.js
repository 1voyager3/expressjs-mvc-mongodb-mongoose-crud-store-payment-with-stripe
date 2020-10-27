const path = require("path");
const express = require("express");
const adminController = require("../controllers/admin");
const router = express.Router();
const isAuth = require("../middleware/is-auth");
const { body } = require("express-validator/check");

// /admin/add-product => GET
// th arguments handle is going to be parsed from left to right the request will travel
// through the from left tot right
router.get("/add-product", isAuth, adminController.getAddProduct);

// /admin/products => GET
router.get("/products", isAuth, adminController.getProducts);

// /admin/add-product => POST
router.post("/add-product",
    [
      body("title")
          .isString()
          .isLength({ min: 3 })
          .trim(),
      body("price")
          // method for decimal places
          .isFloat(),
      body("description")
          .isLength({ min: 5, max: 300 })
          .trim()
    ], isAuth, adminController.postAddProduct);

router.get("/edit-product/:productId", isAuth, adminController.getEditProduct);

router.post("/edit-product",
    [
      body("title")
          .isString()
          .isLength({ min: 3 })
          .trim(),
      body("price")
          // method for decimal places
          .isFloat(),
      body("description")
          .isLength({ min: 5, max: 300 })
          .trim()
    ], isAuth, adminController.postEditProduct);

router.delete("/product/:productId", isAuth, adminController.deleteProduct);

module.exports = router;
