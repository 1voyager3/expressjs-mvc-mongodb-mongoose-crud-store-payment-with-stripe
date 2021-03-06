const path = require('path');
const fs = require('fs');
const https = require('https');
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const errorController = require('./controllers/error');
const User = require('./models/user');
// the package for csrf attacks
const csrf = require('csurf');
// the package for providing User feedback
const flash = require('connect-flash');
// multer is a package that parse an incoming request for uploading files;
const multer = require('multer');
// a package Helmet helps you secure your Express apps by setting various HTTP headers. It's not a silver bullet, but it can help!
const helmet = require('helmet');
// a package for asset compression
const compression = require('compression');
//morgan is a middleware that allows us to easily log requests, errors, and more
const morgan = require('morgan');

const MONGODB_URI =
    // put appropriate mongodb url
    `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.7bstu.mongodb.net/${process.env.MONGO_DB}?retryWrites=true&w=majority`;

const app = express();
const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: 'sessions'
});

// const privateKey = fs.readFileSync('server.key');
// const certificate = fs.readFileSync('server.cert');

const csrfProtection = csrf();

// diskStorage() is a storage engine
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images');
  },
  filename: (req, file, cb) => {
    cb(null, new Date().toISOString() + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {

  if (
      file.mimetype === 'image/png' ||
      file.mimetype === 'image/jpg' ||
      file.mimetype === 'image/jpeg'
  ) {
    cb(null, true);
  }

  cb(null, false);
};

app.set('view engine', 'ejs');
app.set('views', 'views');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

const accessLogStream = fs.createWriteStream(
    path.join(__dirname, 'access.log'),
    { flags: 'a' }
);

// initializing helmet package
app.use(helmet());
// initializing compression package
app.use(compression());
// initializing morgan package
app.use(morgan('combined', { stream: accessLogStream }));

// urlencoded is a text data, string
app.use(bodyParser.urlencoded({ extended: false }));

// initializing multer
// single() means to be expected one file
// 'image' is input named 'image'
app.use(multer({ storage: fileStorage, fileFilter: fileFilter })
    .single('image'));

// statically serving a folder means that requests to files in that folder
// will be handled automatically and the files will be returned.
// It does behind the scene by expressjs
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));

app.use(
    session({
      secret: 'my secret',
      resave: false,
      saveUninitialized: false,
      store: store
    })
);

// it has to be initialized after the session middleware
app.use(csrfProtection);

// it has to be initialized after the session middleware
// it will appear in req
app.use(flash());

// use this middleware after above middleware
// locals filed from expressjs is allow us to set local variables that passed
// into the views, local simply because they will only exist
// in the views which are rendered
app.use((req, res, next) => {

  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();

  // call next() to be able to continue
  next();
});

app.use((req, res, next) => {

  if (!req.session.user) {
    return next();
  }

  User.findById(req.session.user._id)
      .then(user => {

        if (!user) {
          return next();
        }

        req.user = user;
        next();
      })
      .catch(err => {
        // in case of technical issue or some bigger problem
        next(new Error(err));
      });
});

app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.use('/500', errorController.get500);

app.use(errorController.get404);

app.use((error, req, res, next) => {

  // is could be
  // res.status(error.httpStatusCode).render(....);

  // res.redirect("/500");

  res.status(500)
      .render('500', {
        pageTitle: 'Error',
        path: '/500',
        isAuthenticated: req.session.isLoggedIn
      });

});

mongoose
    .connect(MONGODB_URI)
    .then(result => {

      console.log('MONGODB Connected!');

      // manual SSL/TLS initialization
      /*
      https
          .createServer({
                key: privateKey,
                cert: certificate
              },
              app
          )
          .listen(process.env.PORT || 3000);

       */

      app.listen(process.env.PORT || 3000);

    })
    .catch(err => {
      console.log(err);
    });
