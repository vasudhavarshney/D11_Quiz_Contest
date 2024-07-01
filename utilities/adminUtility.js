//Import Configured Files
//Import Installed Libaries here 


//Import Environment Variables
const dotenv = require('dotenv');
dotenv.config();
  


//Import Models
const Contest = require('../models/contestModel.js');
const Pool = require('../models/poolModel.js');
const quiz = require('../models/quizModel.js');






const isContestStarted = async()=>{
    
}

module.exports={
    isContestStarted
}