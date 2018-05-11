//This is shared between all parts of this web-app.
var androidMode=false;
var isAppsListRevealed = false;

//Native things
var nativeApp=false;
var nativePlatform="android";
var animationFadeSpeed=150;

var debug=false;
var breakOnError=true;

function parseURLParams(url) { //This is ripped right from StackOverflow because I frankly have no idea how to do this. This'll grab data from the URL and return it.
    var queryStart = url.indexOf("?") + 1,
        queryEnd   = url.indexOf("#") + 1 || url.length + 1,
        query = url.slice(queryStart, queryEnd - 1),
        pairs = query.replace(/\+/g, " ").split("&"),
        parms = {}, i, n, v, nv;

    if (query === url || query === "") return;

    for (i = 0; i < pairs.length; i++) {
        nv = pairs[i].split("=", 2);
        n = decodeURIComponent(nv[0]);
        v = decodeURIComponent(nv[1]);

        if (!parms.hasOwnProperty(n)) parms[n] = [];
        parms[n].push(nv.length === 2 ? v : null);
    }
    return parms;
}

function randInt(max) {
	return Math.floor(Math.random() * Math.floor(max));
}

function InitErrors() {
	//We should report this error later. For now, we check if debug is on and catch errors.
	if(breakOnError) {
		window.onerror = errorTriggered;

	}
}

var errorShown = false;
var errorReported = false;
var errorReportStopped = false;
var timerState = 6;
var errorHandleJSON={};

function errorTriggered(msg,url,lineNo,columnNo,error) {
	if(errorShown)
		return;
	errorShown=true;
	console.log("Error!");
	var pathToSvg = GetPathToRoot()+"resources/stop.svg";
	var html = '<div style="min-height:100%; overflow-x: hidden; width:100%; font-family: \'d-din\'; background-color:#e8ebed; z-index:10000000;"> <div style="margin-top:20px; width:100%; height:100px; font-size:100px; text-align:center;"> :( </div> <div style="margin-top:20px; width:100%; font-size:25px; text-align:center;"> <b>Something broke</b><br> </div> <div style="margin-top:15px; width:100%; font-size:20px; text-align:center;"> Location: '+lineNo+" ,"+columnNo+'<br> <span style="font-family: \'IBM Plex Mono\', monospace; background-color:#f7f7f7; font-size:15px;"> '+url+' </span> <br> <br> Error:<br> <span style="font-family: \'IBM Plex Mono\', monospace; background-color:#f7f7f7; font-size:15px;"> '+error+' </span> <br><br> Sorry about the error! It\'ll be automaticly reported so some totally not robot humans can fix it. </div> <div style="margin-top:45px; width:100%; color:#444444; font-size:15px; text-align:center;"> <img src="https://romanport.com/redirect/discord/logo_black.svg" style="vertical-align:middle" height="20px"> </img> <a href="https://romanport.com/api/GeneralAPIs/out/?to=discord" target="_blank">Discord</a> </div> <div style="position:fixed; bottom:0; left:0; width:100%; height:30px; background-color:#d9dcde; z-index:10000001;" class="errorReportLoaderBars"> </div> <div id="errorReporterAnimation" class="errorReportLoaderBars" style="position:fixed; bottom:30px; left:0; "></div> <div style="position:fixed; bottom:0; left:0; height:30px; background-color:#caccce; z-index:10000002; transition: all 5s; transition-timing-function: linear;" id="errorLoader" class="errorReportBar errorReportLoaderBars"> </div> <div style="position:fixed; bottom:0; left:0; height:30px; z-index:10000010; margin-left:10px; line-height:30px;" id="errorReportString" class="errorReportLoaderBars"> Reporting in <span id="errorReportTimer">5 seconds</span>... </div> <div style="position:fixed; bottom:-5px; right:0; height:30px; z-index:10000010; margin-right:10px; line-height:30px;" id="stopErrorReportBtn" class="errorReportLoaderBars" onclick="errorReportStopped=true; HideErrorReportBar();"> <img src="'+pathToSvg+'" height="20px"> </div> </div>';
	document.body.innerHTML=html;
	document.body.style="background-color:#e8ebed";
	//Create string to send.
	errorHandleJSON.data="ERROR AT URL '"+url+"' AT POSITION "+lineNo+","+columnNo+". ERROR MSG '"+msg+"' WITH ERROR '"+error+"'.";
	errorHandleJSON.service="PebbleRipper";
	errorHandleJSON.version = 0;
	//Start the countdown.
	UpdateErrorTimer();
	
}

function UpdateErrorTimer() {
	timerState-=1;
	if(errorReportStopped || errorReported)
		return;
	if(timerState>0) {
		var suffix = "second";
		if(timerState!=1)
			suffix+="s";
		document.getElementById('errorReportTimer').innerHTML=timerState+" "+suffix;
		//Do this function again
		window.setTimeout(UpdateErrorTimer, 1000);
	} else {
		//Report now.
		document.getElementById('errorReportString').innerHTML="Reporting now...";
		//Get rid of the stop button.
		document.getElementById('stopErrorReportBtn').innerHTML="";
		//Send a report.
		$('#errorReporterAnimation').addClass('element-animation');

		SubmitErrorHandle(function() {
			//Good
			document.getElementById('errorReportString').innerHTML="Reported!";
			window.setTimeout(HideErrorReportBar, 2500);
		}, JSON.stringify(errorHandleJSON), function (err) {
			//Bad.
			document.getElementById('errorReportString').innerHTML="Error: "+err;
		});
	}
}

function HideErrorReportBar() {
	$('.errorReportLoaderBars').addClass("errorReportBarOffscreen");
}

function SubmitErrorHandle(callback, args, errorCallback) {
	
	//This has not been replaced because it uses a post request. You should add this into the main function.
	
	var xmlhttp = new XMLHttpRequest();
	xmlhttp.onreadystatechange = function() {
		
		if (this.readyState == 4 && this.status == 200) {
			if(this.responseText=="OK") {
				//Okay
				callback();
			} else {
				//Bad?
				errorCallback(this.responseText);
			}
		} 
		if(this.readyState==4 && this.status!=200) {
			
			errorCallback("Couldn't connect to server.");
		}
	}
	
	xmlhttp.open("POST", "https://romanport.com/api/GeneralAPIs/ErrorReporter/", true);
	xmlhttp.send(args);
}

var isTopMsgActive=false;
var topMsgActiveTimer=null;

function ToggleTopBar() {
	//Add a message to the top
	//Get elements
	var alB = document.getElementById("applist-bar");
	var alBP = document.getElementById("applist-bar-padding");
	if(alB!=null && alBP !=null) {
		$(alB).toggleClass("sort_mobile_msg_offset");
		$(alBP).toggleClass("sort_mobile_msg_padding_offset");
	}
	var adC = document.getElementById('appdata-content');
	if(adC!=null) {
		$(adC).toggleClass("applist-content-offset");
	}
	
	
	$("#msg-bar").toggleClass("top_msg_offset");
	
}

function DisplayImportantMessage(msg, autoHide) {
	if(isTopMsgActive) {
		//Already a message. Cancel the timeout and hide it.
		if(topMsgActiveTimer!=null) {
			clearTimeout(topMsgActiveTimer);
		}
		topMsgActiveTimer=null;
		ToggleTopBar();
	}
	//Set the top bar
	var bar = document.getElementById('msg-bar');
	bar.innerHTML=msg;
	isTopMsgActive=true;
	//Set a timeout.
	if(autoHide==null){
		autoHide=true; //Default
	}
	if(autoHide) {
		topMsgActiveTimer = setTimeout(function() {
			ToggleTopBar();
			isTopMsgActive=false;
		},5000);
	}
	
	//Show
	ToggleTopBar();
}

function RevealAppsList(callback) {
	//If callback is null, create a dummy
	if(callback == null) {
		callback = function(){};
	}
	//Check to see if we've already done this
	var div = document.getElementById('app_list');
	if(isAppsListRevealed==false) {
		//Before reveal, set the height to auto
		
		if(div !=null) {
			//Set scale factors.
			var h=1;
			if(usingWatchapps) {
				h=128*itemsPerPage;
			} else {
				h=219*(itemsPerPage/3); 
			}
			//h = $("#app_list").height();
			//div.style="min-height:"+h+"px;";
			
		}
		$("#loading_cover").fadeOut(animationFadeSpeed,callback);
		//Cancel the timeout for loader timeout
		if(loaderTimeout != null) {
			clearTimeout(loaderTimeout);
			loaderTimeout = null;
		}
		isAppsListRevealed=true;
	} else {
		callback();
	}
	
	if(div!=null) {
		document.getElementById('app_list_ul').style="height:auto; min-height:400px;";
		document.getElementById('app_list').style="height:auto; min-height:400px;"; //Actually, ignore this. Set it to auto! (Add some sort of min though)
	}
}

var loaderTimeout;

function SetupLoaderTimeout() {
	var f = function() {
		//Used when loading takes a long time.
		var h = document.getElementById('loader-error-timeout');
		h.style="";
	}
	loaderTimeout = setTimeout(f,6000);
}

function HideAppsList(callback) {
	isAppsListRevealed=false;
	SetupLoaderTimeout();
	$("#loading_cover").fadeIn(animationFadeSpeed,callback);
}


//Escape event listneer
closeCallback = null; //Called o escape press
keyPressEventList = {};

window.onkeyup = function(e) {
    var key = e.keyCode ? e.keyCode : e.which;
    //Check for escape
    if (key == 27) {
		if(closeCallback!=null) {
			closeCallback();
			closeCallback=null;
		}
    }
	//If it exists in the key event list, call it.
	var event = keyPressEventList[String(key)];
	if(event!=null) {
		event();
	}
    
}

function PushKeyEvent(callback,key) {
	keyPressEventList[String(key)] = callback;
}

function PullKeyEvent(key) {
	keyPressEventList[String(key)] = null;
}

function HideAppsListNow(callback) {
	$("#loading_cover").show();
	isAppsListRevealed=false;
	SetupLoaderTimeout();
	callback();
}

function SetAppsListHeight() {
	//Save the current height of the apps list.
	var height = $('#app_list_ul').height();
	//Erase the current list after setting the height
	document.getElementById('app_list_ul').style="height:"+height+"px;";
}

function SetBarToState() {
	//Set the bar to the current page the user is on.
	if(usingWatchapps) {
		SetBar("Watchapps");
	} else {
		SetBar("Watchfaces");
	}
}



function TriggerAndroidDismissCard() {
	if(androidMode) {
		Android.TriggerCardOpen(); //Right now, this just notifies Android that we're in the card.
	}
}

function GetUrlWithoutParams() {
	return window.location.protocol+"//"+window.location.hostname+window.location.pathname;
}

function GetParentFolder() { //This whole function is jank

	//REMOVE DURING PRODUCTION!
	//Since this is on GitHub, I set the root path to my own website.
	return "https://pebble-appstore.romanport.com/";

	var pos = window.location.pathname.split('/');
	var o =window.location.protocol+"//"+window.location.hostname+"/";

	var i=0;
	while(i<pos.length) {
		var element = pos[i];
		if(!element.includes("application")&&!element.includes(".html")) {
			o+=element+"/";
		}
		i++;
	}

	return o;
}

function GetPathToRoot() {
	return GetParentFolder();
}

function GetCurrentFullURL() {
	return window.location.protocol+"//"+window.location.hostname+window.location.pathname;
}



function changeURL(response, urlPath){ //Changes the URL for searching
     //document.getElementById("content").innerHTML = response.html;
     //document.title = response.pageTitle;
     window.history.replaceState({"html":response.html,"pageTitle":response.pageTitle},"", urlPath);
 }


/* Mobile things */

function PrepareMobile(givenWatch,pathToCss) { //This function is used to set up mobile for the mobile app and the native app.
	
	
	if(isAppOpen) {
		//App details
		document.getElementById('app_fullcard').style.position="static"; //This is shown differently on mobile.
	} else {
		//App list
		//document.getElementById('header').style.display="none";//Used to clean up on mobile.
	
		//Now hide top and bottom next and previous buttons
		if(androidMode) { //Only do this in MY APP!! Not the web, or the native app
			var allButtons = document.getElementsByClassName('main_footer');
			var checkButton=0;
			while(checkButton<allButtons.length) {
				allButtons[checkButton].style.display="none";
				checkButton++;
			}
		}
		//Done!
		
		if(typeof(androidMode) != "undefined") {
			if(androidMode==true) {
				//We are on the app list and we using the PebblePusher app, not the native app. Reload with the requested watch.
				currentWatchSelected=givenWatch;
				SearchPage("","",givenWatch);
				//I might want to improve this later
			}
		}
	
	}
	
	//replacejscssfile("style_frontpage.css", pathToCss, "css") //Replace CSS
	
	
	//We also want to make sure we're only showing the watches that the user is using.
	
}

function GetJSONRequest(url, callback, errorCallback) {
	console.log("shared.js - GetJSONRequest [DEPRECIATED]");
	//This has been replaced with the main request.
	
	SubmitServerRequest(url, callback, null);
}


function DecodeJSONUrlRequest(input) {
	if(input==null) {
		return ""; //Huh
	}
	input = input.replace("%rootUrl%/",GetPathToRoot());
	return input;
}



//LOCALIZATION
function DoLocalization() {
	var lang = localization_en;
	//Foreach this.
	var i=0;
	while(i<lang.length) {
		//Loop through each item and change the variables.
		var ii=1;
		var obj = lang[i];
		while (true) {
			//Repeat this until we know we can stop.
			var targetString = obj.element;
			if(ii>1) {
				targetString=String(ii)+targetString;
			}
			var target = document.getElementById(targetString);
			if(typeof(target)==null || target==null) {
				//Break from the loop
				break;
			} else {
				//Valid! Change it.
				target.innerHTML=obj.text;
				ii+=1;
			}
		}
		i+=1;
	}
}


function SubmitServerRequest(url, run_callback, fail_callback) {
	//This is the main server request function. Please change all other ones to use this.
	
	
	if(fail_callback==null) {
		//Just create a dumb function
		fail_callback=function(errorMsg, autoHide){
			DisplayImportantMessage("Failed - "+errorMsg,autoHide);
			
		};
	}
	var xmlhttp = new XMLHttpRequest();
	
	xmlhttp.timeout=10000;
	
	xmlhttp.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) {
			//This is most likely to be valid, but check for errors.
			var JSON_Data;
			try {
				JSON_Data = JSON.parse(this.responseText);
			} catch (e) {
				fail_callback("JSON Parse Error", true);
				return;
			}
			if(JSON_Data.error!=null) {
				//Server-side error!
				fail_callback(JSON_Data.error +" - Check Console", true);
				console.log("A server error ("+JSON_Data.error+") occurred and data could not be grabbed. Error: "+JSON_Data.raw_error);
				return;
			} else {
				//Aye okay here. Call the callback.
				run_callback(JSON_Data);
				return;
			}
		}  else if (this.readyState==4) {
			//Got an invalid request.
			fail_callback("HTTP Error "+this.status, true);
		}
	}
	
	xmlhttp.ontimeout = function() {
		fail_callback("No Connection", false);
	}
	
	xmlhttp.onerror = function() {
		fail_callback("No Connection", false);
	}
	
	xmlhttp.onabort = function() {
		fail_callback("Abort", false);
	}
	//Todo: Add timeout error.
	xmlhttp.open("GET", url, true);
	xmlhttp.send();
}

function GetTime() {
	return Date.now()/1000;
}

function detectIE() {
	var user = window.navigator.userAgent;
	return user.indexOf('MSIE ') > 0 || user.indexOf('Trident/' )> 0;
}

//DEFINE LOCALIZATION VARS
var localization_en = [ {"element":"text_cat_all","text":"All Categories"}, {"element":"text_cat_daily","text":"Daily"}, {"element":"text_cat_tau","text":"Tools & Utilities"}, {"element":"text_cat_notif","text":"Notifications"}, {"element":"text_cat_remotes","text":"Remotes"}, {"element":"text_cat_haf","text":"Health & Fitness"}, {"element":"text_cat_games","text":"Games"}, {"element":"text_sorttype_date","text":"Sort by Date"}, {"element":"text_sorttype_popular","text":"Sort by Popularity"}, {"element":"text_sorttype_name","text":"Sort by Name"}, {"element":"text_sorttype_cat","text":"Sort by Category"}, {"element":"text_search_btn","text":"Search"}, {"element":"text_header_name","text":"Pebble Store"}, {"element":"text_watch_all","text":"All Watches"}, {"element":"text_watchapps","text":"Watchapps"}, {"element":"text_watchfaces","text":"Watchfaces"}, {"element":"text_previous_page","text":"Previous Page"}, {"element":"text_next_page","text":"Next Page"}, {"element":"text_sort_page","text":"Sort"}, {"element":"text_page_allapps","text":"All Apps"}, {"element":"text_page_debug","text":"Debug Enviornment"}, {"element":"text_add_pbw","text":"ADD"}, {"element":"text_app_description","text":"Description"}, {"element":"text_app_author","text":"Author"}, {"element":"text_app_cat","text":"Category"}, {"element":"text_app_options_raw","text":"View Raw JSON"}, {"element":"text_app_options_takedown","text":"Send Verified Takedown Request"}, {"element":"text_app_options_companion_android","text":"Download Android Companion App"}, {"element":"text_app_options_companion_ios","text":"Download iOS Companion App"}, {"element":"text_app_options_website","text":"Website"}, {"element":"text_app_options_moreFromDev","text":"More from the Developer"}, {"element":"text_app_options_source","text":"Source"}, {"element":"text_app_modDate","text":"Last Modified"}, {"element":"text_app_modVersion","text":"Last Version"} ];