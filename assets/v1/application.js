var currentAppJSON;
var hasCompanionApp=false;
var savedScrollValue=0;

var isAppInfoOpen = false;
var isFlickityInit = false;

var onAppHideCallback = null;

function ShowAppInfo(appId,doneCallback) {
	//Main function
	//First, hide the apps list.
	HideAppsList(function() {
		//Save the scroll value. (This is jank!)
		savedScrollValue = document.documentElement.scrollTop;
		//Find the app.
		findById(appId, function(itemToUse){
			console.log(itemToUse);
			if(itemToUse.length == null) {
				//Display it. 
				currentAppJSON=itemToUse;
				SetDetails(currentAppJSON);
				//Switch to the apps list
				SwapMenuAndApp(false);
				
				//Push back button callback
				PushHistoryChange(function() {
					//Called when the user requests to go back
					ExitAppInfo();
				},"app_"+appId);
				//Set escape callback 
				closeCallback = function() {
					ExitAppInfo();
				}
				//Set bool
				isAppInfoOpen = true;
				//Set callback
				onAppHideCallback = doneCallback;
				//Set scroll to zero
				document.documentElement.scrollTop=0;
				//Continue afterwards
				FinishStartup();
				//Set scroll to zero
				document.documentElement.scrollTop=0;
			} else {
				//Not found!
				DisplayImportantMessage("Couldn't find that app.");
				if(doneCallback!=null) {
					doneCallback();
				}
			}
		});
	});
	
}

function ExitAppInfo() {
	if(!isAppInfoOpen) {
		//It's not even open. Stop
		return;
	}
	//Hide & show loader
	HideAppsListNow(function() {
		//Switch back
		SwapMenuAndApp(true);
		//Set title
		SetBarToState();
		//Clear callback
		closeCallback=null;
		//Set scroll
		//Unhide
		document.documentElement.scrollTop = savedScrollValue;
		RevealAppsList(function() {
			document.documentElement.scrollTop = savedScrollValue;
		});
		//Call callback if it exists
		if(onAppHideCallback !=null) {
			onAppHideCallback();
			onAppHideCallback=null;
		}
		//If flickity is init, kill it.
		if(isFlickityInit) {
			$('#screenshots_card').flickity('destroy');
			isFlickityInit=false;
		}
	});
}

function SwapMenuAndApp(showMenu) {
	var app = document.getElementById('app-data-main');
	var menu = document.getElementById('app-list-main');
	if(showMenu) {
		menu.style="";
		app.style="display:none";
	} else {
		menu.style="display:none;";
		app.style="";
	}
}

function FinishStartup() {
	//Keep the Pebble app happy
	PebbleBridge();
	Analytics();
	
	//Init error handle
	InitErrors();
	
	//Fade in
	RevealAppsList();
	
	//Make a nice back animation
	/*if (typeof history.pushState === "function" && document.referrer) {
        history.pushState("jibberish", null, null);
        window.onpopstate = function () {
			//Add a nice animation
			$("#loading_cover").hide().fadeIn(200, function(){
				window.history.back();
				
			});
            
        };
    }*/
	
	//Go ahead and initaialize Flicky for the screenshots.
	//If flickity is init, kill it.
	if(isFlickityInit) {
		$('#screenshots_card').flickity('destroy');
		isFlickityInit=false;
	}
	$('#screenshots_card').flickity({
	  // options
	  cellAlign: 'center',
	  prevNextButtons: false,
	  pageDots: false
	});
	isFlickityInit = true;
	
	//Add iOS and Android download buttons if we can
	if(currentAppJSON.com_ios.length>2) {
		//Enabled
		document.getElementById('download_ios').style.display="block";
		hasCompanionApp=true;
	}
	
	if(currentAppJSON.com_android.length>2) {
		//Enabled
		document.getElementById('download_android').style.display="block";
		hasCompanionApp=true;
	}
	if(SQLMode==true) {
		//We can show the "more for dev" button
		document.getElementById('moreFromDevBtn').style="display:inline-block;";
	}
	if(currentAppJSON.appSource.length>1) {
		//We can show the "more for dev" button
		document.getElementById('sourceBtn').style="display:inline-block;";
	}
	if(currentAppJSON.website.length>1) {
		//We can show the "more for dev" button
		document.getElementById('websiteBtn').style="display:inline-block;";
	}
}

function TryOpenExternal(url) {
	OpenExternalURL(url);
}

function CreateTinyIFrame(url) {
	var iframe = document.createElement("iframe");
	iframe.style.width = "0px";
	iframe.style.height = "0px";
	iframe.src=url;
	console.log("Opening NATIVE iFrame with path '"+url+"'");
	document.body.appendChild(iframe);
}

function DownloadFile(url) {
	//Check if we're using the native app
	if(nativeApp) {
		//Open the file externally
		OpenExternalURL(url);
	} else {
		//Open an iFrame and download
		CreateTinyIFrame(url);
	}
}

/* get button stuff */
var added=false;
function GetButtonPressed() {
	//Download the app.
	//Check if it's already downloaded
	if(added) {
		return;
	}
	//Check if we're in a mobile browser, but not in the native app. If we are. we want to push from the browser.
	
	if(nativeApp==true) {
		//Using native. Push this onto the Pebble app to deal with.
		DownloadAndOpenPBWNative(currentAppJSON,SetBtnState_Load,SetBtnState_Added);
	} else if(TestIfBrowserIsNonnativeMobile()) {
		//Using brwoser!
		//Push the app to the Pebble app.
		var url = "pebble://appstore/" + currentAppJSON.id;
		CreateTinyIFrame(url);
	} else {
		var open_url = DecodeJSONUrlRequest(currentAppJSON.path_pbw);
		DownloadFile(open_url);
		
	}
	
}


function MoreFromDevBtn() {
	//Go back to the list with special vars
	var platformVar = "ios";
	if(platformAndroid)
		platformVar="android;"
	var type="false";
	if(currentAppJSON.appType=="watchface")
		type="true";
	var urlToOpen = GetPathToRoot()+"index.html?nativeApp="+nativeApp+"&platform="+platformVar+"&authorUUID="+currentAppJSON.devID+"&useWatchfaces="+type;
	//Go there.
	window.open(urlToOpen,"_self");
}



/* /get button stuff */



function SetDetails(dataGiven) {
	//Set options
	document.getElementById('banner_card').style.display="block";
	//Set title
	SetBar("App");
	SetActiveApp(dataGiven); //Open it up
	//Hide the buttons that should be hidden
	var toBeHidden = ["download_android","download_ios","websiteBtn","moreFromDevBtn","sourceBtn"];
	var i = 0;
	while(i<toBeHidden.length) {
		document.getElementById(toBeHidden[i]).style="display:none";
		i++;
	}
	
	var screenshot=0;
	var screenshotsCard = document.getElementById('screenshots_card');
	//Clear screenshots
	screenshotsCard.innerHTML="";
	while(screenshot<currentAppJSON.path_screenshots.length) { 
		var urlToScreenshot = DecodeJSONUrlRequest(currentAppJSON.path_screenshots[screenshot]);
		screenshotsCard.innerHTML+="<div class=\"carousel-cell\"><img src=\""+urlToScreenshot+"\" class=\"drop_shadow app_fullcard_screenshots_img\" ></div>";
		screenshot=screenshot+1;
	}

	//We're now going to show/hide the banner and grow the description depending on if there is a banner.
	if(currentAppJSON.path_banner=="None") {
		//No banner. Hide it.
		document.getElementById('banner_card').style.display="none";
		
	} else {
		//There is a banner. Reset back to normal!
		document.getElementById('banner_card').style.display="inline-block";
		var urlToBanner = DecodeJSONUrlRequest(currentAppJSON.path_banner);
		document.getElementById('banner_card').innerHTML="<img src=\""+urlToBanner+"\" width=\"100%\" ></img>"; //Set the banner if we can.
	}
	//Finished.
	
	//Set meta data.
	document.getElementById('meta').innerHTML=dataGiven.author+"<br>"+dataGiven.category+"<br>"+dataGiven.lastUpdate+"<br>"+dataGiven.lastVersion;
	
	//Generate our share link
	var indexOfURL =  window.location.href.indexOf("?");
	var stockURL = window.location.href;
	if(indexOfURL>0) {
		stockURL = window.location.href.substring(0,indexOfURL);
	}
	var shareURL = GetPathToRoot()+"application/index.html?app="+dataGiven.id;
	
	document.getElementById('title_card').innerHTML=dataGiven.name; //Set name
	document.getElementById('author_card').innerHTML=dataGiven.author; //Set name
	document.getElementById('hearts_amount').innerHTML=dataGiven.hearts;
	
	if(dataGiven.category!="Faces") {
		var pathToIcon = DecodeJSONUrlRequest(currentAppJSON.path_icon);
		document.getElementById('app_icon_card').innerHTML='<img src="'+pathToIcon+'" height="100%"></img>';
	}
	document.getElementById('description_card').innerHTML=dataGiven.description; //Set description
	
	//Set the currently shown hearts amount from my server.
	CheckIfAppIsLiked(null,function(state) {
		SubmitServerRequest("https://romanport.com/api/PebbleRipper/globalHearts.php?id="+currentAppJSON.id,function(data) {
			//Update here.
			var value = Math.max(0,data.hearts);
			SetNewHearts("+ "+value, state);
		},function(){
			//Error.
			SetNewHearts(":(", state);
		});
	});
	
	
	//Fetch the status for the emulator by checking the cache.
	if(localStorage.getItem("updaterCache")!=null) {
		var cache = JSON.parse(localStorage.getItem("updaterCache"));
		var buttonStatus = cache.emulatorStatus.buttonShown;
		var newStyle="border:2px solid #008cff;";
		if(buttonStatus==true) {
			document.getElementById('tryButton').style=newStyle;
		}
		
	}

}

function SetNewHearts(d,checked) {
	document.getElementById('new_hearts_amount').innerHTML=d;
	//If checked, we show a red heart. If not, it's black.
	if(!checked) {
		document.getElementById('heart_icon').src="../resources/favorite.svg";
	} else {
		document.getElementById('heart_icon').src="../resources/favorite_active.svg";
	}
	
}

function AddOrRemoveHeart() {
	//Show loader.
	document.getElementById('new_hearts_amount').innerHTML='<div class="fadeLoader"></div>';
	//Check what action we need to take here
	CheckIfAppIsLiked(null,function(state) {
		var action = "add";
		if(state) {
			//It's already added! Remove it.
			//Todo: Do this serverside.
			action="remove";
		}
		//Submit the request.
		SubmitServerRequest("https://romanport.com/api/PebbleRipper/globalHearts.php?id="+currentAppJSON.id+"&action="+action,function(data) {
			//Update here.
			var value = Math.max(0,data.hearts);
			SetNewHearts("+ "+value,!state);
			//Now change it in our storage.
			CheckIfAppIsLiked(!state,function(){});
		},function(){
			//Error.
			SetNewHearts(":(",state);
		});
	});
	
	
	
}

function SetBtnState_Add() {
	var h = GetAddBtn();
	h.innerHTML="ADD";
	h.style="";
}

function SetBtnState_Load() {
	var h = GetAddBtn();
	h.innerHTML='<div class="appinstall-loader"></div>';
	h.style="";
}

function SetBtnState_Added() {
	var h = GetAddBtn();
	h.innerHTML="ADDED";
	h.style="border: 2px solid #444444;background-color: #4e4e4e;";
}

function GetAddBtn() {
	return document.getElementById('getButtonInside');
}

function CheckIfAppIsLiked(newState,callback) {
	//Newstate can be true, false, or null. If it's null, then we ignore it. If it's true, we use the new state.
	WebStorage.GetItem("likedItems",function(store) {
		var value = false;
		var j = {};
		if(store != null) {
			j=JSON.parse(store);
		}
		//We now have our array. Check to see if we exist in it.
		if(j[currentAppJSON.id]!=null) {
			//We exist! Check it
			value=j[currentAppJSON.id];
			//Update it
			if(newState!=null) {
				j[currentAppJSON.id]=newState;
			}
		} else {
			//We don't exist! We might need to toggle it.
			if(newState!=null) {
				j[currentAppJSON.id]=newState;
			}
			value=false;
		}
		//Set the storage back.
		if(newState!=null) {
			var string = JSON.stringify(j);
			WebStorage.PutItem("likedItems", string);
		}
		
		callback(value);
	});
	
}

function GoBack() {
	//This sends the user back to the apps list. It is old.
}

function TryButtonPressed() {
	//Launch this app in the web emulator.
	//Todo: Animate this.
	console.log("GET BUTTON");
	//Fetch this from the cache
	if(localStorage.getItem("updaterCache")!=null) {
		var cache = JSON.parse(localStorage.getItem("updaterCache"));
		var h = document.getElementById('tryIframe');
		h.style="";
		var pbw = DecodeJSONUrlRequest(currentAppJSON.path_pbw);
		h.src=cache.emulatorStatus.href.replace("%%URL%%",encodeURIComponent(pbw));
	}
	
}

//Add a listener for an iframe. This only kills the iframe.

function receiveMessage(event)
{
	//When this is called, ditch the iFrame
	var h = document.getElementById('tryIframe');
	if(h!=null) {
		h.style="display:none;";
		h.src="";
	}
	
}

window.addEventListener("message", receiveMessage, false);