var currentPageSelected=0;
var okToSwitch=true;
var SQLMode=true;

//THIS IS FOR PHP!!!!

var latestPageCount=-1;
var latestPageCountGood=false;

function GetApiUri(query, category, watch, sort) {
	//All arguments are optional
	var type = "watchface";
	var limit = 39;
	if(usingWatchapps) {type="watchapp"; limit=15;}
	
	var searchTerms="limit="+limit+"&offset="+(currentPageSelected*limit)+"&type="+type;
	
	if(query==null) {query=text_search;}
	if(category==null) {category=cat_search;}
	if(watch==null) {watch=currentWatchSelected;}
	if(sort==null) {sort=sortType;}
	
	
	if(query.length>1) {
		searchTerms+="&search="+encodeURIComponent(query);
	}
	
	if(category.length>1) {
		searchTerms+="&category="+encodeURIComponent(category);
	}
	
	if(watch.length>1) {
		searchTerms+="&platform="+encodeURIComponent(watch);
	}
	
	if(sort.length>1) {
		searchTerms+="&sort="+encodeURIComponent(sort);
	}
	
	

	var url = GetPathToRoot()+"api/?"+searchTerms;
	
	//We override all of this if we're requesting a specific dev's work
	
	if(dev_search.length>1) {
		url=GetPathToRoot()+"api/?authorUUID="+dev_search+"&type="+encodeURIComponent(type)+"&offset=0&limit=99";
	}
	return url;
}

function db_GetPageCount(callback, query, category, watch, sort) {
	var url = GetApiUri(query, category, watch, sort)+"&basic=true";
	SubmitCacheServerRequest(url, function(data) {
		callback(data.totalPages);
	});
}

function db_SwitchPage(amount) {
	
	
	
	latestPageCountGood=false;
	if(amount>0) {
		currentPageSelected+=1;
	}
	if(amount<0) {
		currentPageSelected-=1;
	}
	if(currentPageSelected<0)
		currentPageSelected=0;
	
	
	//Request data from the server.
	
	var url = GetApiUri();

	SubmitCacheServerRequest(url,db_DisplayPageData);
	
	
	
}

function db_DisplayPageData(data) {
	currentSection.apps = data.data;
	latestPageCount=data.totalPages;
	latestPageCountGood=true;
	if(currentSection.apps.length<1) {
		//No results...
		var subText = "Psst...change what you're searching for";
		if(dev_search.length>1) {
			//Searching for a dev!
			subText="You're looking for more apps by a developer. They might not have any of these!";
		}
		document.getElementById('app_list_ul').innerHTML="<li style=\"width:100%; margin-top:15px; font-family: 'PT Sans', sans-serif; font-size:20px; text-align:center; \">We searched far and wide,<br>but no results were found. <br>Here's some text for now.<br><span style=\"font-size:15px; color:gray;\">("+subText+")</span></li>";
	} else {
		createUnorderedPage(0,currentSection.apps.length);
	}
	//Now fade it back in
	$("#app_list_ul").fadeIn(animationFadeSpeed);
	//Update URL
	currentItem = parseInt(currentPageSelected*itemsPerPage);
	UpdateUrlWithDetails();
	okToSwitch=true;
	//Fade out the cover card.
	RevealAppsList();
	//Set the title of the 
	if(currentSection.apps[0]!=null && dev_search.length>1) {
		//Set the "apps by xxx" thing
		SetBar("Apps by "+String(currentSection.apps[0].author));
	}
	//Set the buttons
	SetNextBackButtonStatus(data.can.next,data.can.back);
}

function db_GetMultipleAppIDs(ids,type,callback,errorCallback) {
	//Commit a search for each of these app IDs.
	var requestsGot = 0;
	var requestsNeeded = ids.length;
	var requests = [];
	var canceled = false;
	var timeout = setTimeout(function() {
		canceled=true;
		errorCallback();
	},1000*ids.length);
	//Foreach this
	var i=0;
	while(i<ids.length) {
		findById(ids[i], function(data) {
			//Add the data
			if(data["name"]!=null) {
				
				requests.push(data);
			}
			
			requestsGot+=1;
			if(requestsGot==requestsNeeded) {
				//Finished. 
				//Cancel the timeout
				clearTimeout(timeout);
				//Return the requests.
				if(!canceled) {
					callback(requests);
				}
			}
		},null,type);
		i+=1;
	}
}

function db_SearchPage(numberToJumpTo) {
	//alert("CPS "+currentPageSelected);
	//alert("NTJT "+numberToJumpTo);
	//alert("NTJTDIV "+numberToJumpTo/15);
	if(numberToJumpTo!=null) {
		parseInt(currentPageSelected=parseInt(numberToJumpTo)/itemsPerPage);
	}
	db_SwitchPage(0);
	
	
}

function SubmitCacheServerRequest(url, callback) {
	SubmitServerRequest(url,callback);
	//Todo later.
}

function NextButton() {
	if(!canNext) {
		return;
	}
	if(okToSwitch) {
		ClearAppsListWithoutScreenFill();
		okToSwitch=false;
		SwitchPage(1);
	}
	
}

function ClearAppsListWithoutScreenFill() {
	var h = document.getElementById('app_list_ul');
	$("#app_list_ul").fadeOut(animationFadeSpeed);
}
function PreviousButton() {
	if(!canBack) {
		return;
	}
	if(okToSwitch) {
		ClearAppsListWithoutScreenFill();
		okToSwitch=false;
		SwitchPage(-1);
	}
	
}

function findById(idToFind, callback,meta,type) {
	var typeString = "";
	if(type!=null) {
		//We're using type. Add it.
		typeString="&type="+type;
	}
	SubmitCacheServerRequest(GetPathToRoot()+"api/?offset=0&limit=1&appID="+idToFind+typeString, function(output) {
		//We can just call the callback because all of this stuff was done for us.
		output = output.data;
		if(output.length==1) {
			output = output[0];
		}
		if(meta!=null) {
			output.meta=meta;
		}
		callback(output);
	});
}



function OpenDetails(value) {
	findById(value, function(data) {
		
		
		OpenDetailsOfData(data);
	});
}


