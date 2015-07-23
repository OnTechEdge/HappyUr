var request = require("request");
var cheerio = require("cheerio");
var async = require("async");
var mongodb = require("mongodb");
var mongoClient = mongodb.MongoClient;
var mongoUrl = "mongodb://localhost:27017/happyurs";
mongoClient.connect(mongoUrl, function(err, db){
	var restCollection = db.collection('restaurants');
	function ScrapCityForNeighbourhoods(){
		var cityUrl = "https://www.zomato.com/pune";
		console.log("started scrapping : " + cityUrl);
		//cityUrl = "http://localhost:82/MEANDemo1/Pune.html";//hard coded for test
		request(cityUrl, function(err, response, data){
			if(!err && response.statusCode === 200){
				var $ = cheerio.load(data);
				var neighbourhoodLinks = $("#popular-neighbourhoods a");
				neighbourhoodLinks.each(function(index, neighbourhood){
					var text = $(neighbourhood).text().trim();
					var href = $(neighbourhood).attr("href");
					var fbIndex = text.indexOf("(");
					var neighbourhoodname = text.substring(0, fbIndex);
					var numberOfRestaurants = text.substring(fbIndex + 1, text.length - 1);
					//console.log(neighbourhoodname + "{" + numberOfRestaurants + "}" + "--" + href);
					var neighObject = {};
					neighObject.Name = neighbourhoodname;
					neighObject.NumberOfRest = numberOfRestaurants;
					neighObject.Href = href;
					var snFr = new ScrapNeighbourhoodsForRestaurant();
					snFr.scrap(neighObject);
				});
			}
		});
	}
	ScrapCityForNeighbourhoods();
	function ScrapNeighbourhoodsForRestaurant(){
		var self = this;
		self.scrap = function(neighObject){
			var neighUrl = neighObject.Href;
			var numberOfPages = neighObject.NumberOfRest/30;//as zomato shows 30 items per page
			//numberOfPages = 2;//hard coded for test
			//console.log(numberOfPages);
			for(var i = 1 ; i <= numberOfPages ; i++){
				var targetUrl = neighObject.Href + "?nearby=0&page=" + i;
				//targetUrl = "http://localhost:82/MEANDemo1/VM" + i + ".html";//hard coded for test
				//console.log(targetUrl);
				request(targetUrl, function(err, response, data){
					if(!err && response.statusCode === 200){
						var $ = cheerio.load(data);
						var restaurants = $("#orig-search-list a.result-title");
						//console.log(restaurants.length);
						restaurants.each(function(index, restaurant){
							var rest = new RestaurantDetails($(restaurant).text(), $(restaurant).attr("href"))
							//console.log($(restaurant).text(), $(restaurant).attr("href"));
							rest.Parse();
						});
					}
				});
			}
		}
	}
	 
	function RestaurantDetails(restaurantName, restaurantUrl){
		var self = this;
		self.Parse = function(){
			var url = restaurantUrl;
			//url = "http://localhost:82/MEANDemo1/VMDetails2.html";//hard coded for test
			//console.log("rest url : " + restaurantUrl);
			request(url, function(err, response, body){
				if(!err && response.statusCode === 200){
					var $ = cheerio.load(body);
					var neighbourhoodName = $(".res-main-subzone-links b").text().trim();
					var restaurantName = $(".res-name").text().trim();
					//console.log(restaurantName);
					var address = $(".res-main-address-text").text().trim();
					var restaurantUrl = response.request.uri.href;
					var latitude = "";
					var longitude = "";
					//console.log("------------------------------------------------------------")
					var metaTags = $("meta");
					metaTags.each(function(index, key){
						 if ( key.attribs
					       && key.attribs.property
					       && key.attribs.property === 'zomatocom:location:latitude') {
					       	latitude = key.attribs.content;
					    }
					    else if ( key.attribs
					       && key.attribs.property
					       && key.attribs.property === 'zomatocom:location:longitude') {
					      	longitude = key.attribs.content;
					    }
					});
					var cuisines = $(".res-info-cuisines a");
					var cuisinesArray = [];
					cuisines.each(function(index, key){
						cuisinesArray.push($(key).text().trim());
					});
					var knownFor = $(".res-info-known-for-text").text().trim();
					var priceRange = $("span[itemprop='priceRange']").text().trim();
					var happyHoursTime = $(".happy-hours-resinfo-qv").text().trim().replace("Happy Hours:","");
					var restData = {};
					restData.NeighbourhoodName = neighbourhoodName;
					restData.RestaurantName = restaurantName;
					restData.RestaurantUrl = restaurantUrl;
					restData.Cuisines = cuisinesArray;
					restData.KnownFor = knownFor;
					restData.priceRange = priceRange;
					restData.HappyHoursTime = happyHoursTime;
					restData.Latitude = latitude;
					restData.Longitude = longitude;
					restData._id = neighbourhoodName.replace(" ","") + "|~|" + restaurantName
					restCollection.insert(restData, function(err, result){

					});
					//console.log(neighbourhoodName + " > " + restaurantName + " > " + restaurantUrl + address + " > " + latitude + " > " + longitude + " > " + cuisinesArray + " > " + happyHoursTime + " > " + knownFor + " > " + priceRange);
					//console.log("------------------------------------------------------------")
				}
			});
		}
	}
});
