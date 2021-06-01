var env = {};
if (window){
    Object.assign(env, window.__env);
}

var app = angular.module("svApp", ['ngCookies']);
app.constant('__env', env);
app.directive('keydownEvents',
    function ($document, $rootScope) {
        return {
            restrict: 'A',
            link: function () {
                $document.bind('keydown', function (e) {
                    $rootScope.$broadcast('keydown', e, String.fromCharCode(e.which));
                });
            }
        }
  });

app.controller("svCtrl", function($scope, $rootScope, $timeout, $http, $window, $cookies) {
	$scope.user = '';
	$scope.image_data = __env.config.image_data;
	$scope.currentImageIdx = 0;
  $scope.currentImage = "";
	$scope.reachedEnd = false;
	$scope.reachedStart = false;
	$scope.load_time;
	$scope.project = __env.config.projectName;
	$scope.signedIn = false;
	$scope.curationQuestion = __env.config.curationQandA.question;
	$scope.curationAnswers = [];
	$scope.additionalCurationItems = __env.config.additionalCuration;
	$scope.additionalCurationResponses = {};
  $scope.config = __env.config;

	for (key in __env.config.curationQandA.answers) {
		$scope.curationAnswers.push([key, __env.config.curationQandA.answers[key]]);
	}
	var reportFields = Object.values(__env.config.reportFields);

  $rootScope.$on('keydown', function (evt, obj, key) {
    if (obj['key'] == "ArrowRight") {
      $scope.next();
    }
    else if (obj['key'] == "ArrowLeft") {
      $scope.previous();
    }
    else if ($scope.image_data.length > 0) {
    		var option = '';
    		for (idx in $scope.curationAnswers) {
    			if ($scope.curationAnswers[idx][0] == obj['key']) {
    				$scope.saveScore(obj['key']);
    			}
    		}
    	}
    $scope.$apply();
  });

	var init = function() {
		// Sign user in and store token
  	$scope.signedIn = true;
  	$cookies.put('user',$scope.user);

    //shuffle images and display first one
    $scope.image_data = shuffleArray($scope.image_data);
		$scope.currentImageIdx = 0;
    $scope.currentImage = $scope.image_data[$scope.currentImageIdx]["img_location"];
    $scope.load_time = Date.now();
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
		if ($scope.image_data.length > 0) {
			$scope.currentImageIdx += change;
			$timeout(function() {
				$scope.load_time = Date.now();
			}, 100);
		}
	};

  $scope.saveScore = function(option){
  	var now = Date.now();
  	$scope.image_data[$scope.currentImageIdx]['score'] = option;
    $scope.image_data[$scope.currentImageIdx]['response_time'] = now;
    $scope.image_data[$scope.currentImageIdx]['load_time'] = $scope.load_time;
		$scope.image_data[$scope.currentImageIdx]['user'] = $scope.user;
		$scope.image_data[$scope.currentImageIdx]['project'] = $scope.project;
    var rawBlob = new Blob([JSON.stringify($scope.image_data)], {
      type: 'application/json',
      name: "report"
    });
    $scope.rawReport = (window.URL || window.webkitURL).createObjectURL( rawBlob);
    $scope.next();
  };

	$scope.previous = function () {
		$scope.reachedEnd = false;
		$scope.reachedStart = false;

		if ($scope.currentImageIdx -1 >= 0) {
			resetCurrent(-1);
		}
		else {
			$scope.reachedStart = true;
		}
	};

	$scope.next = function () {
		$scope.reachedEnd = false;
		$scope.reachedStart = false;

		if ($scope.image_data.length > $scope.currentImageIdx+1) {
			resetCurrent(1);
		}
		else {
			$scope.reachedEnd = true;
		}
	};

	$scope.beginning = function () {
		resetCurrent(-$scope.currentImageIdx);
		$scope.reachedStart = true;

		if ($scope.currentImageIdx +1 !== $scope.image_data.length) {
			$scope.reachedEnd = false;
		}
	};
	$scope.ending = function () {
			resetCurrent(($scope.image_data.length-1)-$scope.currentImageIdx);
			$scope.reachedEnd = true;

			if ($scope.currentImageIdx !== 0) {
				$scope.reachedStart = false;
			}
	};

	$scope.submit = function() {
		if ($scope.user != '') {
			init();
		}
	};

	$scope.signOut = function() {
			$cookies.remove('user');
			$window.location.reload();
	};

	$scope.user = $cookies.get('user');
	if ($scope.user !== undefined) {
		$scope.submit();
	}
});
app.config(['$compileProvider',
    function ($compileProvider) {
        $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|tel|file|blob):/);
}]);
