var versionCode=0;
var originalURL;

var currentSection=[];
var currentItem=0;
var itemsPerPage=15;

var currentLine = 0;

var isAppOpen=false;
var usingWatchapps=true;
var hardwareString="";

var currentView=""; //This is usually blank for a normal search. It could be "favorite" for favorite apps.
var uid="";

/* Searchy things */
var currentWatchSelected="";
var text_search="";
var cat_search="";
var sortType="";
var dev_search = "";




$(document).ready(function() { //Run when we've finished loading.
	
	//Check if we're using IE. If we are, this won't load. Kill.
	if(detectIE()) {
		DisplayImportantMessage('Sorry, IE isn\'t supported. Update to a modern browser, like <a style="color:white;" href="https://www.google.com/chrome/">Chrome</a> or <a style="color:white;" href="https://www.mozilla.org/en-US/firefox/new/">Firefox</a>, to use PebbleRipper. ',false);
	}
	//Check if there's an app on the hash before we clear it.
	var pendingApp=null;
	var cancelSearch = false;
	if(String(window.location.hash).startsWith("#app_")) {
		//Starts with an app!
		var sub = String(window.location.hash).substring(5);
		if(sub.length>3) {
			pendingApp = sub;
			cancelSearch=true;
		}
	} 

	//Push a cancel callback
	window.location.hash="DEFAULT";
	
	//Set timeout
	SetupLoaderTimeout();

	//Set the originalURL var
	originalURL=window.location.href;
	//Localize
	DoLocalization();
	//We'll set the date appeared text.
	if(usingWatchapps) {
		SetBar("Watchapps");
	} else {
		SetBar("Watchfaces");
	}
	
	//Init error handle
	InitErrors();
	
	if(typeof(creationTimestamp)==null) {
		document.getElementById('date_string').innerHTML= "As it appeared "+ convertTimestamp(creationTimestamp);
	}
	//Define the PebbleBridge.handleRequest function.
	DefineNativeAppEmptyVariables();
	
	//Load the stored values and settings
	var storedSettings = {};
	//Stored settings is no longer used.
	
	//Deal with the URL if it contains things.
	var urlPrams = parseURLParams(window.location.href);
	
	
	
	if(urlPrams!=null) {
		if(urlPrams.app != null) {
			console.log("The user has requested app "+urlPrams.app);
			//Deal with an opened app
			var itemToUse = findById(decodeURIComponent(urlPrams.app));
			if(itemToUse!=null) {
				//Display it. To do this, we create a new "fake" data set.
				OpenDetailsOfData(itemToUse);
			} else {
				//Not found!
				console.log("Couldn't find item!");
				SimpleLog("Sorry, the app you searched for in the URL doesn't exist."); //SimpleLogs are ugly but hopefully this will never be seen.
				
			}
			
		} 
		
		if(urlPrams.nativeApp!=null) {
			if(String(decodeURIComponent(urlPrams.nativeApp))=="true") {
				//Ooooooohhh, hey there, sexy
				//Serve the page for the native app.
				nativeApp=true;
				PrepareMobile(0,"style_frontpage_mobile.css");
				SetDesktopView(false); //Switch the CSS
				//If we're on the native app, get the platform
				if(urlPrams.platform!=null) {
					var plat = String(decodeURIComponent(urlPrams.platform));
					
					platformAndroid = !plat.toLowerCase().includes("ios");
				} else {
					alert("Unknown platform! Assuming Android... PBW downloads may not work!");
				}
				
				//Set the active watch.
				if(urlPrams.hardware!=null) {
					hardwareString=String(urlPrams.hardware);
					currentWatchSelected = String(decodeURIComponent(urlPrams.hardware)).toLowerCase()
					console.log("Switched hardware: "+currentWatchSelected);
				}
				
				//Done
			}
		}
		
		if(urlPrams.useWatchfaces!=null) {
			if(String(decodeURIComponent(urlPrams.useWatchfaces))=="true") {
				//Switch!
				usingWatchapps=false;
				ResetNumberOfItemsPerPage();
				$(".main_chooser_bar").addClass("main_chooser_bar_active");
			}
		}
		
		if(urlPrams.searchQuery!=null) {
			text_search=String(decodeURIComponent(urlPrams.searchQuery));
			//Set all instances
			ChangeValueOnAllClassObjects("searchtype_query",text_search);
		}
		
		if(urlPrams.authorUUID!=null) {
			dev_search=String(decodeURIComponent(urlPrams.authorUUID));
			if(dev_search.length>1) {
				//Show button
				HideNavButtons();
				//Set temporary title 
				//This will be changed when we get the author's name in the next app to be displayed.
				SetBar("Apps by Developer");
			}
		}
		
		if(urlPrams.searchCategory!=null) {
			cat_search=String(decodeURIComponent(urlPrams.searchCategory));
			//Set
			ChangeValueOnAllClassObjects("searchtype_category",cat_search);
		}
		if(urlPrams.searchWatch!=null) {
			currentWatchSelected=decodeURIComponent(urlPrams.searchWatch);
			//Set
			ChangeValueOnAllClassObjects("searchtype_watch",(currentWatchSelected));
	
		}
		if(urlPrams.searchSort!=null) {
			sortType=decodeURIComponent(urlPrams.searchSort);
			storedSettings.sort = sortType;
			//Set
			ChangeValueOnAllClassObjects("searchtype_sort",sortType);
		} else {
			//Load from settings instead
			
		}
		if(urlPrams.currentItem!=null) {
			currentItem=parseInt(decodeURIComponent(urlPrams.currentItem));
			
		}
		
		if(urlPrams.uid!=null) {
			uid=decodeURIComponent(urlPrams.uid);
			
		}
		
		if(urlPrams.view!=null) {
			currentView=String(decodeURIComponent(urlPrams.view));
			if(currentView=="favorite") {
				//Turn on cancelSearch so it's not done the normal way if this works. The favorites function will return true/false if it worked.
				cancelSearch=ShowFavoriteApps();
			}
			
		}
	} 
	
	WebStorage.PutItem("storedSettings",JSON.stringify(storedSettings));
	//Check if we should be in night mode.
	WebStorage.GetItem("isNightMode",function(data) {
		var isNight = data!=null;
		if(isNight) {
			isNight = data=="true" || data==true;
		}
		if(isNight) {
			SetNightView(true);
		}
		
	 });
	
	
	if(!cancelSearch) {
		SearchPage(currentItem);
	}

	if(pendingApp != null) {
		//There is an app open. Show the app instead of the item.
		ShowAppInfo(pendingApp,function() {
			SearchPage(currentItem); //Called on fail
		})
	}
	
	
	//Check for updates
	CheckForUpdates();
	AddDeveloperToggleIfDev();
	//debug=true;
	//send("isConnected",{},function(data){console.log(data)});
});

function HideNavButtons() {
	document.getElementById('AllAppsBtn').style="display:inline-block;";
	//Hide some stuff
	document.getElementById('prev_btn_1').style="display:none;"
	document.getElementById('next_btn_1').style="display:none;"
	document.getElementById('prev_btn_2').style="display:none;"
	document.getElementById('next_btn_2').style="display:none;"
	document.getElementById('main_footer').style="display:none;";
}

function ShowFavoriteApps() {
	//Get favorite apps
	WebStorage.GetItem("likedItems",function(likedRaw) {
		var favorites = [];
		if(likedRaw!=null) {
			var liked = JSON.parse(likedRaw);
			var keys = Object.keys(liked);
			//Loop through liked and find which ones are true.
			var i=0;
			while(i<keys.length) {
				if(liked[keys[i]]==true) {
					//Add it
					favorites.push(keys[i]);
				}
				i+=1;
			}
		}
		
		//Check if we even have favorite apps
		if(favorites.length==0) {
			//No favorites. Let the user know and hault.
			DisplayImportantMessage("You don't have any favorites!");
			return;
		}
		//Get the type.
		var type="watchface";
		if(usingWatchapps) {
			type="watchapp";
		}
		db_GetMultipleAppIDs(favorites,type,function(data) {
			PushHistoryChange(function() {
				StopShowingDevApps();
				location.reload();
			});
			var ddata = {};
			currentView="favorite";
			ddata.data=data;
			AnimateMenu(function(){
				document.getElementById('app_list_ul').innerHTML="";
				//Hide next and back, then show all apps button
				HideNavButtons();
				SetBar("Favorite Apps");
				db_DisplayPageData(ddata);
				UpdateUrlWithDetails();
				
			});
		},function() {
			DisplayImportantMessage("An error occurred.");
		});
	});
	
	return true;
}

function ChangeValueOnAllClassObjects(className, newValue) {
	var i=0;
	var objs = document.getElementsByClassName(className);
	while(i<objs.length) {
		
		objs[i].value=newValue;
		i+=1;
	}
}



function CheckForUpdates() {
	//This function runs out to my server to grab the JSON updater.
	console.log("Fetching update request...");
	//Check the cache.
	if(localStorage.getItem("updaterCache")!=null) {
		//Check cache age.
		console.log("Cache exists. Checking...");
		var cache = JSON.parse(localStorage.getItem("updaterCache"));
		var cacheAge = GetTime()-cache.cacheTime;
		if(cacheAge<=cache.cacheLifespan) {
			//Cache is good. Use this instead.
			GotUpdateResults(cache);
			console.log("Cache is okay. Using cache...");
			return;
		} else {
			console.log("Cache is too old. Downloading...");
		}
	}
	
	GetJSONRequest("https://romanport.com/api/PebbleRipper/htmlUpdates.php",function (output) {
		//This is run if we get a valid request from the server.
		output.cacheTime = GetTime();
		localStorage.setItem("updaterCache",JSON.stringify(output));
		GotUpdateResults(output);
		
	}, function (output) {console.log("Error grabbing updates. Is my server down?")});
}

function GotUpdateResults(output) {
	var newVersionCode = parseInt(output.updateVersionCode);
	if(newVersionCode>versionCode) {
		console.log("New update!");
		//New version new version new version!!!
		//Change it depending on what platform we're on.
		var textToDisplay ="";
		if(nativeApp) {
			//Mobile
			textToDisplay="A new update is ready! To update, load this on your computer.";
		} else {
			//Desktop
			textToDisplay="A new update is ready! Update PebbleRipper to v"+newVersionCode
			if(newVersionCode-1>versionCode) {
				//Wow, we are really out of date...
				textToDisplay+=" <b>You're more than one version out of date.</b>";
			} else {
				textToDisplay+=" and get "+output.latestSmallTxt+" by clicking here.";
			}
		}
		//Do some element magic.
		var updateBanner = document.getElementById('updater_banner');
		updateBanner.style="display:inline-block;";
		updateBanner.innerHTML=textToDisplay;
		//Update the moreinfo box
		var updateBannerMore = document.getElementById('updater_banner_more');
		updateBannerMore.innerHTML=output.latestChangelog;
	} else {
		console.log("No new updates.");
	}
	//Check for new news.
	WebStorage.GetItem("lastArticleSeen",function(latestNewsSeen) {
		if(latestNewsSeen==null) {latestNewsSeen=-1}
		//Todo: Load from storage.
		//Compare the last seen to the latest.
		if(latestNewsSeen<output.news.latest) {
			//Out of date! Load the newest one.
			var article = output.news.articles[output.news.latest];
			var articleData = null;
			//Check if we're in date.
			if(!article.useVersionRequirement) {
				articleData = article.inDate;
			} else {
				if(article.requiredVersion<=versionCode) {
					//Display in date
					articleData = article.inDate;
				} else {
					//Display out of date.
					articleData = article.outOfDate;
				}
			}
			//Display this data.
			DisplayNewCustomArea(articleData.html,function(){
				WebStorage.PutItem("lastArticleSeen",output.news.latest);
				
			},article.title);
		}
	});

	
}

function OpenUpdateCheckerMore() {
	//Stop if we're on mobile
	if(nativeApp) {
		return;	
	}
	$('#updater_banner_more').addClass("updater_banner_moreinfo_open");
}



function GenerateHome() {
	//WIP!!!
	//Fetches the home page and creates "top picks" section.
	//First, let's grab the JSON data.
	SubmitServerRequest("https://cors-anywhere.herokuapp.com/https://api2.getpebble.com/v2/home/faces?image_ratio=1&platform=all&hardware=basalt&firmware_version=3&filter_hardware=true",function(data) {
		//We have our JSON data. Let's extract the data.
		var collections = data.collections;
		var i = 0;
		while(i<collections.length) {
			//Fetch all of the apps and construct some JSON
			var currentCollect = collections[i];
			//Go out and fetch the data for the app IDs from my server.
			var ii=0;
			var requestQuery = "";
			while(ii<currentCollect.application_ids.length) {
				requestQuery+=currentCollect.application_ids[ii];
				if(ii+1!=currentCollect.application_ids.length) {
					requestQuery+=",";
				}
				ii+=1;
			}
			//Go and request.
			findById(requestQuery,function(app_data) {
				console.log(app_data);
			},{"name":currentCollect.name,"sortIndex":i});
			i+=1;
		}
	});
}

function SetDesktopView(enabled) {
	document.getElementById('desktop_css').disabled = !enabled; 
}

function SetNightView(enabled) {
	document.getElementById('night_css').disabled = !enabled;
	//Set
	WebStorage.PutItem("isNightMode",enabled);
}

function ThrowBadError(header, debug) {
	alert(header+"! Tell me on Discord: RomanPort#0001. Give me this info: "+debug);
}



function RandomPlaceholderLength() {
	return randInt(30)+5;
}

function ResetNumberOfItemsPerPage() {
	if(usingWatchapps) {
		itemsPerPage=15
	} else {
		itemsPerPage=39;
	}
}

//This function is used later to dismiss the popup window when the background is clicked. It shouldn't do anything if it's not open.
window.onclick = function(event) {
    if (event.target == document.getElementById('myModal')) {
        CloseDetails();
    }
}

function SimpleLog(msg) {
	//Disabled for now
}

function DefineNativeAppEmptyVariables() {
	//This is used to keep the native app happy.
	PebbleBridge();
	Analytics();
	
	
}

function OpenDownload() {
	window.open("app.pbw");
	
}



function ToggleCategory(type) {
	$("#group_"+type).toggleClass("app_group_deactive");
}


function ConstructDivFromApp(data, isLastValue) { //This is REALLY jank. Fix it later.
	var div = "";//document.createElement('li');
	var currentItem = data;
	var assets=[];
	
	var pathToScreenshot = DecodeJSONUrlRequest(currentItem.path_screenshots[0]);
	var pathToIcon = DecodeJSONUrlRequest(currentItem.path_icon);
	
	if(currentItem.appType=="watchface") {
		//If it's a face, use this style.
		div="<div class=\"tooltip\" onclick=\"ShowAppInfo('"+ currentItem.id +"');\"> <div class=\"watchface_padding_body\"><div class=\"watchface_innerbody\"> <img src=\""+pathToScreenshot+"\" alt=\""+currentItem.name+"\" class=\"watchface_body_img\" > </div> </div><span class=\"tooltiptext mobileHidden\">"+currentItem.name+"</span></div>";
		//div.className="watchface_body";
		return CreatePlaceholderApp(div,assets,"","watchface_body","");
	} else {
		assets.push(CreateAssetData(pathToScreenshot));
		assets.push(CreateAssetData(pathToIcon));
		div = '<div class="app_container" onclick="ShowAppInfo(\''+currentItem.id+'\');"> <div class="app_main_body"> <div class="app_img"> <img src="'+ pathToScreenshot + '" width="60px" height="70px" class="app_screenshot_listing"> </div> <div class="app_text_area"> <div class="app_title_area"> <img style="vertical-align:middle; float:left; margin-right:7px; margin-bottom:3px;" src="'+pathToIcon+'" height="26px" width="26px"></img> <div class="app_title"><div class="app_title_text">' + currentItem.name + '<div class="app_title_text_fade"></div></div><div class="app_title_type">'+currentItem.category+'</div></div></div> <div class="app_description"> ' + filterCSV(currentItem.description) + ' </div> <div class="app_description_fade"></div> </div> </div> </div> ';
		if(typeof(isLastValue)==null || isLastValue==false) {
			div+='<div class=\"app-custom-border\"> </div>';
		}
		return CreatePlaceholderApp(div,assets,"width:100%;","","125px");
		
	}
	
	
	
	//return div;
	
}

var usedAssetIds={};

function CreateAssetData(src) {
	var randomId = randInt(100000);
	while(usedAssetIds[randomId]!=null){
		randomId=randInt(100000);
	}
	usedAssetIds[randomId]=true;
	//Create output
	var output = {};
	output.id=randomId;
	output.src = src;
	return output;
}

function CreatePlaceholderApp(replacementHtml, assets, divStyle, divClass,height) {
	var innerHTML = '<div class="app_container"> <div class="app_main_body"> <div class="app_img"> <div width="60px" height="70px" class="app_screenshot_listing" style=" height: 70px; width: 60px; background-color: #c7c7c7; border-radius: 3px; "></div> </div> <div class="app_text_area"> <div class="app_title_area"> <div style="vertical-align:middle;float:left;margin-right:7px;margin-bottom:3px;background-color: #c7c7c7;border-radius:3px;display: inline-block;width: 26px;height: 26px;" height="26px" width="26px"></div> <div class="app_title"> <div class="app_title_text"> <div class="loaderText" style="width: '+RandomPlaceholderLength()+'%;"></div> <div class="app_title_text_fade"></div> </div> <div class="app_title_type"> <div class="loaderText" style=" height: 6px; width: '+RandomPlaceholderLength()+'%; "></div> </div> </div> </div> <div class="app_description"> <div class="loaderText" style=" height: 12px; width: '+RandomPlaceholderLength()+'%; "></div> <br> <div class="loaderText" style=" height: 12px; width: '+RandomPlaceholderLength()+'%; "></div> </div> <div class="app_description_fade"></div> </div> </div> </div> <div class="app-custom-border"> </div>';
	var obj = document.createElement('li');

	obj.style=divStyle+"position:relative; min-height:"+height;
	obj.className = divClass;
	obj.innerHTML='';
	document.getElementById('app_list_ul').appendChild(obj);
	
	obj.innerHTML=replacementHtml;
	return obj;
	
	//THIS PRELOADER WORKED AND ALL, BUT IT JUST DIDN'T FEEL Right
	//COME BACK TO IT MAYBE?
	
	var placeholderObj = document.createElement('div');
	placeholderObj.style="width:100%;";
	placeholderObj.innerHTML=innerHTML;
	obj.appendChild(placeholderObj);
	
	//Append 
	//Prepare for preloading.
	var imgs = [];
	var callback = function() {
		imgs.push(this);
		//Check if we have two images
		console.log(imgs.length);
		if(imgs.length==assets.length) {
			//OK to continue. Replace my DIV with the old one.
			/*var replaceObj = document.createElement('div');
			replaceObj.innerHTML = replacementHtml;
			replaceObj.style="position:absolute; top:0;";
			replaceObj.className = "transparent";
			obj.appendChild(replaceObj);
			$(replaceObj).hide().fadeIn(150,function(){replaceObj.style="";});*/
			
			$(placeholderObj).fadeOut(50,function(){obj.innerHTML=replacementHtml;});
			//Browser cache should take care of this for us.
		}
	}
	
	var i=0;
	while(i<assets.length) {
		var imgOne = new Image();
		imgOne.onload = callback;
		imgOne.src=assets[i].src;
		imgOne.id=assets[i].id;
		i+=1;
	}
	
	return obj;
}

function SmoothScrollToTop() {
	$('html, body').animate({
	  scrollTop: 0
	}, 400, function() {
		
	});
}



function createUnorderedPage(startIndex,amount) {
	var i = startIndex;
	while(i<startIndex+amount) {
		if(currentSection.apps.length >i) {
			var JSON = currentSection.apps[i];
			createCard(JSON,i==(startIndex+amount)-1);
		}
		
		i=i+1;
	}
}


function createCard(JSON, isLastValue) {
	var div = ConstructDivFromApp(JSON, isLastValue);
	document.getElementById('app_list_ul').appendChild(div);

}

function filterCSV(input) //This is used to make the string CSV-safe
{
	input = input.replace('"', ' ');
	input = input.replace('\'', ' ');
	return input;
}


//Page functions

function SwitchPage(amount) { 
	//Here, we fade out the menu, load, and fade it back in.
	SimpleLog(currentItem);
	AnimateMenu(function(){
		document.getElementById('app_list_ul').innerHTML="";
		
		db_SwitchPage(amount);
		
		
	});
}

function AnimateMenu(callback) {
	//This will do an animation, and then compute the page.
	//THIS WILL NOT SHOW EVERYTHING AGAIN!!
	$("#app_list_ul").fadeOut(animationFadeSpeed,function () {
		SetAppsListHeight();
		callback();
		
		
	});
}



function UpdateUrlWithDetails() {
	changeURL("",GetUpdatedUrl());
}

function GetUpdatedUrl() {
	var platformString = "android";
	if(platformAndroid==false) {
		platformString="ios";
	}
	var cat_str=cat_search;
	if(cat_str=="Tools & Utilities") {
		cat_str="tau";
	}
	if(cat_str=="Health & Fitness") {
		cat_str="haf";
	}
	//Todo: Replace the names of categories with their IDs. This should've been done a while ago...
	return ("?nativeApp="+encodeURIComponent(nativeApp)+"&searchQuery="+encodeURIComponent(text_search)+"&searchCategory="+encodeURIComponent(cat_str)+"&searchWatch="+encodeURIComponent(currentWatchSelected)+"&searchSort="+encodeURIComponent(sortType)+"&currentItem="+encodeURIComponent(currentItem)+"&platform="+encodeURIComponent(platformString)+"&authorUUID="+encodeURIComponent(dev_search)+"&useWatchfaces="+encodeURIComponent(!usingWatchapps)+"&hardware="+encodeURIComponent(hardwareString)+"&view="+encodeURIComponent(currentView)+"&uid="+uid+window.location.hash);

}

function StopShowingDevApps() {
	//This also disables looking for favorite apps.
	currentView="";
	//Disable dev search
	dev_search="";
	//Refresh the URL.
	window.location=GetUpdatedUrl();
	
}

function SwitchType(switchWatchappsOn) {
	//This toggles watchfaces and watchapps
	if(switchWatchappsOn!=usingWatchapps) {
		SetAppsListHeight();
		$(".main_chooser_bar").toggleClass("main_chooser_bar_active");
		usingWatchapps=!usingWatchapps;
		ResetNumberOfItemsPerPage();
		
		SearchPage(0);
		
		
		if(usingWatchapps) {
			SetBar("Watchapps");
		} else {
			SetBar("Watchfaces");
		}
		//Reset the size of the apps list dir.
		isAppsListRevealed = false;
	}
	
}

function SearchPage(numberToJumpTo) {//input,category,watchInput, sortType) {
	console.log("SearchPage executed.");
	var input = text_search;
	var category = cat_search;
	var watchInput = currentWatchSelected;
	//Update URL
	UpdateUrlWithDetails();
	AnimateMenu(function(){
		//Erase the current list
		document.getElementById('app_list_ul').innerHTML="";
		db_SearchPage(numberToJumpTo);
		
	});
	
	
}




function SearchButtonPressed(query, cat, watch, sort, item) {
	currentItem=0;
	if(item!=null) {
		currentItem = item;
	}
	
	//Set all of our variables
	if(query!=null) {
		text_search = query;
	}
	
	if(cat!=null) {
		cat_search = cat;
	}
	
	if(watch != null) {
		currentWatchSelected = watch;
	}
	
	if(sort != null) {
		sortType = sort;
	}

	
	//We can now construct a search.
	
	
	
	$('.mobile_search_area').addClass('mobile_search_area_disabled');
	SearchPage(currentItem);
}

function GetSelectOption(context) {
	var i = context.options[context.selectedIndex].value;
	console.log("i");
	console.log(i);	
	return i;
}





function CheckCompat(line) {
	alert("Legacy function CheckCompat - Java.js");
}




function OpenDetailsOfData(dataGiven) {
	//This now opens in a new file!
	//Open it there...
	
	//Fade to white first
	$("#loading_cover").hide().fadeIn(200, function(){
		var platformString = "android";
		if(platformAndroid==false) {
			//iOS
			platformString="ios";
		}
		window.open("application/index.html?nativeApp="+nativeApp+"&platform="+platformString+"&app="+dataGiven.id+"&uid="+uid,"_self");
		
	});
	
}

function CloseDetails() {
	document.getElementById('myModal').style.display = "none";
	//Notify Android
	if(androidMode) {
		Android.TriggerCardClose(); //Right now, this just notifies Android that we're in the card.
	}
	
	if(nativeApp==true||androidMode==true) {
		//If we are using a mobile app, we add the apps too.
		document.getElementById('appsList').style.display="block";
	}
	
}

function addListener(element, eventName, handler) {
  if (element.addEventListener) {
    element.addEventListener(eventName, handler, false);
  }
  else if (element.attachEvent) {
    element.attachEvent('on' + eventName, handler);
  }
  else {
    element['on' + eventName] = handler;
  }
}

	




function InitializeAndroid(givenWatch) { //Run to change the "mode" of the page to mobile. This is not using the native app.
	//THIS IS NOT USED ANYMORE!!!
	//Why? When I started this project, I made my own Android app
	//to deal with it. I'm no longer using that (heck, it doesn't
	//even work anymore) and I've switched to the native Pebble app.
	//This was used for that Android app. It will be removed in the future
	
	androidMode=true;//Make it download using Android Mode
	PrepareMobile(givenWatch);
	Android.SendVersionCode("2"); //Change the value here to adjust the version.
	
}


function MobileSortBtn() {
	
	
	//Decide if we should have the category button as an option.
	var catSearch = document.getElementById('search_cat_mobile');
	var catSearchIcon = document.getElementById('search_cat_mobile_icon');
	if (usingWatchapps) {catSearch.style="display:inline-block;"; catSearchIcon.style="display:inline-block;";}else{catSearch.style="display:none;";catSearchIcon.style="display:none;";}
	//Decide if we should have the category option (don't show if using watchfaces...duh)
	if(usingWatchapps) {
		//Show
		document.getElementById('search_cat_mobile').style="display:inline-block;";
		document.getElementById('search_cat_mobile_icon').style="display:inline-block;";
	} else {
		//Hide
		document.getElementById('search_cat_mobile').style="display:none;";
		document.getElementById('search_cat_mobile_icon').style="display:none;";
	}
	$('.mobile_search_area').toggleClass('mobile_search_area_disabled');
}

var currentlyPickedObj = null;

function MobileSortBarToggle(context) {
	//Last edit date: 3/31/18
	var obj = context.nextElementSibling;
	//Shrink all
	$('.sort_mobile_option_toggle_off').removeClass('sort_mobile_option_toggle_on');
	//Check of we should expand or shrink this object.
	if(currentlyPickedObj == obj) {
		//Leave it be
		currentlyPickedObj=null;
	} else {
		//Expand this one
		$(obj).addClass('sort_mobile_option_toggle_on');
		currentlyPickedObj=obj;
	}
}

var storedNewSortButtons = {"category":{"value":""},"sort":{"value":"VALUE"}}
var sortV3Toggled = false;

function NewSortButtonConfirm() {
	var s = document.getElementById('searchQueryMobileV3');
	var limit = 39;
	if(usingWatchapps){limit=15;}
	
	SearchButtonPressed(s.value,storedNewSortButtons.category.value,null,storedNewSortButtons.sort.value,(document.getElementById('sortV3PageSlider').value-1)*limit);
	SmoothScrollToTop();
	//Go back in history to hide.
	window.history.back();
	//...if that fails, toggle it manually.
	if(sortV3Toggled) {
		NewSortToggle();
	}
}

function NewSortQueryPages() {
	db_GetPageCount(function(data) {
		UpdateSlider(data,true);
	},document.getElementById('searchQueryMobileV3').value,storedNewSortButtons.category.value,null,storedNewSortButtons.sort.value);
}

function NewSortButtonPressed(e,type,value) {
	$('.newSortCategoryButtonToggle'+type).removeClass('newSortCategoryButtonSelected');
	if(type==0) {
		if(storedNewSortButtons.category.value==value) {
			//Deselect
			$(e).removeClass('newSortCategoryButtonSelected');
			storedNewSortButtons.category.value = "";
		} else {
			//Select
			storedNewSortButtons.category.value = value;
			$(e).addClass('newSortCategoryButtonSelected');
		}
		
	}
	
	if(type==1) {
		//Select
		storedNewSortButtons.sort.value = value;
		$(e).addClass('newSortCategoryButtonSelected');
	}
	
	//Update slider
	NewSortQueryPages();
	
}

function HandleSearchBtn(args) {
	//If search v3 is already open, ignore this.
	if(sortV3Toggled) {return;}
	//Search with these args if any.
	if(args.query!=null) {
		//Set the search text
		text_search=args.query;
	}
	//Show the search window (v3)
	NewSortToggle();
}

var historyChanges = {};
var sortV3LastNavBar="unknown";



function PushHistoryChange(callback, newHash) {
	if(newHash == null) {
		newHash = randInt(999999);
	}
	var newData = {};
	newData.callback = callback;
	newData.used = 0;
	historyChanges[window.location.hash]=newData;
	window.location.hash = newHash;
}

window.onhashchange = function() {
	
	//Catch back requests.
	var hash = window.location.hash;
	console.log("Catch for "+hash);
	var data = historyChanges[hash];
	if(data!=null) {
		if(data.used>0) {
			console.log("Callback caught, but it was already used!");
		} else {
			data.callback();
		}
		historyChanges[hash].used+=1;
	}
}

function NewSortToggle() {
	//If we're getting rid of the menu, unpush the history change.
	//If we're showing the menu, push a history change.
	if(!sortV3Toggled) {
		//Push
		PushHistoryChange(function(){
			if(sortV3Toggled) {
				NewSortToggle();
			}
		});

		//Set escape button
		closeCallback = function() {
			if(sortV3Toggled) {
				NewSortToggle();
			}
		}

		//Push enter toggle
		PushKeyEvent(function() {
			if(sortV3Toggled) {
				NewSortButtonConfirm();
			}
			
		},13);
	} else {
		//Remove enter keypress
		PullKeyEvent(13);
	}
	//Set nav bar
	if(nativeApp) {
		if(sortV3Toggled) {
			//Being disabled. Set to default.
			SetBar(sortV3LastNavBar);
		} else {
			//Set temporary variable and change it.
			sortV3LastNavBar = GetBar();
			SetBar("Sort And Filter");
		}
	}
	//Toggle the category select.
	var cat = document.getElementById('sortV3CategorySelect');
	if(usingWatchapps) {
		cat.style="";
	} else {
		cat.style="display:none;";
	}
	//Set some values.
	sortV3Toggled=!sortV3Toggled;
	document.getElementById('searchQueryMobileV3').value = text_search;
	var h = document.getElementById('searchUiV3_'+cat_search);
	if(h!=null) {
		$('.newSortCategoryButtonToggle0').removeClass('newSortCategoryButtonSelected');
		$(h).addClass('newSortCategoryButtonSelected');
		storedNewSortButtons.category.value = cat_search;
	}
	h = document.getElementById('searchUiV3_'+sortType);
	if(h!=null) {
		$('.newSortCategoryButtonToggle1').removeClass('newSortCategoryButtonSelected');
		$(h).addClass('newSortCategoryButtonSelected');
		storedNewSortButtons.sort.value = sortType;
	}
	UpdateSlider();
	$('#newSortInnerContainer').toggleClass('newSortInnerContainerActive');
	$('#newSortBg').toggleClass('newSortBgActive');
	$('#newSortBottom').toggleClass('newSortButtonActive');
	$('#newSortOuterContainer').toggleClass('newSortOuterContainerActive');
}

function UpdateSlider(pageCount,deval) {
	if(pageCount==null){pageCount=latestPageCount} else {
		latestPageCount=pageCount;
		latestPageCountGood=false;
	}
	var slider = document.getElementById('sortV3PageSlider');
	slider.min = 1;
	slider.max = pageCount;
	var val = currentPageSelected+1;
	if(deval!=null) {
		if(deval) {
			val=1;
		}
	}
	slider.value = val; 
	SortV3PageSliderMove(slider.value,pageCount);
}

function SortV3PageSliderMove(value,pageCount) {
	var v = "";
	var s = String(value);
	var i=0;
	while(i<s.length) {
		v+='<span class="sortV3PageSelectTextLetter">'+s[i]+"</span>";
		i+=1;
	}
	if(pageCount==null){pageCount=latestPageCount};
	document.getElementById('sortV3PageSliderText').innerHTML = v+" / "+pageCount;
}

var customAreaV1Toggled = false;
var customAreaCallback = null;
var customAreaSavedBar="Unknown";

function CustomAreaToggle(callback) {
	if(callback==null){
		callback=function() {
			
		}
	}
	if(!customAreaV1Toggled) {
		//If it's not toggled, push a back function.
		PushHistoryChange(function(){
			if(customAreaV1Toggled) {
				SetBar(customAreaSavedBar);
				CustomAreaToggle();
				callback();
			}
		});
		
		
	}
	//Swap
	customAreaV1Toggled=!customAreaV1Toggled;
	//Toggle
	$('#customV1InnerContainer').toggleClass('newSortInnerContainerActive');
	$('#customV1Bg').toggleClass('newSortBgActive');
	$('#customV1Bottom').toggleClass('newSortButtonActive');
	$('#customV1OuterContainer').toggleClass('newSortOuterContainerActive');
}

function DisplayNewCustomArea(innerHTML, callback,title) {
	document.getElementById('customV1InnerContainer').innerHTML = innerHTML;
	customAreaCallback=callback;
	customAreaSavedBar = GetBar();
	SetBar(title);
	CustomAreaToggle(callback);
	//Push escape
	closeCallback = function() {
		if(customAreaV1Toggled) {
			CustomAreaToggle(null);
		}
	}
}

var canNext = true;
var canBack = true;

function SetNextBackButtonStatus(nextBtn,bottomBtn) {
	if(!nextBtn) {
		$('#next_btn_1').addClass('classic_button_disabled');
		$('#next_btn_2').addClass('classic_button_disabled');
	} else {
		$('#next_btn_1').removeClass('classic_button_disabled');
		$('#next_btn_2').removeClass('classic_button_disabled');
	}

	if(!bottomBtn) {
		$('#prev_btn_1').addClass('classic_button_disabled');
		$('#prev_btn_2').addClass('classic_button_disabled');
	} else {
		$('#prev_btn_1').removeClass('classic_button_disabled');
		$('#prev_btn_2').removeClass('classic_button_disabled');
	}

	canNext = nextBtn;
	canBack = bottomBtn;

	//Toggle easter egg
	var egg = document.getElementById('endOfPage-easter-egg');
	if(egg!=null) {
		if(!nextBtn) {
			//Show
			egg.style="";
		} else {
			egg.style="display:none;";
		}
	}
}

function OpenInfoWindow() {
	DisplayNewCustomArea('<div onclick="DeveloperEnableTap();"><div style="font-size:15px;/* text-align:center; */"> Created by <u><a onclick="OpenExternalURL(\'https://romanport.com\')" style=" color: white; ">Roman Port</a></u> <br> <span> <br> Not associated with Pebble or Fitbit <br> Unless this page is under RomanPort.com, I\'m not moderating it <br> The font <u><a onclick="OpenExternalURL(\'https://www.fontsquirrel.com/fonts/d-din\')" style=" color: white; ">\'D-DIN\'</a></u> is licensed under <u><a onclick="OpenExternalURL(\'https://www.fontsquirrel.com/license/d-din\')" style=" color: white; ">\'SIL Open Font License\'</a></u> <br><br> <u><a onclick="OpenExternalURL(\'https://romanport.com/api/GeneralAPIs/out/?to=discord\')" style=" color: white; ">Contact Me</a></u> </span> <br> <br><div style="font-size: 25px;">Attributions</div> <br>Some icons made by Freepik from <u><a onclick="OpenExternalURL(\'https://www.flaticon.com\')" style=" color: white; ">www.flaticon.com</a></u>. </div></div>',function(){},"Information");
}

var devTaps = 0;

function DeveloperEnableTap() {
	//This is for the secret developer menu
	//Fired on tapping info.
	devTaps+=1;
	if(devTaps>7) {
		customAreaCallback= function() {
			WebStorage.PutItem("isDeveloper","true");
			DisplayImportantMessage("You're now a developer! <u onclick=\"DisableDeveloper();\">Turn off</u>",false);
			AddDeveloperToggleIfDev();
			devTaps=0;
		}
	}
}

function DisableDeveloper() {
	WebStorage.PutItem("isDeveloper","false");
	DisplayImportantMessage("You're no longer a developer.",true);
	document.getElementById('devTools-btn').style="display:none;"
}

function IsDeveloper(callback) {
	WebStorage.GetItem("isDeveloper",function(isDev) {
		if(isDev==null) {
			callback(false);
			return;
		}
		callback(isDev=="true");
	});
}

function AddDeveloperToggleIfDev() {
	IsDeveloper(function(isDev) {
		if(isDev) {
			//Add it.
			document.getElementById('devTools-btn').style="vertical-align:middle; float:right; margin-right: 10px;";
		}
	});
}

function ShowDevMenu() {
	DisplayNewCustomArea(document.getElementById('hiddenDevData').innerHTML.replace("%%WS_ID%%",WebStorage.CreateDebugStatusString()),function() {
		
	}, "Developer Tools");
}

function DevToolsRunJS(e) {
	var data = e.previousElementSibling.previousElementSibling.value;
	var output="Execution failed.";
	try {
		output = eval(data);
	} catch (e) {
		output="Execution failed. \r\n"+e;
	}
	e.previousElementSibling.innerHTML="Output:\r\n"+output;
}

function DevToolsToggleNative(state) {
	debug=state;
}

function DevToolsToggleNativeTest() {
	SetBar("Testing...");
}

function DevToolsNukeStorage() {
	//Clear out storage.
	localStorage.clear();
	//Exit menu
	CustomAreaToggle();
	//Show popup
	DisplayImportantMessage("Done. Reloading in 3 seconds...",false);
	//Reload in 3 seconds
	setTimeout(function() {
		location.reload();
	},3000);
}

function HideCustomAreaV1Btn() {
	var bar = customAreaSavedBar;
	history.back();
	
	if(customAreaV1Toggled){
		CustomAreaToggle();
	}
	
	customAreaCallback();
	SetBar(bar);
}

function NukeWebStorageAndLocalStorage(e) {
	//Clear WebStorage first
	WebStorage.ClearUser(function() {
		//Now, clear localStorage.
		DevToolsNukeStorage();
	});
}