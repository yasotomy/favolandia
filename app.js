const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const session = require('express-session');
const User = require('./models/user');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const jsonFilePath = path.join(__dirname, 'data.json');

mongoose.connect('mongodb+srv://yasotomy:Noragame1922@favolandia.exskfh5.mongodb.net/Favolandia?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err));


// Configurazione di multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    cb(null, `${basename}-${Date.now()}${ext}`);
  },
});

const upload = multer({ storage: storage });

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: 'my secret key',
  resave: false,
  saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get('/', (req, res) => {
  res.render('index', { user: req.user });
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', (req, res) => {
  const newUser = new User({ username: req.body.username });
  const registrationCode = req.body.code;
  const requiredCode = '123456789';

  if (registrationCode === requiredCode) {
    User.register(newUser, req.body.password, (err, user) => {
      if (err) {
        console.log(err);
        return res.redirect('/register');
      }

      passport.authenticate('local')(req, res, () => {
        res.redirect('/data');
      });
    });
  } else {
    res.render('register', { message: 'Invalid registration code.' });
  }
});


app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', passport.authenticate('local', {
  successRedirect: '/data',
  failureRedirect: '/login',
}));

app.get('/logout', (req, res) => {
  req.logOut(() => {});
  res.redirect('/');
});

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }

  res.redirect('/login');
}


function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }

  res.redirect('/login');
}

app.get('/data', isLoggedIn, (req, res) => {
  // Load data from your database
  const data = [];

  res.render('data', { user: req.user, data });
});

// Read the JSON file and pass it to the 'edit-json' view
app.get('/edit-json', ensureAuthenticated, (req, res) => {
  fs.readFile(jsonFilePath, 'utf8', (err, jsonString) => {
    if (err) {
      console.error('Error reading JSON file:', err);
      res.status(500).send('Error reading JSON file');
    } else {
      const jsonData = JSON.parse(jsonString);
      res.render('edit-json', { jsonData: jsonData });
      }
      });
      });
      
      // Handle changes to the JSON file submitted from the 'edit-json' page
      app.post('/edit-json', ensureAuthenticated, (req, res) => {
      const jsonContent = req.body.jsonContent;
      
      try {
      JSON.parse(jsonContent); // Check if the content is valid JSON
      fs.writeFile(jsonFilePath, jsonContent, 'utf8', (err) => {
      if (err) {
      console.error('Error writing JSON file:', err);
      res.status(500).send('Error writing JSON file');
      } else {
      res.redirect('/data');
      }
      });
      } catch (e) {
      res.status(400).send('Invalid JSON format');
      }
      });
      
      // Add a new data item to the JSON file
      app.post('/add-data', ensureAuthenticated, upload.single('imageFile'), (req, res) => {
      const { title, description, category } = req.body;
      const urlToImage = req.file.path;
      
      // Read the JSON file
      fs.readFile(jsonFilePath, 'utf8', (err, jsonString) => {
      if (err) {
      console.error('Error reading JSON file:', err);
      res.status(500).send('Error reading JSON file');
      } else {
      // Parse the contents of the JSON file
      let data = JSON.parse(jsonString);
      // Create a new data item with the values submitted in the request
      const newData = {
      title,
      description,
      urlToImage,
      category
      };
        // Add the new data item to the end of the data array
  data.push(newData);

  // Write the updated data to the JSON file
  fs.writeFile(jsonFilePath, JSON.stringify(data), (err) => {
    if (err) {
      console.error('Error writing JSON file:', err);
      res.status(500).send('Error writing JSON file');
    } else {
      res.redirect('/data');
    }
  });
}
});
});

app.get('/data-json', (req, res) => {
res.sendFile(path.join(__dirname, 'data.json'));
});

// Start the server
app.listen(80, () => {
  console.log('Server started on port 80');
});