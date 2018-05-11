var callbackId=0;
var callbacks = [];
var platformAndroid=true;


					
function send(methodName, args, responseCallback, sendCallback)  {
	if(debug) {
		alert("[DEBUG] PblNative.send (JSON)\r\n"+JSON.stringify(args))
	}
	
	
	var _callbackId = -1; //Creates a variable
	if(typeof(responseCallback)=="function") {
		//Push callback
		callbacks.push(responseCallback);
		_callbackId = callbackId;
		callbackId+=1;
	}
	
	
	
	var uri = buildURI(methodName,_callbackId,args);
	var iframe = document.createElement("iframe");
	iframe.setAttribute("src", uri),
	iframe.setAttribute("height", "100px"),
	iframe.setAttribute("width", "1px"),
	document.documentElement.appendChild(iframe),
	iframe.parentNode.removeChild(iframe),
	iframe = null
}
				
				
function buildURI(methodName, _callbackId, args) {
	var msg = encodeMsg(methodName, _callbackId, args)
	  , protocol = "pebble-method-call-js-frame://"
	  , queryCharacter = platformAndroid === false ? "?" : ""
	  , uri = protocol + queryCharacter + "method=" + methodName + "&args=" + msg;
	return uri
}
function encodeMsg(methodName, callbackId, args) {
	var msgStringified, msg = {
		methodName: methodName,
		callbackId: callbackId,
		data: args
	};
	try {
		msgStringified = JSON.stringify(msg)
	} catch (e) {
		alert("[ERROR Native] msg cannot be JSON encoded", e)
	}
	var msgURIEncoded;
	try {
		msgURIEncoded = encodeURIComponent(msgStringified)
	} catch (e) {
		alert("[ERROR Native] msg cannot be URI encoded", e)
	}
	return msgURIEncoded
}
				
				
/* More friendly functions, not just ones from the original JS. */


function OpenExternalURL(inURL) {
	if(nativeApp==false) {
		//Just open it in a new tab
		window.open(inURL,'_blank');
	} else {
	send("openURL", {
                        url: inURL
                    })
	}
}

var navBarText="";

function SetBar(name) {
	navBarText = name;
	document.title=name+" - Pebble Ripper Archive"
	send("setNavBarTitle", {
                        title: name,
						show_share: 0
                    })
}

function GetBar() {
	return navBarText;
}

function Playground() {
	alert('sending');
	debug=true;
	send("refreshAccessToken", {
		
	}, function(data) {
		alert(data);
	})
	//alert(document.cookie);
}



function SetActiveApp(app) {
	var appData ={};
	appData.links={};
	appData.links.share=GetPathToRoot() + "applications/index.html&app=" +app.id;
	send("setVisibleApp", appData);
	//Show share
	send("setNavBarTitle", {
                        title: "App",
						show_share: !0
                    })
}

function GetFullDirURL() {
	var output = GetPathToRoot();
	return output.substring(0,output.length-1);

}

function DownloadAndOpenPBWNative(pbwJSON,loadCallback,finishCallback) {
	var fullPath = GetFullDirURL();

	var args = {
		id: pbwJSON.id, 
		uuid: pbwJSON.uuid, 
		title: pbwJSON.name,
		list_image: DecodeJSONUrlRequest(pbwJSON.path_list),
		icon_image: DecodeJSONUrlRequest(pbwJSON.path_icon),
		screenshot_image: DecodeJSONUrlRequest(pbwJSON.path_screenshots[0]),
		type: pbwJSON.appType,
		pbw_file: DecodeJSONUrlRequest(pbwJSON.path_pbw),
		links: {
			add: 'https://dev-portal.getpebble.com/api' + "/applications/" + pbwJSON.id + "/add", /*Change this in the future */
			remove: 'https://dev-portal.getpebble.com/api' + "/applications/" + pbwJSON.id + "/remove", /*Change this in the future */
			share: GetPathToRoot() + "applications/index.html&app=" + pbwJSON.id
		}
	};
	loadCallback();
	send("loadAppToDeviceAndLocker", args,finishCallback);
	console.log(args);
	
}



/* Functions used to handle requests from the app */

function PebbleBridge() {
	
	//This is nested because the Pebble native app calls it as such.
	//This function must be called first.
	
	function handleRequest(args) {
		
		if(debug) {
			alert("handleRequest - "+JSON.stringify(args));
		}
		
		
		switch (args.methodName) {
		case "search":
			//Check if we have a search query
			/*if(args.query == null) {
				//iOS dropdown request
				$('.mobile_search_area').toggleClass('mobile_search_area_disabled');
			} else {
				//Do a search
				var useWF = "false";
				if(isAppOpen==false) {
					//Not in app
					if(!usingWatchapps) {useWF="true";}
				} else {
					//In app
					if(currentAppJSON.appType=="watchface") {useWF="true";}
				}
				var platformString="true";
				if(!platformAndroid) {
					//Todo: Replace this with an enum
					platformString="false";
				}
				var newURL= "?nativeApp="+nativeApp+"&searchQuery="+args.query+"&platform="+platformString+"&useWatchfaces="+useWF;
				window.open(GetPathToRoot()+"index.html"+newURL,"_self");
			}*/
			
			//We no longer use the native search button. Display a message.
			HandleSearchBtn(args); //This depends on the page we're on. Let it handle itself.
			
			break;
		case "navigate":
			args.via && Analytics.logRouteLoaded({}, args.via),
			service._navigateTo(args.url || "/");
			break;
		case "refresh":
			service._reload()
		}
	};
	
	function handleResponse(args) {
		
		//Run callback
		var cbId = parseInt(args.callbackId);
		if(cbId != -1) {
			callbacks[cbId](args);
		}
		
		if(debug) {
			alert("handleResponse - "+JSON.stringify(args));
		}
		switch (args.methodName) {
			case "loadAppToDeviceAndLocker":
				
				break;
		}
	}
	window.PebbleBridge.handleRequest = handleRequest;
	window.PebbleBridge.handleResponse = handleResponse;
}


function Analytics() {
	//This function does nothing but ensure the app doesn't crash.
	
	function logRouteLoaded() {
		//Blank
	}
	
	/*function(
	
	templateUrl: "views/directives/pbl-add-btn.html",
            restrict: "E",
            scope: {
                app: "="
            },
            link: function(scope) {
                scope.Analytics = Analytics, scope.storeUrl = config.STORE_URL, scope.isMobileBrowser = config.IS_MOBILE_BROWSER, scope.isWebview = config.IS_WEBVIEW
            }*/
	
	window.Analytics.logRouteLoaded=logRouteLoaded;
}


/* Keeping the native app happy */
var service=Object;
service._navigateTo = function(args) {
	haltAppAndShowError(args);
}








function haltAppAndShowError(data) {
	document.getElementsByTagName("BODY")[0].innerHTML=data;
}

function causeError() {
	rgeijorjiurgj();
}

function TestIfBrowserIsNonnativeMobile() {
	//If we're using the native app, we know this is bad out of the gate.
	if(nativeApp) {
		return false;
	}
	//Check to see if it's mobile.
	return isMobileVar.any()!=null;
}


//https://stackoverflow.com/questions/11381673/detecting-a-mobile-browser
var isMobileVar = {
    Android: function() {
        return navigator.userAgent.match(/Android/i);
    },
    BlackBerry: function() {
        return navigator.userAgent.match(/BlackBerry/i);
    },
    iOS: function() {
        return navigator.userAgent.match(/iPhone|iPad|iPod/i);
    },
    Opera: function() {
        return navigator.userAgent.match(/Opera Mini/i);
    },
    Windows: function() {
        return navigator.userAgent.match(/IEMobile/i) || navigator.userAgent.match(/WPDesktop/i);
    },
    any: function() {
        return (isMobileVar.Android() || isMobileVar.BlackBerry() || isMobileVar.iOS() || isMobileVar.Opera() || isMobileVar.Windows());
    }
};














/*



angular.module("appstoreApp").service("Native", ["$location", "$log", "$route", "$rootScope", "Storage", "Analytics", "config", function($location, $log, $route, $rootScope, Storage, Analytics, config) {
                var enums, service = this;
                return angular.injector(["pblEnums"]).invoke(function(_enums_) {
                    enums = _enums_
                }),
                service.callbacks = [],
                service.callbackId = 0,
                service.methods = ["setNavBarTitle", "openURL", "addToLocker", "loadAppToDeviceAndLocker", "promptUserForAddToLockerOrLoad", "getAppsFromLocker", "removeFromLocker", "isAppInLocker", "unloadAppFromPebble", "getLoadedAppsFromPebble", "tryWatchface", "isConnected", "closeScreen", "skipStep", "bulkLoadAndClose", "setVisibleApp", "refreshAccessToken"],
                service._encodeMsg = function(methodName, callbackId, args) {
                    var msgStringified, msg = {
                        methodName: methodName,
                        callbackId: callbackId,
                        data: args
                    };
                    try {
                        msgStringified = JSON.stringify(msg)
                    } catch (e) {
                        return void $log.error("Native: msg cannot be JSON encoded", e)
                    }
                    var msgURIEncoded;
                    try {
                        msgURIEncoded = encodeURIComponent(msgStringified)
                    } catch (e) {
                        return void $log.error("Native: msg cannot be URI encoded", e)
                    }
                    return msgURIEncoded
                }
                ,
                service._buildURI = function(methodName, callbackId, args) {
                    var msg = service._encodeMsg(methodName, callbackId, args)
                      , protocol = "pebble-method-call-js-frame://"
                      , queryCharacter = config.PLATFORM === enums.PLATFORM.IOS ? "?" : ""
                      , uri = protocol + queryCharacter + "method=" + methodName + "&args=" + msg;
                    return uri
                }
                ,
                service._sendError = function(err, callback) {
                    $log.error(err),
                    "function" == typeof callback && callback(err)
                }
                ,
                service.send = function(methodName, args, responseCallback, sendCallback) {
                    window.setTimeout(function() {
                        if ($log.debug("Native:", methodName, args, responseCallback),
                        "string" != typeof methodName)
                            return service._sendError("Native: methodName is not an object", sendCallback);
                        if (!~service.methods.indexOf(methodName))
                            return service._sendError('Native: "' + methodName + '" is not in list of known methods', sendCallback);
                        if ("object" != typeof args)
                            return service._sendError("Native: args is not an object", sendCallback);
                        if (config.IS_BROWSER)
                            return void $log.debug("Native: " + methodName + " not available in browser");
                        var _callbackId = -1;
                        "function" == typeof responseCallback ? (service.callbacks.push(responseCallback),
                        _callbackId = service.callbackId,
                        service.callbackId = service.callbackId + 1) : responseCallback && service._sendError("Native: callback is not a function");
                        var uri = service._buildURI(methodName, _callbackId, args);
                        $log.debug("Native: URI", uri),
                        service._executeSend(uri),
                        "openURL" === methodName && Analytics.logOpenExternalLink(args.url, $location.path()),
                        "function" == typeof sendCallback && sendCallback(null, uri)
                    })
                }
                ,
                service._executeSend = function(uri) {
                    var iframe = document.createElement("iframe");
                    iframe.setAttribute("src", uri),
                    iframe.setAttribute("height", "1px"),
                    iframe.setAttribute("width", "1px"),
                    document.documentElement.appendChild(iframe),
                    iframe.parentNode.removeChild(iframe),
                    iframe = null
                }
                ,
                service.handleResponse = function(args) {
                    if ($log.debug("Native: handleResponse", args),
                    "object" != typeof args && null !== args)
                        return void $log.error("Native: args.methodName is not an object");
                    if ("object" != typeof args.data)
                        return void $log.error("Native: args.data is not an object");
                    if ("number" != typeof args.callbackId)
                        return void $log.error("Native: args.callbackId is not a number");
                    if (args.callbackId < 0)
                        return;
                    var callback = service.callbacks[args.callbackId];
                    delete service.callbacks[args.callbackId],
                    callback && "function" == typeof callback ? callback(args.data) : $log.error("Native: callback is not a function", callback)
                }
                ,
                service._navigateTo = function(url) {
                    var searchTrigger = document.getElementById("search-trigger");
                    if (searchTrigger.href = url,
                    searchTrigger.click)
                        searchTrigger.click();
                    else if (document.createEvent) {
                        var evObj = document.createEvent("MouseEvents");
                        evObj.initEvent("click", !0, !0),
                        searchTrigger.dispatchEvent(evObj)
                    }
                }
                ,
                service._reload = function() {
                    window.location.reload(!0)
                }
                ,
                service.handleRequest = function(args) {
                    if ("object" != typeof args)
                        return void $log.error("Native: args.methodName is not an object");
                    if ("string" != typeof args.methodName)
                        return void $log.error("Native: args.methodName is not an object");
                    switch (args.methodName) {
                    case "search":
                        var section = args.section || Storage.get("activeSection") || "watchapps"
                          , query = args.query || (Storage.get("searchData-" + section) || {}).query || ""
                          , isNative = !(!args.query && !args.section)
                          , url = "search/" + section + "/1?query=" + encodeURIComponent(query) + (isNative ? "&native=true" : "&autofocus");
                        $rootScope.$broadcast("Native:Search", section, query, isNative),
                        service._navigateTo(url);
                        break;
                    case "navigate":
                        args.via && Analytics.logRouteLoaded({}, args.via),
                        service._navigateTo(args.url || "/");
                        break;
                    case "refresh":
                        service._reload()
                    }
                }
                ,
                service
            }
            ])*/