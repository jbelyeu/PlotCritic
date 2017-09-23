// Import variables if present (from env.js)
var env = {};
if(window){  
  Object.assign(env, window.__env);
}

var app = angular.module("svApp", []);


app.constant('__env', env);

app.controller("svCtrl", function($scope, $rootScope, $timeout, $http, $window) {

	$scope.email = 'jrbelyeu@gmail.com';
	$scope.password = 'Password1!';
	$scope.authenticated = false;
	$scope.records = [];
	$scope.header = ["Project", "Chrom", "Start", "End", "Good", "Bad", "De_novo", "Total_Scores"];
	$scope.hide = false;
	$scope.orderByField = 'Project';
 	$scope.reverseSort = false;
 	$scope.project = __env.config.projectName;
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

	var showReport = function(rawData) {
    	summary_data = {};
    	rawData.forEach(function (score_item) {
    		var img_url = score_item['image'];
    		score_item['chrom'] = score_item['chrom'].replace("chr", "");
    		if (! isNaN(parseInt(score_item['chrom'])) ) {
    			score_item['chrom'] = parseInt(score_item['chrom']);
    		}
    		if (! (img_url in summary_data)) {
    			summary_data[img_url] = {
	    			'Project' 		: score_item['project'],
	    			'Chrom' 		: score_item['chrom'],
	    			'Start' 		: parseInt(score_item['start']),
	    			'End'			: parseInt(score_item['end']),
	    			'Good' 			: 0,
	    			'Bad' 			: 0,
	    			'De_novo' 		: 0,
	    			'Total_Scores' 	: 0
	    		};
    		}
    		summary_data[img_url]['Total_Scores'] += 1;
    		if (score_item['score'] === true) {
    			summary_data[img_url]['Good'] += 1;
    		}
    		else if (score_item['score'] === false) {
    			summary_data[img_url]['Bad'] += 1;
    		}
    		else {
    			summary_data[img_url]['De_novo'] += 1;
    		}
    	});
    	for (var img in summary_data) { 
    		var good_count = summary_data[img]['Good'] *1.0;
    		var bad_count = summary_data[img]['Bad'] *1.0;
    		var denovo_count = summary_data[img]['De_novo'] *1.0;
    		var total_count = summary_data[img]['Total_Scores'] *1.0;

    		summary_data[img]['Good'] = ((good_count/total_count)*100.0);
    		summary_data[img]['Bad'] = ((bad_count/total_count)*100.0);
    		summary_data[img]['De_novo'] = ((denovo_count/total_count)*100.0);
    	}
    	$scope.records = Object.values(summary_data);
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

	var init = function() {
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
	        	$scope.authenticated = true;
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
	        	loadReport();
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
					        	$scope.authenticated = true;
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
					        	alert("Welcome to PlotCritic! Please begin by changing your password (on account page)");
					        	loadReport();
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

	$scope.reload = function () {
		$window.location.reload();
	};

	$scope.submit = function() {
		if ($scope.email != '') {
			init(false);
			$scope.hide = true;
		}
	};
});
