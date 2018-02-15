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
	$scope.curationQuestion = __env.config.curationQandA.question;
	$scope.curationAnswers = [];
	$scope.additionalCurationItems = __env.config.additionalCuration;
	$scope.additionalCurationResponses = {};

	for (key in __env.config.curationQandA.answers) {
		$scope.curationAnswers.push([key, __env.config.curationQandA.answers[key]]);
	}
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
	var reportFields = Object.values(__env.config.reportFields);

    $rootScope.$on('keypress', function (evt, obj, key) {
        $scope.$apply(function () {
        	if ($scope.images.length > 0) {
        		var option = '';
        		for (idx in $scope.curationAnswers) {
        			if ($scope.curationAnswers[idx][0] == key) {
        				$scope.sendScore(key);
        			}
        		}
        	}
        });
    })

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

			    		if (__env.config.randomizeOrder) {
			    			$scope.images = shuffleArray(filteredImages);
			    		}
			    		else {
			    			$scope.images = filteredImages;
			    		}
			    		
					    resetCurrent(0);
				    	if ($scope.images.length > 0) {
							$scope.hide = true;

							element = angular.element( document.querySelector( '#allScored' ) );
							element.addClass('hidden');
						}
						else {
							element = angular.element( document.querySelector( '#allScored' ) );
							element.removeClass('hidden');
						}		
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
    	AWS.config.credentials = new AWS.CognitoIdentityCredentials({
		    IdentityPoolId: identityPoolId,
		    Logins: logins
		});
		cognitoUser.authenticateUser(authenticationDetails, {
	        onSuccess: function (result) {
	        	authenticationResult = result;
	        	logins['cognito-idp.'+__env.config.region+'.amazonaws.com/'+userPoolId] = result.getIdToken().getJwtToken();			 
				AWS.config.credentials.refresh(function(err){
				    if (err) {
				        alert(err);
				        console.log(err);
				    }
				});
	        	loadImages(false);
	        	$scope.authenticated = true;
	        	$scope.$apply();
	        }, 
	        onFailure: function(err) {
	        	console.log(err);
	        	var element = angular.element( document.querySelector( '#failedAuth' ) );
				element.removeClass('hidden');
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
	    return arr;
	};

	var resetCurrent = function (change) {
		if ($scope.images.length > 0) {
			$scope.currentImageIdx += change;
			$timeout(function() { 
				$scope.hide = true;
				$scope.load_time = Date.now();
			}, 100);	
		}
	};

	$scope.sendScore = function(option) {
		AWS.config.update({
			endpoint: "https://dynamodb." + __env.config.dynamoRegion + ".amazonaws.com",
		});

		var docClient = new AWS.DynamoDB.DocumentClient();
		var now = Date.now();
		var imageID = $scope.images[$scope.currentImageIdx]['inc_info'];
		var item = {
		    	'id': $scope.email + "_" + now,
		        "email": $scope.email,
		        'image': imageID,
		        'bucket': __env.config.AWSBucketURl,
		        'response_time': now,
		        'load_time': $scope.load_time,
		        'project' : __env.config.projectName,
		        'score': __env.config.curationQandA.answers[option]
		};
		for (var i = 0; i < reportFields.length; ++i) {
			item[reportFields[i]] = $scope.images[$scope.currentImageIdx][reportFields[i]];
		}

		var params = {
		    TableName:__env.config.dynamoScoresTable,
		    Item: item
		};
		docClient.put(params, function(err, data) {
		    if (err) {
		        console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
		    }
		    else {
		    	$scope.next();
		    }
		});
	};

	$scope.previous = function () {
		$scope.reachedEnd = false;
		$scope.reachedStart = false;

		if ($scope.currentImageIdx -1 >= 0) {
			resetCurrent(-1);
		}
		else {
			$scope.reachedStart = true;
			$scope.$apply();
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
			$scope.$apply();
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
		var element = angular.element( document.querySelector( '#failedAuth' ) );
		element.addClass('hidden');
		if ($scope.email != '' && $scope.password != '') {
			init();
		}
	};
});
