const express = require('express')
const nocache = require('nocache')
const session = require('express-session')
require('dotenv').config()
const path = require('path')
const app = express()
const PORT = 3000;
var logger = require('morgan');
const mongoose = require("mongoose");
const adminRouter = require('./routes/adminRouter')
const userRouter = require('./routes/userRouter')

//connecting database
const connect = mongoose.connect(process.env.MONGODB)
connect
.then(()=>{
    console.log("MongoDB is connected successfully");
})
.catch((error)=>{
    console.log("Error connecting to MongoDB",error);
})

//setting ejs
app.set('views',path.join(__dirname,'views'))
app.set('view engine','ejs')
//url encoding
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//using nocache for session management
app.use(nocache());

//using session
app.use(
    session({
      secret: process.env.SECRET_KEY || "supersecretkey12345",
      resave: false,
      saveUninitialized: true,
    })
  ); 
  
  //static
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use("/admin/assets", express.static(path.join(__dirname, 'public/adminAssets')));
app.use("/assets", express.static(path.join(__dirname, 'public/assets')));
app.use(express.static(path.join(__dirname, 'uploads')))
  
  //
app.use('/',userRouter); 
app.use('/admin',adminRouter);

app.use((req,res,next)=>{
    res.status(404).render("error");
})  

app.listen(PORT,()=>{
    console.log(`Server on http://localhost:${PORT}`);
})