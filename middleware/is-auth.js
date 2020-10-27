module.exports = (req, res, next) => {

  if (!req.session.isLoggedIn) {
    return res.redirect("/login");
  }
  // otherwise if req.session.isLoggedIn is true => proceed
  // next() will pass to be parsed in to the next handler
  // in the router.get("/add-product", isAuth, adminController.getAddProduct) and others
  // see execution in routes --> admin.js and --> shop.js
  next();
};