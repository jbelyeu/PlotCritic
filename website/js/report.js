// Import variables if present (from env.js)
var env = {};
if(window){  
  Object.assign(env, window.__env);
}

var app = angular.module("svApp", ['ngCookies']);
app.constant('__env', env);
app.controller("svCtrl", function($scope, $rootScope, $timeout, $http, $window, $cookies) {

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
 	var defaultPassword = "Password1@";

 	for (key in __env.config.curationQandA.answers) {
 		$scope.curationAnswerKeys.push(key);
		$scope.curationAnswers.push(__env.config.curationQandA.answers[key]);
		$scope.header.push(__env.config.curationQandA.answers[key] + " (%)");
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



	var authenticatedLogin = function (callback){
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
	        	callback();
	        }, 
	        onFailure: function(err) {
	        	console.log(err);
	        	var element = angular.element( document.querySelector( '#failedAuth' ) );
				element.removeClass('hidden');
	        }
    	});
	};

	var unauthenticatedLogin = function (userPool) {
		var forceAliasCreation = true;
    	userPool.client.makeUnauthenticatedRequest('confirmSignUp', {
			ClientId: userPool.getClientId(),
			ConfirmationCode: $scope.password,
			Username: $scope.email,
			ForceAliasCreation: forceAliasCreation,
		}, 
		err => {
			if (err) {
				console.log(err);
	        	var element = angular.element( document.querySelector( '#failedAuth' ) );
				element.removeClass('hidden');
			}
			else {
				$scope.password = defaultPassword;
				$scope.confirming = false;
				authenticatedLogin(function(){
					$scope.initialLogin = true;
					$scope.changingPassword = true;
					$cookies.put('pass',$scope.password);
	        		$cookies.put('email',$scope.email);
					$scope.$apply();
				});
			}
		});

	};

	var init = function() {
		// Sign user in (depends on pool object) and store token
		//***************************************************************************
		userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool({
		    UserPoolId : userPoolId,
		    ClientId : clientID 
		});

		if ($scope.confirming) {
	       	unauthenticatedLogin(userPool);
		}
		else {
			authenticatedLogin(function () {
				$cookies.put('pass',$scope.password);
	        	$cookies.put('email',$scope.email);
				loadReport();
			});
		}
	};

	$scope.changePassword = function () {
		if ( !$scope.newPassword1 || !$scope.newPassword2) {
			alert ("Please enter your new password twice to verify it");
			return;
		} 
		if ($scope.newPassword1 !== $scope.newPassword2 ) {
			alert ("Mismatched passwords");
			return;
		}
		if ($scope.newPassword1 === defaultPassword) {
			alert ("Invalid/insecure password");
			return;
		}
		if ($scope.newPassword1.length < 6) {
			alert("Invalid password. Passwords must be at least 6 characters long");
			return;
		}
		cognitoUser.changePassword($scope.password, $scope.newPassword1, function(err, result) {
	        if (err) {
	        	cognitoUser.changePassword(defaultPassword, $scope.newPassword1, function(err, result) {
	        		if (err) {
	        			alert("Failed to update password. You may have exceeded your attempt limit for now.");
		            	console.log(err);
	        		}
	        		else {
				        $scope.changingPassword = false;
				        $scope.password = $scope.newPassword1;
						alert ("Password updated");
						$scope.authenticated = true;
						$scope.$apply();
						loadReport();
	        		}
	        	});
	        }
	        else {
		       	$scope.changingPassword = false;
		        $scope.password = $scope.newPassword1;
				alert ("Password updated");
				$scope.authenticated = true;
				$scope.$apply();
				loadReport();
	        }
	    });
	};

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
		var entryRows = [];

		//should hold the image url, the summary fields, the number of scores for each answer (as a percent of total)
    	summaryData = {};
    	rawData.forEach(function (score_item) {
    		var img_url = score_item['image'];

    		if (! (img_url in summaryData)) {

    			summaryData[img_url] = [];
	    		for (var i = 0; i < summaryFields.length; ++i ) {
	    			summaryData[img_url].push(score_item[summaryFields[i]]);
	    		}
	    		for (var i = 0; i <= $scope.curationAnswers.length; ++i) {
	    			summaryData[img_url].push(0);
	    		}
    		}

    		for (var idx in $scope.curationAnswers) {
    			if (score_item['score'] === $scope.curationAnswers[idx]) {
    				summaryData[img_url][summaryFields.length + parseInt(idx)] += 1.0;
    			}
    		}
    		summaryData[img_url][summaryData[img_url].length-1] += 1.0;

    		//store scores for downloadable report
    		fields_to_show = [score_item['email'],
    							score_item['image'],
    							score_item['score'].toString(),
    							score_item['load_time'].toString(), 
    							score_item['response_time'].toString(), 
    							score_item['project']];

    		reportFields = Object.values(__env.config.reportFields);
     		for (var i=0; i<reportFields.length; ++i) {
     			field = reportFields[i];
     			if (typeof score_item[field] == Array){
     				fields_to_show.push(score_item[field].join(","));
     			}
     			else {
     				fields_to_show.push(score_item[field]);
     			}
     		}
			entryRows.push(fields_to_show.join("\t"));
    	});

    	for (var img in summaryData) {
    		for (var i = 0; i < summaryFields.length; ++i) {
    			var valAsInt = parseInt(summaryData[img][i]);
    			if (!isNaN(valAsInt)) { 
    				summaryData[img][i] = parseInt(summaryData[img][i]);
    			}
    		}
    		for (var answerIDX = summaryFields.length; answerIDX < summaryData[img].length-1; ++answerIDX) {
    			summaryData[img][answerIDX] = ((parseFloat(summaryData[img][answerIDX]) / 
    				parseFloat(summaryData[img][summaryData[img].length-1]))*100).toFixed(1);
    		}
    	}

    	$scope.records = Object.values(summaryData).sort();

    	//write tsv file for raw downloadable report
    	buildRawReport(entryRows);

		//write tsv file for downloadable summary report
		buildSummaryReport();

    	orderFieldTracker[0] = true;
    	$scope.authenticated = true;
    	$scope.hide = true;
    	$scope.$apply();
	};

	var buildRawReport = function (entryRows) {
		//write tsv file for raw downloadable report
    	var rawHeader =  "#Q:" + __env.config.curationQandA.question + "\n";
    	var answers = [];
		for (var key in __env.config.curationQandA.answers) {
			answers.push(__env.config.curationQandA.answers[key]);
		}

    	rawHeader += "#A:" + answers.join("\t") + "\n";
    	header_fields = ["EMAIL","IMAGE", "SCORE", "LOADTIME", "RESPONSETIME", "PROJECT"];
		header_fields = header_fields.concat(Object.values(__env.config.reportFields));
    	rawHeader += ("#" + header_fields.join("\t"))

    	content = rawHeader +"\n"+ entryRows.join("\n");
		var rawBlob = new Blob([ content ], { type : 'text/plain' });
		$scope.rawReport = (window.URL || window.webkitURL).createObjectURL( rawBlob );
	};

	var buildSummaryReport = function () {
		var downloadableSummaryHeader = "#Q:" + __env.config.curationQandA.question + "\n";
		var answers = [];
		for (var key in __env.config.curationQandA.answers) {
			answers.push(__env.config.curationQandA.answers[key]);
		}
		downloadableSummaryHeader += "#A:" + answers.join("\t") + "\n";
		downloadableSummaryHeader += $scope.header.join("\t");
		summaryRows = [];
		for (var i = 0; i < $scope.records.length; ++i) {
			summaryRows.push($scope.records[i].join("\t"));
		}

    	content = downloadableSummaryHeader +"\n"+ summaryRows.join("\n");
		var summaryBlob = new Blob([ content ], { type : 'text/plain' });
		$scope.summaryReport = (window.URL || window.webkitURL).createObjectURL( summaryBlob );
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
			    	//if a person scored an image more than once, remove all but the most recent score
			    	if (data.Items.length) {
			    		rawData.push.apply(rawData, data.Items);
			    	}
			    	if ("LastEvaluatedKey" in data) {
			    		params['ExclusiveStartKey'] = data['LastEvaluatedKey'];
			    		batchScan(params);
			    	}
			    	else {
			    		scoreTracker = {};
			    		rawData.forEach(function (scoreItem) {
			    			if (!(scoreItem['email'] in scoreTracker)) {
			    				scoreTracker[scoreItem['email']] = {};
			    			}
			    			if (! (scoreItem['image'] in scoreTracker[scoreItem['email']])) {
			    				scoreTracker[scoreItem['email']][scoreItem['image']] = scoreItem;
			    			}
			    			else {
			    				if (scoreTracker[scoreItem['email']][scoreItem['image']]['response_time'] < scoreItem['response_time']) {
			    					scoreTracker[scoreItem['email']][scoreItem['image']] = scoreItem;
			    				}
			    			}
			    		});
			    		filteredRawData = [];
			    		for (var k in scoreTracker) {
			    			for ( var sk in scoreTracker[k]) {
			    				filteredRawData.push(scoreTracker[k][sk]);
			    			}
			    		}
						showReport(filteredRawData);
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

	$scope.reload = function () {
		$cookies.remove('pass');
		$cookies.remove('email');
		$window.location.reload();

	};

	$scope.submit = function() {
		if ($scope.email != '' && $scope.password != '') {
			init();
		}
	};

	$scope.email = $cookies.get('email');
	$scope.password = $cookies.get('pass');
	if ($scope.email !== undefined && $scope.password !== undefined ) {
		$scope.submit();
	} 
});
app.config(['$compileProvider',
    function ($compileProvider) {
        $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|tel|file|blob):/);
}]);
