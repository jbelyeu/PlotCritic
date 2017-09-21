// Import variables if present (from env.js)
var env = {};
if(window){  
  Object.assign(env, window.__env);
}

var app = angular.module("svApp", []);


app.constant('__env', env);

app.controller("svCtrl", function($scope, $rootScope, $timeout, $http, $window) {

	$scope.records = [];
	$scope.header = ["Project", "Chrom", "Start", "End", "Good", "Bad", "Denovo", "Total_Scores"];
	$scope.email = '';
	$scope.hide = false;
	$scope.orderByField = 'Project';
 	$scope.reverseSort = false;
 	$scope.project = __env.config.projectName;

	var init = function (see_again) {
		AWS.config.update({
			accessKeyId: __env.config.accessKey, 
			secretAccessKey: __env.config.secretAccessKey,
			endpoint: "https://dynamodb." + __env.config.dynamoRegion + ".amazonaws.com",
			region: __env.config.dynamoRegion
		});

		var docClient = new AWS.DynamoDB.DocumentClient();
		var params = {
			TableName: __env.config.dynamoScoresTable,
			ProjectionExpression: "#buck, #proj, email, score, chrom, #st, #en, image",
		    FilterExpression: "#proj = :curr_proj",
		    ExpressionAttributeNames: {
		        "#proj": "project",
		        "#buck": "bucket",
		        "#st" : "start",
		        "#en" : "end"
		    },
		    ExpressionAttributeValues: {
		        ":curr_proj" : __env.config.projectName
		    }
		};

		docClient.scan(params, function(err, data) {
		    if (err) {
		        console.error("Unable to retrieve item. Error JSON:", JSON.stringify(err, null, 2));
		    }
		    else {
		    	summary_data = {};
		    	data.Items.forEach(function (score_item) {
		    		var img_url = score_item['image'];
		    		var chrom = score_item['chrom'].replace("chr", "");
                                if (! (isNaN(parseInt(chrom)))) {
                                    chrom = parseInt(chrom);
                                }

		    		if (! (img_url in summary_data)) {
		    			summary_data[img_url] = {
			    			'Project' 		: score_item['project'],
			    			'Chrom' 		: chrom,
			    			'Start' 		: parseInt(score_item['start']),
			    			'End'			: parseInt(score_item['end']),
			    			'Good' 			: 0,
			    			'Bad' 			: 0,
			    			'Denovo' 		: 0,
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
		    			summary_data[img_url]['Denovo'] += 1;
		    		}
		    	});
		    	$scope.records = Object.values(summary_data);
		    	$scope.$apply() 
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
