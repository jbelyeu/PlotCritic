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
	$scope.images = ['http://sveee.s3-website-us-east-1.amazonaws.com/na12878_cnmops/10_114112001-114117000.png'];
	$scope.currentImageIdx = 0;
	$scope.imgsURL = "http://sv.s3-website-us-east-1.amazonaws.com/na12878_cnmops/";
	$scope.currentImage = '';
	$scope.goodButton = ["good_button"];
	$scope.badButton = ["bad_button"];
	$scope.viewerSelected = '';	
	$scope.reachedEnd = false;
	$scope.reachedStart = false;

    $rootScope.$on('keypress', function (evt, obj, key) {
        $scope.$apply(function () {
            if (key == 'g' || key == 'G') {
            	$scope.goodVariant();
            }
            else if (key == 'b' || key == 'B') {
            	$scope.badVariant();
            }
        });
    })

	// this function will send to the server and log whether this is a good or bad variant
	var sendScore = function(flag) {
		console.log("unimplemented");
		console.log($scope.currentImage);
		console.log(flag);
	};

	var init = function () {
		var creds = new AWS.Credentials({
		  accessKeyId: 'AKIAJ3LYC2HDTNJIOYWA', secretAccessKey: '1CIrjsfzwU94ODsXMmn0SEc79'
		});
// http://sveee.s3-website-us-east-1.amazonaws.com/na12878_cnmops/files.txt

		var bucket = new AWS.S3(creds);
		var params = {
			Key: "na12878_cnmops/files.txt",
			Bucket: 'sveee'};

		bucket.getObject(params, function(err, data) {
			if (err) {
				console.log(err);
			}
			else {
				console.log(data);	
			}
		});


		// bucket.listObjects(params, function (err, data) {
		//     if (err) {
		//       console.log(err);
		//     } else {
		//       console.log(data);
		//     }
		// });


		$scope.currentImage = $scope.images[$scope.currentImageIdx];
	};

	var resetCurrent = function (change) {
		$scope.currentImageIdx += change;
		$scope.currentImage = $scope.images[$scope.currentImageIdx];
	};

	//scope functions
	$scope.goodVariant = function () {
		$scope.goodButton.push("good_button_dark");
		$scope.viewerSelected = "viewerGood";
		sendScore(true);
		$timeout(function() { 
			$scope.goodButton.pop();
			$scope.viewerSelected = "";
		}, 500);
		$scope.next();
	};

	$scope.badVariant = function () {
		$scope.badButton.push("bad_button_dark");
		$scope.viewerSelected = "viewerBad";
		sendScore(false);
		$timeout(function() { 
			$scope.badButton.pop();
			$scope.viewerSelected = "";
		}, 500);
		$scope.next();
	};

	$scope.previous = function () {
		console.log("previous");
		$scope.reachedEnd = false;
		$scope.reachedStart = false;

		//if there are more images, should call resetCurrent to change current image to next image and update index
		if ($scope.currentImageIdx -1 > 0) {
			resetCurrent(1);
		}
		else {
			$scope.reachedStart = true;
		}
	};

	$scope.next = function () {
		console.log("next");
		$scope.reachedEnd = false;
		$scope.reachedStart = false;

		//if there are more images, should call resetCurrent to change current image to next image and update index
		if ($scope.images.length > $scope.currentImageIdx +1) {
			resetCurrent(1);
		}
		else {
			$scope.reachedEnd = true;
		}
	};

	init();
});

