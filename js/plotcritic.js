// Import variables if present (from env.js)
var env = {};
if(window){  
  Object.assign(env, window.__env);
}

var app = angular.module("svApp", []);


app.constant('__env', env);

app.directive('keypressEvents',
function ($document, $rootScope) {
    return {
        restrict: 'A',
        link: function () {
            $document.bind('keypress', function (e) {
                $rootScope.$broadcast('keypress', e, String.fromCharCode(e.which));
            });
        }
    }
});

app.controller("svCtrl", function($scope, $rootScope, $timeout, $http, $window) {

	$scope.email = '';
	$scope.password = '';
	$scope.scripts = [];
	$scope.images = [];
	$scope.currentImageIdx = 0;
	$scope.goodButton = ["good_button"];
	$scope.badButton = ["bad_button"];
	$scope.denovoButton = ["denovo_button"];
	$scope.variantImgSelected = '';	
	$scope.reachedEnd = false;
	$scope.reachedStart = false;
	$scope.hide = false;
	$scope.html_url = "";
	$scope.load_time;
	$scope.project = __env.config.projectName;
	$scope.authenticated = false;
	AWSCognito.config.apiVersions = {
		cognitoidentityserviceprovider: '2016-04-18'
	};
	AWSCognito.config.region = __env.config.region;
	AWS.config.region = __env.config.region;
	var userPoolId =  __env.config.userPoolId;
	var clientID = __env.config.clientID;
	var identityPoolId = __env.config.identityPoolId;
	var authenticationResult;
	var userPool;
	var cognitoUser;

    $rootScope.$on('keypress', function (evt, obj, key) {
        $scope.$apply(function () {
        	if ($scope.scripts.length > 0) {
        		if (key == 'g' || key == 'G') {
	            	$scope.goodVariant();
	            }
	            else if (key == 'b' || key == 'B') {
	            	$scope.badVariant();
	            }
	            else if (key == 'd' || key == 'D') {
	            	$scope.denovoVariant();
	            }
        	}            
        });
    })

	var sendScore = function(flag) {
		AWS.config.update({
			accessKeyId: __env.config.accessKey, 
			secretAccessKey: __env.config.secretAccessKey,
			endpoint: "https://dynamodb." + __env.config.dynamoRegion + ".amazonaws.com",
			region: __env.config.dynamoRegion
		});

		var docClient = new AWS.DynamoDB.DocumentClient();
		var now = Date.now();

		var imageID = "";
		if (typeof $scope.images[$scope.currentImageIdx]['inc_info'] === "string") {
			imageID = $scope.images[$scope.currentImageIdx]['inc_info'];
		}
		else {
			imageID = $scope.images[$scope.currentImageIdx]['inc_info']['src'];
		}
		var params = {
		    TableName:__env.config.dynamoScoresTable,
		    Item:{
		    	'identifier': $scope.email + "_" + now,
		        "email": $scope.email,
		        'image': imageID,
		        'bucket': __env.config.AWSBucketURl,
		        'response_time': now,
		        'load_time': $scope.load_time,
		        'project' : __env.config.projectName,
		        'score': flag,
		        'chrom': $scope.images[$scope.currentImageIdx]['chr'],
		        'start': $scope.images[$scope.currentImageIdx]['start'],
		        'end': $scope.images[$scope.currentImageIdx]['end']
		    }
		};
		docClient.put(params, function(err, data) {
		    if (err) {
		        console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
		    }
		});
	};

	var filterImages = function(seeAgain) {
		var scores = [];
		var batchScan = function (params) {
			AWS.config.update({
				endpoint: "https://dynamodb." + __env.config.dynamoRegion + ".amazonaws.com",
			});
			var docClient = new AWS.DynamoDB.DocumentClient();
			docClient.scan(params, function(err, data) {
			    if (err) {
			        console.error("Unable to retrieve item. Error JSON:", JSON.stringify(err, null, 2));
			    }
			    else {
			    	if (data.Items.length) {
			    		scores.push.apply(scores, data.Items);
			    	}
			    	if ("LastEvaluatedKey" in data) {
			    		params['ExclusiveStartKey'] = data['LastEvaluatedKey'];
			    		batchScan(params);
			    	}
			    	else {
			    		var filteredImages = [];
			    		$scope.images.forEach(function (imgItem) {
			    			var seenBefore = false;
			    			for (var i = 0; i<scores.length;++i) {
			    				if (imgItem['inc_info'] === scores[i]['image']) {
			    					seenBefore = true;
			    				}
			    			}
			    			if (seenBefore && seeAgain) {
			    				filteredImages.push(imgItem);
			    			}
			    			else if (!seenBefore && !seeAgain) {
			    				filteredImages.push(imgItem);
			    			}
			    		});
			    		shuffleArray(filteredImages);
			    	}
			    }
			});
		};
		var params = {
  			TableName: __env.config.dynamoScoresTable,
  			ProjectionExpression: "image",
  			FilterExpression: "#proj = :curr_proj and email = :curr_user",
		    ExpressionAttributeNames: {
		        "#proj": "project",
		    },
		    ExpressionAttributeValues: {
		        ":curr_proj" : __env.config.projectName,
		        ":curr_user" : $scope.email
		    }
		};
		batchScan(params)
	};	

	var loadImages = function (seeAgain) {
		var batchScan = function (params) {
			AWS.config.update({
				endpoint: "https://dynamodb." + __env.config.dynamoRegion + ".amazonaws.com",
			});
			var docClient = new AWS.DynamoDB.DocumentClient();
			docClient.scan(params, function(err, data) {
			    if (err) {
			        console.error("Unable to retrieve item. Error JSON:", JSON.stringify(err, null, 2));
			    }
			    else {
			    	if (data.Items.length) {
			    		$scope.images.push.apply($scope.images, data.Items);
			    	}
			    	if ("LastEvaluatedKey" in data) {
			    		params['ExclusiveStartKey'] = data['LastEvaluatedKey'];
			    		batchScan(params);
			    	}
			    	else {
						filterImages(seeAgain);
			    	}
			    }
			});
		};
		var params = {
  			TableName: __env.config.dynamoImagesTable,
		};
		batchScan(params);
	}

	var init = function () {
		// Sign user in (depends on pool object) and store token
		//***************************************************************************
		userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool({
		    UserPoolId : userPoolId,
		    ClientId : clientID 
		});

		var authenticationData = {
	        Username : $scope.email, 
	        Password :  $scope.password
	    };
	    var userData = {
		    Username : $scope.email,
		    Pool : userPool
		};

	    var authenticationDetails = new AWSCognito.CognitoIdentityServiceProvider.AuthenticationDetails(authenticationData);
	    var logins = {};
	    cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);
		cognitoUser.authenticateUser(authenticationDetails, {
	        onSuccess: function (result) {
	        	authenticationResult = result;
	        	logins['cognito-idp.'+__env.config.region+'.amazonaws.com/'+userPoolId] = result.getIdToken().getJwtToken();
	        	AWS.config.credentials = new AWS.CognitoIdentityCredentials({
				    IdentityPoolId: identityPoolId,
				    Logins: logins
				});				 
				AWS.config.credentials.get(function(err){
				    if (err) {
				        alert(err);
				    }
				});
	        	loadImages(false);
	        	$scope.authenticated = true;
	        	$scope.$apply();
	        }, 
	        onFailure: function(err) {
	        	var forceAliasCreation = true;
	        	userPool.client.makeUnauthenticatedRequest('confirmSignUp', {
					ClientId: userPool.getClientId(),
					ConfirmationCode: $scope.password,
					Username: $scope.email,
					ForceAliasCreation: forceAliasCreation,
				}, 
				err => {
					if (err) {
						alert("Failed to authenticate: invalid email, password, or confirmation code");
					}
					else {
						authenticationData['Password'] = "Password1@";
						authenticationDetails = new AWSCognito.CognitoIdentityServiceProvider.AuthenticationDetails(authenticationData);
						cognitoUser.authenticateUser(authenticationDetails, {
					        onSuccess: function (result) {
					        	authenticationResult = result;	        	
					        	logins['cognito-idp.us-east-1.amazonaws.com/'+userPoolId] = result.getIdToken().getJwtToken();
					        	AWS.config.credentials = new AWS.CognitoIdentityCredentials({
								    IdentityPoolId: identityPoolId,
								    Logins: logins
								});				 
								AWS.config.credentials.get(function(err){
								    if (err) {
								        alert(err);
								    }				  
								});
					        	loadImages(false);
					        	$scope.authenticated = true;
					        	$scope.$apply();
					        }, 
					        onFailure: function(err) {
					        	alert(err);
					        }
					    });
					}
				});
	        }
    	});
	};

	var shuffleArray = function (arr) {
	    for (var i = arr.length - 1; i > 0; i--) {
	        var j = Math.floor(Math.random() * (i + 1));
	        var temp = arr[i];
	        arr[i] = arr[j];
	        arr[j] = temp;
	    }
	    $scope.images = arr;
	    resetCurrent(0);
    	if ($scope.scripts.length > 0) {
			$scope.hide = true;

			element = angular.element( document.querySelector( '#allScored' ) );
			element.addClass('hidden');
		}
		else {
			element = angular.element( document.querySelector( '#allScored' ) );
			element.removeClass('hidden');
		}		
	};

	var updateScripts = function (callback) {
		element = angular.element( document.querySelector( '#mycontainer' ) );
        element.empty();
        angular.forEach($scope.scripts, function (script) {
        	if (typeof script === 'string') {
        		var scriptTag = angular.element(document.createElement("img"));
                scriptTag[0]['src'] = script;
                scriptTag.addClass("variantImgInside");
                element.removeClass("variantImg");
        	}
        	else {
            	var scriptTag = angular.element(document.createElement("script"));
                scriptTag[0]['src'] = script['src'];
                scriptTag[0]['id'] = script['id'];
                scriptTag[0]['data-bokeh-model-id'] = script['data-bokeh-model-id'];
                scriptTag[0]['data-bokeh-doc-id'] = script['data-bokeh-doc-id'];
                element.addClass("variantImg");
			}
            element.append(scriptTag);            
        });	
    };

	var resetCurrent = function (change) {
		if ($scope.images.length > 0) {
			$scope.currentImageIdx += change;
			$scope.scripts = [$scope.images[$scope.currentImageIdx]['inc_info']];
			updateScripts();

			$timeout(function() { 
				$scope.hide = true;
				$scope.load_time = Date.now();
			}, 100);	
		}
	};

	//scope functions
	$scope.goodVariant = function () {
		$scope.goodButton.push("good_button_dark");
		$scope.variantImgSelected = "variantImgGood";
		sendScore(true); 
		$timeout(function() { 
			$scope.goodButton.pop();
			$scope.variantImgSelected = "";
			$scope.next();
		}, 100);
	};

	$scope.denovoVariant = function () {
		$scope.denovoButton.push("denovo_button_dark");
		$scope.variantImgSelected = "variantImgDenovo";
		sendScore('denovo');
		$timeout(function() { 
			$scope.denovoButton.pop();
			$scope.variantImgSelected = "";
			$scope.next();
		}, 100);
	};

	$scope.badVariant = function () {
		$scope.badButton.push("bad_button_dark");
		$scope.variantImgSelected = "variantImgBad";
		sendScore(false);
		$timeout(function() { 
			$scope.badButton.pop();
			$scope.variantImgSelected = "";
			$scope.next();
		}, 100);
	};

	$scope.previous = function () {
		$scope.reachedEnd = false;
		$scope.reachedStart = false;

		if ($scope.currentImageIdx -1 >= 0) {
			resetCurrent(-1);
		}
		else {
			$scope.reachedStart = true;
		}
	};

	$scope.next = function () {
		$scope.reachedEnd = false;
		$scope.reachedStart = false;

		if ($scope.images.length > $scope.currentImageIdx +1) {
			resetCurrent(1);
		}
		else {
			$scope.reachedEnd = true;
		}
	};

	$scope.beginning = function () {
		resetCurrent(-$scope.currentImageIdx);
		$scope.reachedStart = true;

		if ($scope.currentImageIdx +1 !== $scope.images.length) {
			$scope.reachedEnd = false;
		}
	};
	$scope.ending = function () {
			resetCurrent(($scope.images.length-1)-$scope.currentImageIdx);
			$scope.reachedEnd = true;

			if ($scope.currentImageIdx !== 0) {
				$scope.reachedStart = false;
			}
	};

	$scope.seeImagesAgain = function() {
		loadImages(true);
	}

	$scope.reload = function () {
		$window.location.reload();
	};

	$scope.submit = function() {
		if ($scope.email != '' && $scope.password != '') {
			init();
		}
	};
});
