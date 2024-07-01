//Import Configured Files
const mongoConnect = require('./config/database');


//Import Installed Libaries here 
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const fileUpload = require("express-fileupload");
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const xss = require("xss-clean");
const dotenv = require('dotenv');
const mongoSanitize = require("express-mongo-sanitize");

dotenv.config();


//Import Environment Variables
const port =process.env.port || 4000;


const express = require('express');
const app = express();

//Import Routers
const notFoundMiddleware= require('./middlewares/4O4NotFound.js')
const errorHandlerMiddleware = require('./middlewares/Errorhandler.js')
const adminRouter = require('./routers/adminRouter.js');
const userRouter = require('./routers/userRouter.js');
const commonRouter = require('./routers/commonRouter.js');


//middleware Stack
app.use(bodyParser.json({ limit: '25mb' }));
app.use(cookieParser(process.env.COOKIES_SECRET));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(fileUpload());
app.use(xss());
app.use(mongoSanitize());
app.use(helmet());
const allowedOrigins = [
  'http://localhost:3000' 
];
app.use(cors({ origin: allowedOrigins, credentials: true }));


//module Router Stack
app.use('/api/v1/admin',adminRouter);
app.use('/api/v1/user',userRouter);
app.use('/api/v1/common',commonRouter);
app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);


app.listen(port,(err)=>{
    (!err)? 
        console.log('listening on port',port):
        console.log(err);
})

mongoConnect();