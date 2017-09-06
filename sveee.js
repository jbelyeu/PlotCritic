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

app.controller("svCtrl", function($scope, $rootScope, $timeout, $http) {
	$scope.images = [];
	$scope.currentImageIdx = 0;
	$scope.currentImage = '';
	$scope.goodButton = ["good_button"];
	$scope.badButton = ["bad_button"];
	$scope.unclearButton = ["unclear_button"];
	$scope.variantImgSelected = '';	
	$scope.reachedEnd = false;
	$scope.reachedStart = false;
	$scope.email = '';
	$scope.hide = false;

    $rootScope.$on('keypress', function (evt, obj, key) {
        $scope.$apply(function () {
        	if ($scope.currentImage != "") {
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
		    TableName:__env.config.dynamoTable,
		    Item:{
		    	'identifier': $scope.email + "_" + now,
		        "email": $scope.email,
		        'image': $scope.currentImage,
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
		var config = new AWS.Config({
                    accessKeyId: __env.config.accessKey, 
                    secretAccessKey: __env.config.secretAccessKey, 
                    region: __env.config.region
                });

		var bucket = new AWS.S3(config);
		bucket.listObjects({Bucket: __env.config.AWSBucketName}, function (err, data) {
		    if (err) {
		      console.log(err);
		    } else {
		    	for (var i = 0; i < data.Contents.length; i++) {
		    		var resourceName = data.Contents[i]['Key'];
		    		if (resourceName[resourceName.length-1] === '/') {
		    			continue
		    		}
		    		fileExtList = resourceName.split('.');
		    		fileExt = fileExtList[fileExtList.length-1];

		    		if (__env.config.projectName === resourceName.substring(0, __env.config.projectName.length) &&
		    			 __env.config.allowedImageTypes.indexOf(fileExt) > -1) {
		    			resourceName = __env.config.AWSBucketURl + resourceName;
		    			$scope.images.push(resourceName);
		    		}
		    	}
			    shuffleArray($scope.images);
		    }
		    //TODO should check whether there are any images and error smoothly if not.
    		$scope.currentImage = $scope.images[$scope.currentImageIdx];
		});
	};

	var shuffleArray = function (arr) {
		for (let i = $scope.images.length; i; i--) {
	        let j = Math.floor(Math.random() * i);
	        [$scope.images[i - 1], $scope.images[j]] = [$scope.images[j], $scope.images[i - 1]];
	    }
	}

	var resetCurrent = function (change) {
		$scope.currentImageIdx += change;
		$scope.currentImage = $scope.images[$scope.currentImageIdx];
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
		if ($scope.email != '' && $scope.currentImage != '') {
			$scope.hide = true;
	    }
	};
	init();
});
