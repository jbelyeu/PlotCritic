// Import variables if present (from env.js)
var env = {};
if(window){
  Object.assign(env, window.__env);
}

var app = angular.module("svApp", ['ngCookies']);
app.constant('__env', env);
app.controller("svCtrl", function($scope, $rootScope, $timeout, $http, $window, $cookies) {
	//the project name, curation question, and report fields are defined in the env file.
	//Images and scores come from report files

	//a list of fields that correspond to the columns in the web report
	$scope.records = [];
	var summaryFields = Object.values(__env.config.summaryFields);
	$scope.hide = false;
	$scope.orderByIdx = 0;
 	$scope.project = __env.config.projectName;
 	$scope.curationAnswers = Object.values(__env.config.curationQandA.answers);
	$scope.curationAnswerIdxs = Object.keys(__env.config.curationQandA.answers);
 	$scope.header = Object.values(__env.config.summaryFields);
	$scope.rawData = {}; //holds a specific user's scoring responses as lists
	$scope.noReports = true;


 	for (key in $scope.curationAnswers) {
		$scope.header.push($scope.curationAnswers[key] + " (%)");
	}
	$scope.header.push("Total Scores");

  $scope.storeContent = function(){
		//wipe scope variables
		$scope.records = [];
		$scope.rawData = {};

		/////////////////////////////
    var files = event.target.files;
    for (var i = 0; i < files.length; i++) {
       var file = files[i];
       var reader = new FileReader();
       reader.onload = $scope.uploadReport;
       reader.readAsText(file);
   }
  };

	//loads a single report file into scope
  $scope.uploadReport = function(event){
    var imageData = JSON.parse(event.target.result);
		var user = '';

		scoreTracker = {};
		imageData.forEach(function (scoreItem) {
			if (!scoreItem['project'] == $scope.project){
				console.error("invalid report from project " + scoreItem['project']+ ". Please upload only reports from this project: " + $scope.project);
				return;
			}
			else if ("user" in scoreItem) { //if the user isn't set, this item wasn't scored
				user = scoreItem['user'];
				if (!(user in scoreTracker)) {
					scoreTracker[user] = {};
				}
				if (! (scoreItem['Image'] in scoreTracker[user])) {
					scoreTracker[user][scoreItem['Image']] = scoreItem;
				}
				else {
					if (scoreTracker[user][scoreItem['Image']]['response_time'] < scoreItem['response_time']) {
						scoreTracker[user][scoreItem['Image']] = scoreItem;
					}
				}
			}
		});

		//even if user is already set, start fresh
		$scope.rawData[user] = [];


		for (var k in scoreTracker) {
			for ( var sk in scoreTracker[k]) {
				$scope.rawData[user].push(scoreTracker[k][sk]);
			}
		}
		showReport();
  };

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

	var showReport = function() {
		var entryRows = [];

		  //should hold the image url, the summary fields, the number of scores for each answer
    	summaryData = {};

			// $scope.rawData.forEach(function (user) {
			for (var user in $scope.rawData) {
				$scope.rawData[user].forEach(function (score_item) {

					var img_name = score_item['Image'];
					if (! (img_name in summaryData)) {
	    			summaryData[img_name] = [];
		    		for (var i = 0; i < summaryFields.length; ++i ) {

							var item = score_item[summaryFields[i]];
							if (Array.isArray(item)) {
								item = item.join("-");
							}

		    			summaryData[img_name].push(item);
		    		}
		    		for (var i = 0; i <= $scope.curationAnswers.length; ++i) {
		    			summaryData[img_name].push(0);
		    		}
	    		}

					for (var idx in $scope.curationAnswerIdxs) {
	    			if (score_item['score'] === $scope.curationAnswerIdxs[idx]) {
	    				summaryData[img_name][summaryFields.length + parseInt(idx)] += 1.0;
	    			}
	    		}
	    		summaryData[img_name][summaryData[img_name].length-1] += 1.0;
					//store scores for downloadable report
					if (("score" in score_item)) {
		    		fields_to_show = [score_item['user'],
		    							score_item['Image'],
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
					}
				});
			}


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
			$scope.noReports = false;
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
  	header_fields = ["USER","IMAGE", "SCORE", "LOADTIME", "RESPONSETIME", "PROJECT"];
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
});
app.config(['$compileProvider',
    function ($compileProvider) {
        $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|tel|file|blob):/);
}]);
