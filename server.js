var session = require('cookie-session');
var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var assert = require('assert');
var fileUpload = require('express-fileupload');

var app = express();


var mongodburl = 'mongodb://s1161444:11614445@ds119436.mlab.com:19436/comps381f';
var ObjectId = require('mongodb').ObjectID;

mongoose.connect(mongodburl);
console.log("[*] Connected to database via mongoose");

var restaurantSchema = require('./restaurant');
var restaurant = mongoose.model('restaurant', restaurantSchema);
var userSchema = require('./user');
var user = mongoose.model('user', userSchema);

//////define variables/////////

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: true
}));

app.use(fileUpload());

app.set('view engine', 'ejs');

app.use(session({
  name: 'session',
  keys: ['session_key1','session_key2']
}));

app.use(express.static( __dirname + "/views")); 

app.listen(process.env.PORT || 8099);
console.log("[*] Port listen on 8099");


//////express define /////////

app.get('/',function(req,res) { 
	console.log(req.session);
	if (!req.session.authenticated) {
		res.redirect('/login'); 
	}
	res.redirect('/list'); 
});

app.get("/login", function (req,res) { 
	res.sendFile( __dirname + '/views/login.html') 
})

app.post("/login", function (req,res) { 
	user.findOne(  
		{
			username : req.body.username,
			password : req.body.password
		},
		function (err, result) {

      			if (result == null){
     				console.log('[*] Login attempt failed')
     				console.log(req.body)
     				console.log(result)
     				res.redirect("/failure")
     			}else{
     				console.log('[*] Login attempt succeed')
     				console.log(req.body)
     				console.log(result)
     				req.session.authenticated = true;
					req.session.username = result.username;
     				res.redirect("/list")

				}});
})


/////login session/////////

app.get("/failure", function (req,res) { 
	res.sendFile( __dirname + '/views/failure.html') 
})

app.get("/taken", function (req,res) {
	res.sendFile( __dirname + '/views/taken.html')
})

app.get("/register", function (req,res) { 
	res.sendFile( __dirname + '/views/register.html') 
})

app.post("/register", function(req, res){

	user.findOne(  
		{
			username : req.body.username
		},
		function (err, result) {

      			if (result == null){

     				console.log(req.body)
     				console.log(result)
     				
     				var nObj = {};

					nObj.username = req.body.username;
					nObj.password = req.body.password;

					var n = new user(nObj);
					n.save(function(err) {
					if (err) {
						res.status(500).json(err);
					throw err
					}
					console.log('[*] Registration Completed')
					res.redirect('/complete'); 
					});
     			
     			}else{

     				console.log(req.body)
     				console.log(result)
     				console.log('[*] Registration Failed')

     				res.redirect("/taken")

				}});

	
})

app.get("/complete", function (req,res) { 
	res.sendFile( __dirname + '/views/complete.html') 
})

////////register session///////


app.get("/list", function(req, res){ 
		if(req.session.username == null ){
			console.log("[*] Session name is null and set to Guest");
			req.session.username = "Guest";
		}

	var display = {};
	display[req.query.criteria] = req.query.keyword;
	if(req.query.criteria == undefined){
		req.query.criteria = 'name';
	}
	var criteria = {};
	criteria[req.query.criteria] = new RegExp(req.query.keyword, 'i');
	find_restaurant(criteria, function(doc){
		res.render("list",{"username" : req.session.username,"criteria" : JSON.stringify(display),"restaurants" : doc, });
	});
})

app.get("/api/restaurant/read/name/:name", function(req, res) {
	find_restaurant({"name" : req.params.name}, function(doc){
		res.jsonp(doc);
	});
})
app.get("/api/restaurant/read/borough/:borough", function(req, res) {
	find_restaurant({"borough" : req.params.borough}, function(doc){
		res.jsonp(doc);
	});
})
app.get("/api/restaurant/read/cuisine/:cuisine", function(req, res) {
	find_restaurant({"cuisine" : req.params.cuisine}, function(doc){
		res.jsonp(doc);
	});
})

function find_restaurant(criteria, callback){
	restaurant.find(criteria,function (err, doc) {
		if (err) {
			res.status(500).json(err);
			throw err
		}else {
			callback(doc);
		}
	});
}

app.get("/create", function (req,res) {
	console.log(req.session.username)
	if(req.session.username == null ){
			console.log("[*] Session name is null");
			res.redirect("/invalid");
	}else if(req.session.username == "Guest"){
			console.log("[*] Session name is Guest");
			res.redirect("/invalid");
	}
	res.sendFile( __dirname + '/views/create.html')
})

app.post("/create", function(req, res){

	if(req.session.username == null ){
			console.log("[*] Session name is null");
			res.redirect("/invalid");
	}else if(req.session.username == "Guest"){
			console.log("[*] Session name is Guest");
			res.redirect("/invalid");
	}
	var rObj = {};
	rObj.name = req.body.name;
	rObj.address = {};
	rObj.address.building = req.body.building;
	rObj.address.street = req.body.street;
	rObj.address.zipcode = req.body.zipcode;
	rObj.address.coord = [];
	rObj.address.coord.push(req.body.lon);
	rObj.address.coord.push(req.body.lat);
	rObj.borough = req.body.borough;
	rObj.cuisine = req.body.cuisine;
	rObj.createBy = req.session.username;
	
		if (req.files.imageFile !== undefined){

			console.log("[*] imageFile uploaded and deteced");

			rObj.photo = new Buffer(req.files.imageFile.data).toString('base64');
			rObj.minetype = req.files.imageFile.mimetype;

		}else{

			console.log("[*] The imageFile is empty");

			rObj.photo = null;
			rObj.minetype = null;
		}
	

	var r = new restaurant(rObj);
	r.save(function(err) {
		if (err) {
			res.status(500).json(err);
			throw err
		}
		res.redirect('/list');
	});
})

app.post("/api/restaurant/create", function(req, res){
	var body = "";
	console.log(req.body.address);

	var r = new restaurant(req.body);
	r.save(function(err, doc) {
		if(err){
			res.end(JSON.stringify({"status" : "failed"}));
		}else
			res.end(JSON.stringify({"status" : "ok", "_id" : doc._id.toString() }));
	});
})


app.get("/invalid", function (req,res) {
	res.sendFile( __dirname + '/views/invalid.html')
})

app.get("/details", function(req,res){
	if(req.session.username == null ){
			console.log("[*] Session name is null");
			res.redirect("/invalid");
	}
	restaurant.findOne({_id : ObjectId(req.query._id)},function (err, doc) {
		
		if (err) {
			res.status(500).json(err);
			throw err
		}else {
			res.render("details",{"username" : req.session.username, "restaurant" : doc});
		}
	});
})


app.get("/edit", function(req,res){
		if(req.session.username == null ){
			console.log("[*] Session name is null");
			res.redirect("/invalid");
		}else if(req.session.username == "Guest"){
			console.log("[*] Session name is Guest");
			res.redirect("/invalid");
		}
	restaurant.findOne({_id : ObjectId(req.query._id)},function (err, doc) {
		
		if (err) {
			res.status(500).json(err);
			throw err
		}else {
			res.render("edit",{"username" : req.session.username, "restaurant" : doc});
		}
});
})

app.post("/edit", function(req,res){

	if(req.session.username == null ){
			console.log("[*] Session name is null");
			res.redirect("/invalid");
	}else if(req.session.username == "Guest"){
			console.log("[*] Session name is Guest");
			res.redirect("/invalid");
	}

	restaurant.findById(req.body.id, function(err, restaurant){
		if(err){
			res.status(500).send(err);
		}else{
			var coord = [req.body.lon, req.body.lat];
			restaurant.name = req.body.name;
			restaurant.address.building = req.body.building;
			restaurant.address.street = req.body.street;
			restaurant.address.zipcode = req.body.zipcode;
			restaurant.address.coord = coord;
			restaurant.borough = req.body.borough;
			restaurant.cuisine = req.body.cuisine;

		if (req.files.imageFile !== undefined){

			console.log("[*] imageFile uploaded and deteced");

			restaurant.photo = new Buffer(req.files.imageFile.data).toString('base64');
			restaurant.minetype = req.files.imageFile.mimetype;

		}else{

			console.log("[*] The imageFile is empty");

			restaurant.photo = null;
			restaurant.minetype = null;
		}

			restaurant.save(function (err,doc) {
				if(err){
					res.status(500).send(err);
				}
				res.redirect("/details?_id=" + restaurant._id.toString());
			})
		}
	});
})

app.get("/delete", function(req,res){
		if(req.session.username == null ){
			console.log("[*] Session name is null");
			res.redirect("/invalid");
		}else if(req.session.username == "Guest"){
			console.log("[*] Session name is Guest");
			res.redirect("/invalid");
		}
	restaurant.remove({_id : ObjectId(req.query._id)}, function(err){
		if(err){
			res.status(500).json(err);
			throw err;
		}else{
			res.redirect('/list');
		}
	});
})

app.get("/rate", function(req,res){
	if(req.session.username == null ){
			console.log("[*] Session name is null");
			res.redirect("/invalid");
	}else if(req.session.username == "Guest"){
			console.log("[*] Session name is Guest");
			res.redirect("/invalid");
	}
	res.render("rate",{"id" : req.query._id});
})

app.get("/error", function (req,res) { //receive error page access 
	res.sendFile( __dirname + '/views/error.html') //respond error ui
})

app.post("/rate", function(req,res){

	if(req.session.username == null ){
			console.log("[*] Session name is null");
			res.redirect("/invalid");
	}else if(req.session.username == "Guest"){
			console.log("[*] Session name is Guest");
			res.redirect("/invalid");
	}
	restaurant.findById(req.body.id, function(err, restaurant){
		if(err){
			res.status(500).send(err);
		}else{
			var repeat = false;
			for(var i = 0; i<restaurant.rating.length; i++){

				if(req.session.username == restaurant.rating[i].rateBy){
					repeat = true;
					break;
				}
			}
			if(!repeat){
				restaurant.rating.push({"rate":req.body.rating, "rateBy" : req.session.username});
				restaurant.save(function (err,doc) {
					if(err){
						res.status(500).send(err);
					}
					res.redirect("/details?_id=" + restaurant._id.toString());
				})
			}else{
				res.redirect("/error");
			}
		}
	});
})

app.get("/map", function(req,res) {
	var lat  = req.query.lat;
	var lon  = req.query.lon;
	var zoom = req.query.zoom;

	res.render("map.ejs",{'lat' : lat, 'lon' : lon, 'zoom' : zoom, 'name' : req.query.name});
	res.end();
});


app.get('/logout',function(req,res) {
	req.session = null;
	res.redirect('/');
});
