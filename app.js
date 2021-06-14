const express = require("express");
const path = require("path");
// const bcrypt = require('bcrypt')
const app = express();
// var router = express.Router();
// var cookieParser = require("cookie-parser");
var session = require("express-session");
const mongoose = require('mongoose');
const morgan = require('morgan');
const bodyparser = require('body-parser');
const multer = require('multer');
const { resourceLimits } = require("worker_threads");
const port = 9002;
var bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');

mongoose.connect('mongodb://localhost/AttendanceDatabase', { useNewUrlParser: true, useUnifiedTopology: true })

app.use(session({
    secret: "dsp11dsp",
    resave: false,
    saveUninitialized: true,
}))

function checkLoginUser(req, res, next) {
    var userToken = localStorage.getItem('userToken');
    try {
        if (req.session.userName) {
            var decoded = jwt.verify(userToken, 'loginToken');
        } else {
            res.redirect('/');
        }
    } catch (err) {
        res.redirect('/');
    }
    next();
}
if (typeof localStorage === "undefined" || localStorage === null) {
    var LocalStorage = require('node-localstorage').LocalStorage;
    localStorage = new LocalStorage('./scratch');
}


const contactUsSchema = new mongoose.Schema({
    name: String,
    email: String,
    subject: String,
    message: String,
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users'
    }
});
const Contact = mongoose.model('Contact', contactUsSchema);

const addTripSchema = new mongoose.Schema({
    name: String,
    destination_city: String,
    starting_city: String,
    intermideat_city: String,
    price: String,
    days: String,
    nights: String,
    description: String,
    image: String,
});
const Trip = mongoose.model('Trip', addTripSchema)

//Express Specific Stuff 
app.use('/static', express.static('static'));
app.use(express.urlencoded());

//PUG SPECIFIC STUFF
app.set('view engine', 'pug') //set the View/templet directory
app.set('views', path.join(__dirname, 'views')) //set the View/templet directory

var userSchema = mongoose.Schema({
    userName: {
        type: String,
        require: true,
        index: {
            unique: true
        }
    },
    email: {
        type: String,
        require: true,
        index: {
            unique: true
        }
    },

    password: {
        type: String,
        require: true
    },

    date: {
        type: Date,
        default: Date.now,
    },
});
var userModel = mongoose.model('users1', userSchema);

function checkEmail(req, res, next) {
    var email = req.body.email;
    var checkExistEmail = userModel.findOne({ email: email });
    checkExistEmail.exec((err, data) => {
        if (err) throw err;
        else if (data) {
            return res.render('signup', { msg: 'Email Already exists' });
        }
        next();
    })
}

function checkUserName(req, res, next) {
    var userName = req.body.uname;
    var checkExistUserName = userModel.findOne({ userName: userName });
    checkExistUserName.exec((err, data) => {
        if (err) throw err;
        else if (data) {
            return res.render('signup', { msg: 'User Name Already exists' });
        }
        next();
    })
}


app.get('/', (req, res) => {
    var loginUser = localStorage.getItem('loginUser');
    if (req.session.userName) {
        res.redirect('/index');
    } else {
        res.render('login', { msg: "please write valid credencial" });
    }
});
app.get('/signup', (req, res) => {
    res.status(200).render('signup.pug', { msg: 'Sign Up page' });
});
app.post('/signup', checkEmail, checkUserName, function(req, res, next) {
    var userName = req.body.uname;
    var email = req.body.email;
    var password = req.body.password;
    var confirmPassword = req.body.conpassword;
    if (password != confirmPassword) {
        res.render('signup', { msg: 'Password Not Matched' });
    } else {
        password = bcrypt.hashSync(req.body.password, 10)
        var userDetail = new userModel({
            userName: userName,
            email: email,
            password: password,
        });
        userDetail.save((err, doc) => {
            if (err) {
                console.log(err);
            } else if (doc) {
                res.render('login');
            }
        });
    }
});
var getPassCat = Trip.find({});
app.post('/', function(req, res, next) {
    var username = req.body.uname;
    var password = req.body.password;
    var checkUser = userModel.findOne({ userName: username });
    checkUser.exec((err, data) => {
        if (data == null) {
            res.render('login');

        } else {
            if (err) throw err;
            var getUserID = data._id;
            var getPassword = data.password;
            if (bcrypt.compareSync(password, getPassword)) {
                // var token = jwt.sign({ userID: getUserID }, 'loginToken');
                // localStorage.setItem('userToken', token);
                // localStorage.setItem('loginUser', username);
                req.session.userName = username;
                res.redirect('/index');
            } else {
                res.render('login');

            }
        }
    });

});

app.get('/index', checkLoginUser, (req, res, next) => {
    var loginUser = localStorage.getItem('loginUser');
    res.status(200).render('index.pug', { loginUser: loginUser });
});


app.get('/allTrip', function(req, res, next) {
    var loginUser = localStorage.getItem('loginUser');
    getPassCat.exec(function(err, data) {
        if (err) throw err;
        res.render('show_all_trip', { loginUser: loginUser, records: data });
    });
});

app.get('/allTrip/delete/:id', checkLoginUser, function(req, res, next) {
    var loginUser = localStorage.getItem('loginUser');
    var passcat_id = req.params.id;
    console.log("ID is")
    console.log(passcat_id);
    var passdelete = Trip.findByIdAndDelete(passcat_id);
    passdelete.exec(function(err) {
        if (err) throw err;
        res.redirect('/allTrip');
    });
});





































































































//END POINTS

app.get('/adminLoginPage', (req, res) => {
    res.status(200).render('adminloginpage.pug');
});

app.get('/addTrip', (req, res) => {
    res.status(200).render('addTrip.pug');
});

app.get('/bookNow', (req, res) => {
    res.status(200).render('booknow.pug');
});

// app.get('/viewmore_historical_places', (req, res) => {
//     res.status(200).render('viewmore_historical_places.pug');
// });
const Storage = multer.diskStorage({
    destination: function(req, file, callback) {
        callback(null, './static/upload');
    },

    filename: function(req, file, callback) {
        callback(null, Date.now() + file.originalname);
    },
});

const upload = multer({
    storage: Storage
});

app.post('/contact', (req, res) => {
    var passcat_id = req.params.id;
    var myData = new Contact({
        name: req.body.name,
        email: req.body.email,
        subject: req.body.subject,
        message: req.body.message,
    });

    myData.save(function(err, doc) {
        if (err) {
            res.json(err);
        } else if (doc) {
            res.send("Successfully");
        }
    });
});

// userModel.find({})
//     .populate('uid')
//     .exec(function(err, pic) {
//         console.log(pic);
//         // do something
//     });

app.post('/storeNewTrip', upload.single('file'), (req, res) => {
    var myTrip = new Trip({
        name: req.body.name,
        destination_city: req.body.destination_city,
        starting_city: req.body.starting_city,
        intermideat_city: req.body.intermideat_city,
        price: req.body.price,
        days: req.body.days,
        nights: req.body.nights,
        description: req.body.description,
        image: req.file.filename,
    });

    myTrip.save(function(err, doc) {
        if (err) {
            res.json(err);
        } else if (doc) {
            res.render("adminPage");
        }
    });
});



app.post('/adminLogin', (req, res) => {
    var em = req.body.email;
    var pass = req.body.password;
    if (em == 'devanshu156@gmail.com' && pass == "admin") {
        res.render('adminPage.pug');
    }
});

app.get("/show", (req, res) => {
    Contact.find((err, docs) => {
        if (!err) {
            ErrorMsg = '';
            res.render('show_all_contact_us.pug', {
                list: docs,
            });
        } else {
            console.log('Error in Retrieving Customers list: ' + err);
        }
    });
});
app.get("/viewmore_historical_places", (req, res) => {
    Trip.find((err, docs) => {
        if (!err) {
            ErrorMsg = '';
            res.render('viewmore_historical_places.pug', {
                list: docs,
            });
        } else {
            console.log('Error in Retrieving Customers list: ' + err);
        }
    });
});

// app.get("/allTrip", (req, res) => {
//     Trip.find((err, docs) => {
//         if (!err) {
//             ErrorMsg = '';
//             res.render('show_all_trip.pug', {
//                 list: docs,
//             });
//         } else {
//             console.log('Error in Retrieving Customers list: ' + err);
//         }
//     });
// });
app.post("/viewMore", (req, res) => {
    var id = req.body.id;
    Trip.findById(id, (err, doc) => {
        if (!err) {
            var params = { viewMore: doc };
            res.status(200).render('viewmoredev.pug', params);
        } else {
            res.send(err);
        }
    });
});
app.post("/updateEdit", (req, res) => {
    var id = req.body.id;
    Trip.findById(id, (err, doc) => {
        if (!err) {
            var params = { customer: doc };
            res.status(200).render('update.pug', params);
        } else {
            res.send(err);
        }
    })

});

app.post("/deleteEdit", (req, res) => {
    var id = req.body.id;
    Trip.findByIdAndRemove(id, (err, doc) => {
        if (!err) {
            // res.send('Deleted successfully');
            res.render('show_all_trip.pug')
        } else {
            res.send("Error During deleting data");
        }
    });
});


app.post("/updateNew", upload.single('file'), (req, res) => {

    if (req.file) {
        var dataRecords = {
            name: req.body.name,
            destination_city: req.body.destination_city,
            starting_city: req.body.starting_city,
            intermideat_city: req.body.intermideat_city,
            price: req.body.price,
            days: req.body.days,
            nights: req.body.nights,
            description: req.body.description,
            image: req.file.filename,
        }
    } else {
        var dataRecords = {
            name: req.body.name,
            destination_city: req.body.destination_city,
            starting_city: req.body.starting_city,
            intermideat_city: req.body.intermideat_city,
            price: req.body.price,
            days: req.body.days,
            nights: req.body.nights,
            description: req.body.description
        }
    }

    var updateNew = Trip.findByIdAndUpdate(req.body.id, dataRecords);
    updateNew.exec(function(err, data) {
        if (err) {
            console.log(err);
        } else {
            console.log("Error")
            res.render('index.pug')
        }
    })
});


app.post('/allTrip/edit/:id', checkLoginUser, function(req, res, next) {
    var loginUser = localStorage.getItem('loginUser');
    var passcat_id = req.params.id;
    var getpassCategory = Trip.findById(passcat_id);
    getpassCategory.exec(function(err, data) {
        if (err) throw err;

        res.render('update', { loginUser: loginUser, customer: data, id: passcat_id });

    });
});

app.post('/allTrip/edit/', upload.single('file'), checkLoginUser, function(req, res, next) {
    if (req.file) {
        var dataRecords = {
            name: req.body.name,
            destination_city: req.body.destination_city,
            starting_city: req.body.starting_city,
            price: req.body.price,
            days: req.body.days,
            nights: req.body.nights,
            description: req.body.description,
            image: req.file.filename,
        }
    } else {
        var dataRecords = {
            name: req.body.name,
            destination_city: req.body.destination_city,
            starting_city: req.body.starting_city,
            price: req.body.price,
            days: req.body.days,
            nights: req.body.nights,
            description: req.body.description
        }
    }

    var loginUser = localStorage.getItem('loginUser');
    var passcat_id = req.body.id;
    var update_passCat = Trip.findByIdAndUpdate(passcat_id, dataRecords);
    update_passCat.exec(function(err, doc) {
        if (err) throw err;

        res.redirect('/allTrip');
    });
});
app.get('/allTrip', (req, res) => {
    res.status(200).render('show_all_trip.pug');
});
app.get('/showAllUser', (req, res) => {
    userModel.find((err, docs) => {
        if (!err) {
            ErrorMsg = '';
            res.render('show_all_user.pug', {
                list: docs,
            });
        } else {
            console.log('Error in Retrieving Customers list: ' + err);
        }
    });
    // res.status(200).render('show_all_user.pug');
});
app.get('/showAllUser/delete/:id', checkLoginUser, function(req, res, next) {
    var loginUser = localStorage.getItem('loginUser');
    var passcat_id1 = req.params.id;
    console.log("ID is")
    console.log(passcat_id1);
    var passdeleteuser = userModel.findByIdAndDelete(passcat_id1);
    passdeleteuser.exec(function(err) {
        if (err) throw err;
        res.redirect('/showAllUser');
    });
});
app.get('/showAllUser', (req, res) => {
    res.status(200).render('show_all_user.pug')
})
app.get('/logout', function(req, res, next) {
    req.session.destroy(function(err) {
        if (err) {
            res.redirect('/');
        }
    })
    localStorage.removeItem('userToken');
    localStorage.removeItem('loginUser');
    res.redirect('/');
});
// app.post('/showAllUser/edit/:id', checkLoginUser, function(req, res, next) {
//     var loginUser = localStorage.getItem('loginUser');
//     var passcat_id2 = req.params.id;
//     var getpassCategory1 = userModel.findById(passcat_id2);
//     getpassCategory1.exec(function(err, data) {
//         if (err) throw err;
//         res.render('updateUser', { loginUser: loginUser, customer: data, id: passcat_id });

//     });
// });

// app.post('/showAllUser/edit/', upload.single('file'), checkLoginUser, function(req, res, next) {
//     if (req.file) {
//         var dataRecords = {
//             name: req.body.name,
//             destination_city: req.body.destination_city,
//             starting_city: req.body.starting_city,
//             price: req.body.price,
//             days: req.body.days,
//             nights: req.body.nights,
//             description: req.body.description,
//             image: req.file.filename,
//         }
//     } else {
//         var dataRecords = {
//             name: req.body.name,
//             destination_city: req.body.destination_city,
//             starting_city: req.body.starting_city,
//             price: req.body.price,
//             days: req.body.days,
//             nights: req.body.nights,
//             description: req.body.description
//         }
//     }

//     var loginUser = localStorage.getItem('loginUser');
//     var passcat_id = req.body.id;
//     var update_passCat = Trip.findByIdAndUpdate(passcat_id, dataRecords);
//     update_passCat.exec(function(err, doc) {
//         if (err) throw err;

//         res.redirect('/allTrip');
//     });
// });

app.use(morgan('dev'));
app.use(bodyparser.urlencoded({ extended: true }));
app.use(bodyparser.json())
    //STARTING THE SERVER    
app.listen(port, () => {
    console.log(`This application is running successfully on port ${port}`)
});