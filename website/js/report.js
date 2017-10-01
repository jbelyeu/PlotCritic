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
	$scope.header = ["Project", "Chrom", "Start", "End", "Good", "Bad", "De_novo", "Total_Scores"];
	$scope.hide = false;
	$scope.orderByField = 'Project';
 	$scope.reverseSort = false;
 	$scope.project = __env.config.projectName;
 	$scope.reportFields = __env.config.reportFields;
 	$scope.curationAnswers = [];
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
	    			'Total_Scores' 	: 0
	    		};
	    		for (var idx in $scope.curationAnswers) {
	    			var curationAnswer = $scope.curationAnswers[idx];
	    			summary_data[img_url][curationAnswer[0]] = 0;
	    		}

    		}
    		for (var idx in $scope.curationAnswers) {
	    		var curationAnswer = $scope.curationAnswers[idx];
    			if (score_item['score'] === curationAnswer[1]) {
    				summary_data[img_url][curationAnswer[0]] += 1.0;
    			}
    		}
    		summary_data[img_url]['Total_Scores'] += 1.0;
    	});

    	for (var img in summary_data) {
    		for (var idx in $scope.curationAnswers) {
	    		var curationAnswer = $scope.curationAnswers[idx];
    			summary_data[img][curationAnswer[0]] = (summary_data[img][curationAnswer[0]] / summary_data[img]['Total_Scores']);
    		}
    	}
    	$scope.records = Object.values(summary_data);
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
