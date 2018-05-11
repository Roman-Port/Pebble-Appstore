// Web Storage Manager by RomanPort
// RomanPort.com

var errorContinueCallback;
var errorShowMoreCallback;

class WebStorage {
	
	static LocalStorageTempLocation() {
		return "localSettingsCache";
	}	
	
	static GetItem(key, callback) {
		try {
			errorContinueCallback = callback;
			//Check if we should be using web storage. If we can't, store this locally like usual.
			if(!WebStorage.CheckIfWebStorageIsEnabled(key)) {
				//Get locally.
				callback(localStorage.getItem(key));
				return;
			}
			//As funny as it is, we store the settings locally before we upload them. Get that.
			var settingsCache = localStorage.getItem(WebStorage.LocalStorageTempLocation());
			//If settings cache is null, create it.
			if(settingsCache==null) {
				console.log("Cache is null!!!");
				//Fetch the data again and call myself.
				WebStorage.UpdateLocalCache(function(ok) {
					if(ok) {WebStorage.GetItem(key,callback);}else {
						throw "Cache refresh was not OK.";
					}
				});
				return;
			}
			
			//Parse
			settingsCache = JSON.parse(settingsCache);
			
			//Check if cache is too old.
			if(WebStorage.CheckCache(settingsCache)==false) {
				//Cache is too old! Reload it, then call myself again.
				console.log("Cache is too old! Refreshing...");
				WebStorage.UpdateLocalCache(function(ok) {
					if(ok) {WebStorage.GetItem(key,callback);} else {
						throw "Cache refresh was not OK.";
					}
				});
				return;
			}
			
			//Return the value.
			//Destringify in try except
			var o = settingsCache.data[key];
			callback(o);
		} catch(e) {
			WebStorage.OnCriticalError(e);
		}
	}
	
	static PutItem(key,value) {
		try {
			errorContinueCallback = function(){};
			//Check if we should be using web storage. If we can't, store this locally like usual.
			if(!WebStorage.CheckIfWebStorageIsEnabled(key)) {
				//Get locally.
				localStorage.setItem(key,value);
				return;
			}
			
			//Go fetch the local cache.
			var settingsCache = localStorage.getItem(WebStorage.LocalStorageTempLocation());
			
			//Check if this isn't null
			if(settingsCache==null) { 
				//Try and fetch new settings, then call myself again.
				WebStorage.UpdateLocalCache(function(ok) {
					console.log("Fetching new...");
					if(ok) {WebStorage.PutItem(key,value);} else {
						//Uh oh. Todo: Add this to a writeback cache that'll be written when we reestablish an internet connection to the server.
						console.log("Writeback");
					}
				});
				
				return;
			}
			
			//Parse
			settingsCache = JSON.parse(settingsCache);
			
			//Check if cache is too old.
			if(WebStorage.CheckCache(settingsCache)==false) {
				//Cache is too old! Reload it, then call myself again.
				console.log("Cache is too old! Refreshing...");
				WebStorage.UpdateLocalCache(function(ok) {
					if(ok) {WebStorage.PutItem(key,value);}
				});
				return;
			}
			
			//Write here.
			console.log("Putting key "+key+" with value "+value+".");
			settingsCache.data[key]=value;
			//console.log(settingsCache);
			
			//Stringify and reupload. Also push back to cache.
			localStorage.setItem(WebStorage.LocalStorageTempLocation(),JSON.stringify(settingsCache));
			
			//Reupload
			var data = JSON.stringify(settingsCache);
			
			var xmlhttp = new XMLHttpRequest();
			xmlhttp.onreadystatechange = function() {
				if (this.readyState == 4 && this.status == 200) {
					var data = JSON.parse(this.responseText);
					WebStorage.StorageErrorIfError(data);
					console.log("Server updated!");	
				}
			}
			
			xmlhttp.open("PUT", WebStorage.GetGatewayApiUrl(), true);
			xmlhttp.send(data);
			
		} catch(e) {
			WebStorage.OnCriticalError(e);
		}
	}
	
	static OnCriticalError(error) {
		//Uh oh. Create a page to show on error.
		var cb = function() {
			DisplayNewCustomArea("<br><br><br><u>An error has occured while WebStorage was accessing data.</u><br> This error is unknown. You should let me know about it. <br> The error goes as follows...<br>"+error+"<br><br><u>What does this mean?</u><br>WebStorage was developed to fix setting clears on phone reboot. It saves basic app store settings and liked apps. This storage is stored on a server, but the connection to this server failed. This might be a temporary outage, a problem with the network, or corrupt storage.<br><br><u>What can you do?</u><br>First, you should let me know. You could either try again later, or clear your WebStorage and lose saved settings and liked apps. Clearing this will not erase any Pebble options. If you'd like to force a clear, <span onclick=\"WebStorage.ClearUser()\"><u>click here.</u></span><br><br><u>Can I countinue even with this error?</u><br>Yes, this error is recoverable. However, <u><b>skipping this error can cause unsaved settings to be lost, unstability, and further corruption.</b></u> I recommend not skipping this error. If you'd like to continue normally, <span onclick=\"errorContinueCallback();\"><u>click here.</u></span>",function(){},"Fatal Error");
		}
		errorShowMoreCallback = cb;
		//Display message
		DisplayImportantMessage("WebStorage Fatal Error. Stopped. <span onclick=\"errorShowMoreCallback();\"><u>More Details</u></span>",false);
	}

	static ClearUser(callback) {
		//Erases the user.
		var xmlhttp = new XMLHttpRequest();
		xmlhttp.onreadystatechange = function() {
			if (this.readyState == 4 && this.status == 200) {
				var data = JSON.parse(this.responseText);
				WebStorage.StorageErrorIfError(data);
				console.log("Server cleared!");	
				callback();
			}
		}
		
		xmlhttp.open("PUT", WebStorage.GetGatewayApiUrl(), true);
		xmlhttp.send("CLEAR");
	}
	
	static GetGatewayApiUrl() {
		//Get the token.
		var token = WebStorage.GetGatewayToken();
		return "https://romanport.com/api/PebbleRipper/userStorage/data/?token="+token;
	}
	
	static GetGatewayToken() {
		var token = parseURLParams(window.location.href).uid;
		//If the uid is null, then we didn't pass in our UID.
		var localStorageTokenKey="webStorageToken";
		//Generate a new token if null
		var noTokenFunction = function() {
			//Check if we have one in storage.
			token = localStorage.getItem(localStorageTokenKey);
			//If this is null, generate a new one.
			if(token==null) {
				token="";
				while(token.length<32) {
					var rand = randInt(9);
					token+=String(rand);
				}
				//Save
				console.log(token);
				localStorage.setItem(localStorageTokenKey,token);
			}
		}
		if(token==null) {
			noTokenFunction();
		}
		token=String(token);
		if(token.length<5) {
			noTokenFunction();
		}
		return token;
	}
	static CheckCache(data) {
		//console.log(data);
		//Check if we can test this.
		if(data.cacheDate==null||data.cacheLifespan==null||data.lastToken==null) {
			return false;
		}
		//Get the oldest time we can be to have valid cache.
		var oldestDate = data.cacheDate+data.cacheLifespan;
		//Check if the last user matches the current user.
		if(WebStorage.GetGatewayToken()!=data.lastToken) {
			console.log("Cached token isn't the same as the current one. Nuking cache...");
			return false;
		}
		//If the current time is beyond this, return false.
		return GetTime()<=oldestDate;
	}
	
	
	static UpdateLocalCache(callback) {
		var xmlhttp = new XMLHttpRequest();
		
		var failedFunction = function(obj) {
			//Error for some reason. Display message
			DisplayImportantMessage("Couldn't sync your settings. Check the network.");
			//Check if we have data
			if(localStorage.getItem(WebStorage.LocalStorageTempLocation())==null) {
				//No internet connection and no data. Just create some default data.
				var data = {};
				data.data={};
				data.cacheLifespan=30;
				data.cacheDate = GetTime();
				//Write.
				localStorage.setItem(WebStorage.LocalStorageTempLocation(),JSON.stringify(data));
			} else {
				//Before we give the ok, reset the cache lifespan and cache date.
				var data = JSON.parse(localStorage.getItem(WebStorage.LocalStorageTempLocation()));
				data.cacheLifespan = 30;
				data.cacheDate = GetTime();
				//Rewrite
				localStorage.setItem(WebStorage.LocalStorageTempLocation(),JSON.stringify(data));
			}
			callback(true);
		}
		
		xmlhttp.onreadystatechange = function() {
			if (this.readyState == 4 && this.status == 200) {
				var data = JSON.parse(this.responseText);
				WebStorage.StorageErrorIfError(data);
				data.cacheDate=GetTime();
				data.lastToken = WebStorage.GetGatewayToken();
				//console.log(data);
				localStorage.setItem(WebStorage.LocalStorageTempLocation(),JSON.stringify(data));
				console.log("Local data updated!");	
				callback(true);
			} else if(this.readyState == 4) {
				failedFunction(this);
			}
		}
		
		xmlhttp.onerror = function() {
			failedFunction(xmlhttp);
		};
		
		xmlhttp.open("GET", WebStorage.GetGatewayApiUrl(), true);
		xmlhttp.send();
	}
	
	static StorageErrorIfError(data) {
		if(data.error!=null) {
			//Called on error.
			DisplayImportantMessage(data.error);
			console.log(data.error);
		}
	}
	
	static CheckIfWebStorageIsEnabled(key) {
		//Not only does this ensure web storage is enabled, but it'll check if if the key is on the whitelist.
		//Check if the domain matches
		if(window.location.hostname != "pebble-appstore.romanport.com") {
			//Bad domain
			return false;
		}
		//Here: Check if we should cancel because of no token or something
		
		//Now, check if the key is on the whitelist
		var whitelist = ["isDeveloper","lastArticleSeen","likedItems","storedSettings","test","isNightMode"];
		var i=0;
		while(i<whitelist.length) {
			if(whitelist[i]==key) {
				return true;
			}
			i+=1;
		}
		
		console.log("Key "+key+" won't be from the server because it isn't on the whitelist!");
		return false;
	}
	
	static CreateDebugStatusString() {
		var output="";
		var spanHTML = '<span style="border-radius: 20px;padding-left: 5px;padding-right: 5px;background-color: #ec3939;display: inline-block;">';
		var spanEndHTML = '</span>';
		if(WebStorage.CheckIfWebStorageIsEnabled("isDeveloper")) {
			//If this is true, write the ID.
			var id = WebStorage.GetGatewayToken();
			output+="ID: "+id;
			var url = parseURLParams(window.location.href);
			
			var gotFrom = " "+spanHTML+"Local Token ONLY"+spanEndHTML+"<br>Your settings are stored on the server, but your token is only stored in the browser. Your settings are still at risk.";
			if(url.uid!=null) {
				if(String(url.uid)==id) {
					//Got from URL.
					gotFrom = " "+spanHTML+"URL"+spanEndHTML;
				}
			}
			
			output+=gotFrom;
			
		} else {
			//If this is ran, it is disabled.
			output+=spanHTML+"WebStorage is disabled."+spanEndHTML;
		}
		return output;
	}
	
}