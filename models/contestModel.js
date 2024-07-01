const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const questionSchema = new mongoose.Schema({
  title:  { type: String, required:true},
  banner:  { type: String, default:null,required:false},
  Weight:  { type: Number, default:null,required:false},
  options: [{
    value: String,
    banner: String,
    marked: { type: Boolean, default:false,required:false}
  }]
});

const contestSchema = new mongoose.Schema({
  title:  { type: String,required:true},
  banner:  { type: String, default:null,required:false},
  startTime:  { type: mongoose.Schema.Types.Date, default:null,required:true},
  endTime:  { type: mongoose.Schema.Types.Date, default:null,required:true},
  questions: [questionSchema], // Embedding questions schema
  resultsDeclared:  { type: Boolean, default:null,required:true},
  pools: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Pool' }],
  mega_Contest:{ type: Boolean, default:false,required:false}
},{timestamps:true});
contestSchema.plugin(mongoosePaginate);
const Contest = mongoose.model('Contest', contestSchema);

module.exports = Contest;
