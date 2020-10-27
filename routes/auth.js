const express = require("express");

const authController = require("../controllers/auth");
// destruction
const { check, body } = require("express-validator/check");
const User = require("../models/user");

const router = express.Router();

router.get("/login", authController.getLogin);

router.get("/signup", authController.getSignup);

router.post("/login",
    [
      body("email")
          .isEmail()
          .withMessage("Please enter a valid email address.")
          // sanitizing method
          .normalizeEmail(),
      body("password", "Password has to be valid")
          .isLength({ min: 5 })
          .isAlphanumeric()
          // sanitizing method to remove whitespace
          .trim()
    ],
    authController.postLogin);

router.post(
    "/signup",
    [
      //  in argument we put specific field of check in this case is an email
      check("email")
          .isEmail()
          .withMessage("Please enter a valid E-mail.")
          .custom((value, { req }) => {

            // if (value === "test@test.com") {
            //   throw Error("This email is forbidden !");
            // }
            // return true;

            // Adding Async Validation
            return User.findOne({ email: value })
                .then(userDoc => {

                  if (userDoc) {

                    return Promise
                        .reject("E-mail exists already," +
                            " please pick a different one!"
                        );
                  }
                });
          })
          .normalizeEmail(),
      // it can be use through the check() similar to email check
      // it can be alternative way through the body
      body(
          "password",
          "Please enter a password with only" +
          " numbers and text and at least 5 characters"
      )
          .isLength({ min: 5 })
          .isAlphanumeric()
          .trim(),
      body("confirmPassword")
          .custom((value, { req }) => {

            if (value !== req.body.password) {
              throw new Error("Password have to match!");
            }

            return true;

          })
          .trim()
    ],
    authController.postSignup);

router.post("/logout", authController.postLogout);

router.get("/reset", authController.getReset);

router.post("/reset", authController.postReset);

router.get("/reset/:token", authController.getNewPassword);

router.post("/new-password", authController.postNewPassword);

module.exports = router;