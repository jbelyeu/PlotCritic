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

app.directive("setImgScripts", function() {
 
    var updateScripts = function (element) {
        return function (scripts) {
            element.empty();
            angular.forEach(scripts, function (script) {
            	var scriptTag = angular.element(document.createElement("script"));
                scriptTag[0]['src'] = script['src'];
                scriptTag[0]['id'] = script['id'];
                scriptTag[0]['data-bokeh-model-id'] = script['data-bokeh-model-id'];
                scriptTag[0]['data-bokeh-doc-id'] = script['data-bokeh-doc-id'];

                element.append(scriptTag);
            });
        };
    };
 
    return {
        restrict: "EA",
        scope: {
          scripts: "=" 
        },
        link: function(scope,element) {
            scope.$watch("scripts", updateScripts(element));
        }
    };
});

app.controller("svCtrl", function($scope, $rootScope, $timeout, $http) {

	$scope.scripts = [];
	$scope.images = [];
	$scope.currentImageIdx = 0;
	$scope.goodButton = ["good_button"];
	$scope.badButton = ["bad_button"];
	$scope.unclearButton = ["unclear_button"];
	$scope.variantImgSelected = '';	
	$scope.reachedEnd = false;
	$scope.reachedStart = false;
	$scope.email = '';
	$scope.hide = false;
	$scope.html_url = "";


    $rootScope.$on('keypress', function (evt, obj, key) {
        $scope.$apply(function () {
        	if ($scope.scripts.length > 0) {
        		if (key == 'g' || key == 'G') {
	            	$scope.goodVariant();
	            }
	            else if (key == 'b' || key == 'B') {
	            	$scope.badVariant();
	            }
	            else if (key == 'u' || key == 'U') {
	            	$scope.unclearVariant();
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
		var params = {
		    TableName:__env.config.dynamoScoresTable,
		    Item:{
		    	'identifier': $scope.email + "_" + now,
		        "email": $scope.email,
		        'image': $scope.images[$scope.currentImageIdx]['inc_info']['src'],
		        'bucket': __env.config.AWSBucketURl,
		        'timestamp': now,
		        'project' : __env.config.projectName,
		        'score': flag
		    }
		};
		docClient.put(params, function(err, data) {
		    if (err) {
		        console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
		    }
		});
	};

	var init = function () {

		AWS.config.update({
			accessKeyId: __env.config.accessKey, 
			secretAccessKey: __env.config.secretAccessKey,
			endpoint: "https://dynamodb." + __env.config.dynamoRegion + ".amazonaws.com",
			region: __env.config.dynamoRegion
		});

		var docClient = new AWS.DynamoDB.DocumentClient();

		var params = {
  			TableName: __env.config.dynamoImagesTable
		};
		docClient.scan(params, function(err, data) {
		    if (err) {
		        console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
		    }
		    else {
		    	$scope.images = shuffleArray(data['Items']);
		    	resetCurrent(0);
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
		$scope.currentImageIdx += change;
		console.log($scope.images);
		$scope.scripts = [$scope.images[$scope.currentImageIdx]['inc_info']];

	};

	//scope functions
	$scope.goodVariant = function () {
		$scope.goodButton.push("good_button_dark");
		$scope.variantImgSelected = "variantImgGood";
		sendScore(true);
		$timeout(function() { 
			$scope.goodButton.pop();
			$scope.variantImgSelected = "";
		}, 50);
		$scope.next();
	};

	$scope.unclearVariant = function () {
		$scope.unclearButton.push("unclear_button_dark");
		$scope.variantImgSelected = "variantImgUnclear";
		sendScore('unclear');
		$timeout(function() { 
			$scope.unclearButton.pop();
			$scope.variantImgSelected = "";
		}, 50);
		$scope.next();
	};

	$scope.badVariant = function () {
		$scope.badButton.push("bad_button_dark");
		$scope.variantImgSelected = "variantImgBad";
		sendScore(false);
		$timeout(function() { 
			$scope.badButton.pop();
			$scope.variantImgSelected = "";
		}, 50);
		$scope.next();
	};

	$scope.previous = function () {
		$scope.reachedEnd = false;
		$scope.reachedStart = false;

		if ($scope.currentImageIdx -1 > 0) {
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

	$scope.submit = function() {
		if ($scope.email != '' && $scope.scripts.length > 0) {
			$scope.hide = true;
	    }
	};
	init();
});
