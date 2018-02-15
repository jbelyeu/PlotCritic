// Import variables if present (from env.js)
var env = {};
if(window){  
  Object.assign(env, window.__env);
}

var app = angular.module("svApp", []);


app.constant('__env', env);

app.controller("svCtrl", function($scope, $rootScope, $timeout, $http, $window) {

	$scope.email = '';
	$scope.password = '';
	$scope.authenticated = false;
	$scope.records = [];
	var summaryFields = Object.values(__env.config.summaryFields);
	$scope.hide = false;
	$scope.orderByIdx = 0;
 	$scope.project = __env.config.projectName;
 	$scope.curationAnswers = [];
 	$scope.curationAnswerKeys = []
 	$scope.header = summaryFields;

 	for (key in __env.config.curationQandA.answers) {
 		$scope.curationAnswerKeys.push(key);
		$scope.curationAnswers.push(__env.config.curationQandA.answers[key]);
		$scope.header.push(__env.config.curationQandA.answers[key]);
	}
	$scope.header.push("Total Scores");

 	AWSCognito.config.apiVersions = {
		cognitoidentityserviceprovider: '2016-04-18'
	};
	AWSCognito.config.region = __env.config.region;
	AWS.config.region = __env.config.region;
	var userPoolId =  __env.config.userPoolId;
	var clientID = __env.config.clientID;
	var identityPoolId = __env.config.identityPoolId;
	var summaryFields = Object.values(__env.config.summaryFields);
	var authenticationResult;
	var userPool;
	var cognitoUser;
	var orderFieldTracker = new Array($scope.header.length).fill(false);

	$scope.reorder = function(index) {
		$scope.records.sort(function(a, b){
		    var a1 = a[index];
		    var b1= b[index];
		    if (a1 == b1) {
		    	return 0;
		    }
		    return a1> b1? 1: -1;
		});
		if (orderFieldTracker[index] == true) {
			orderFieldTracker[index] = false;
			$scope.records.reverse();
		}
		else {
			orderFieldTracker[index] = true;
		}
	};

	var showReport = function(rawData) {

		//should hold the image url, the summary fields, the number of scores for each answer (as a percent of total)
    	summary_data = {};
    	rawData.forEach(function (score_item) {
    		var img_url = score_item['image'];

    		if (! (img_url in summary_data)) {

    			summary_data[img_url] = [];
	    		for (var i = 0; i < summaryFields.length; ++i ) {
	    			summary_data[img_url].push(score_item[summaryFields[i]]);
	    		}
	    		for (var i = 0; i <= $scope.curationAnswers.length; ++i) {
	    			summary_data[img_url].push(0);
	    		}
    		}

    		for (var idx in $scope.curationAnswers) {
    			if (score_item['score'] === $scope.curationAnswers[idx]) {
    				summary_data[img_url][summaryFields.length + parseInt(idx)] += 1.0;
    			}
    		}
    		summary_data[img_url][summary_data[img_url].length-1] += 1.0;
    	});

    	for (var img in summary_data) {
    		for (var answerIDX = summaryFields.length; answerIDX < summary_data[img].length-1; ++answerIDX) {
    			summary_data[img][answerIDX] = parseFloat(summary_data[img][answerIDX]) / parseFloat(summary_data[img][summary_data[img].length-1]);
    		}
    	}

    	$scope.records = Object.values(summary_data).sort();
    	orderFieldTracker[0] = true;
    	$scope.authenticated = true;
    	$scope.hide = true;
    	$scope.$apply();
	};

	
	var loadReport = function () {
		var rawData = [];
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
			    		rawData.push.apply(rawData, data.Items);
			    	}
			    	if ("LastEvaluatedKey" in data) {
			    		params['ExclusiveStartKey'] = data['LastEvaluatedKey'];
			    		batchScan(params);
			    	}
			    	else {
						showReport(rawData);
			    	}			    	
			    }
			});
		};
		var params = {
  			TableName: __env.config.dynamoScoresTable,
  			FilterExpression: "#proj = :curr_proj",
		    ExpressionAttributeNames: {
		        "#proj": "project"
		    },
		    ExpressionAttributeValues: {
		        ":curr_proj" : __env.config.projectName
		    }
		};
		batchScan(params);
	};

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
				AWS.config.credentials.get(function(err){
				    if (err) {
				        alert(err);
				    }
				});
	        	loadReport();
	        }, 
	        onFailure: function(err) {
	        	console.log(err);
	        	var element = angular.element( document.querySelector( '#failedAuth' ) );
				element.removeClass('hidden');	    
	        }
    	});
	};

	$scope.reload = function () {
		$window.location.reload();
	};

	$scope.submit = function() {
		var element = angular.element( document.querySelector( '#failedAuth' ) );
		element.addClass('hidden');
		if ($scope.email != '') {
			init(false);
		}
	};
});
