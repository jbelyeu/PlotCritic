var app = angular.module("svApp", []);

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

app.controller("svCtrl", function($scope, $rootScope, $timeout) {
	$scope.images = [];
	$scope.currentImageIdx = 0;
	$scope.imgsURL = "http://sveee.s3-website-us-east-1.amazonaws.com/";
	$scope.currentImage = '';
	$scope.goodButton = ["good_button"];
	$scope.badButton = ["bad_button"];
	$scope.unclearButton = ["unclear_button"];
	$scope.variantImgSelected = '';	
	$scope.reachedEnd = false;
	$scope.reachedStart = false;
	$scope.email = '';
	$scope.hide = false;
	var accessKey = 'AKIAI63BOTTCFQX556OQ';
	var secretAccessKey = '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';
	var dynamoEndpoint = 'https://dynamodb.us-east-1.amazonaws.com';
	var region = 'us-east-1';
	var dynamoTable = 'sveee';
	var bucketName = 'sveee';
	var imgTypes = ['.png', ".jpg", ".jpeg"];

    $rootScope.$on('keypress', function (evt, obj, key) {
        $scope.$apply(function () {
        	if ($scope.currentImage != "") {
        		if (key == 'g' || key == 'G') {
	            	$scope.goodVariant();
	            }
	            else if (key == 'b' || key == 'B') {
	            	$scope.badVariant();
	            }
        	}            
        });
    })

	var sendScore = function(flag) {
		AWS.config.update({
			accessKeyId: accessKey, 
			secretAccessKey: secretAccessKey,
			endpoint: dynamoEndpoint,
			region: region
		});

		var docClient = new AWS.DynamoDB.DocumentClient();
		var now = new Date();
		var params = {
		    TableName:dynamoTable,
		    Item:{
		    	'identifier': $scope.email + "_" + $scope.currentImage,
		        "email": $scope.email,
		        'image': $scope.currentImage,
		        'bucket': $scope.imgsURL,
		        'timestamp': now.toString(),
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
		var config = new AWS.Config({accessKeyId: accessKey, secretAccessKey: secretAccessKey, region: region});

		var bucket = new AWS.S3(config);
		bucket.listObjects({Bucket: bucketName}, function (err, data) {
		    if (err) {
		      console.log(err);
		    } else {
		    	for (var i = 0; i < data.Contents.length; i++) {
		    		var resourceName = data.Contents[i]['Key'];
		    		if (resourceName.substring(resourceName.length-4) == imgTypes[0] || 
		    			resourceName.substring(resourceName.length-4) == imgTypes[1] || 
		    			resourceName.substring(resourceName.length-5) == imgTypes[2]) {
		    			resourceName = $scope.imgsURL + resourceName;

		    			$scope.images.push(resourceName);
		    		}
		    	}
			    shuffleArray($scope.images);
		    }
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
			resetCurrent(1);
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
		resetCurrent($scope.images.length-$scope.currentImageIdx);
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