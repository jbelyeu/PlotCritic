// Import variables if present (from env.js)
var env = {};
if (window){  
  Object.assign(env, window.__env);
}

var app = angular.module("svApp", ['ngCookies']);
app.constant('__env', env);

app.controller("svCtrl", function($scope, $rootScope, $timeout, $http, $window, $cookies) {

	$scope.email = '';
	$scope.password = '';
	$scope.project = __env.config.projectName;
	$scope.authenticated = false;
	$scope.changingPassword = false;
	$scope.deletingAccount = false;
	$scope.newUserEmails = [''];
	$scope.newUsers = [];
	$scope.confirming = false;
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
	var defaultPassword = "Password1@";

	var authenticatedLogin = function (callback) {
		var authenticationData = {
	        Username : $scope.email, 
	        Password :  $scope.password
	    };
	    var userData = {
		    Username : $scope.email,
		    Pool : userPool
		};

	    var authenticationDetails = new AWSCognito.CognitoIdentityServiceProvider.AuthenticationDetails(authenticationData);
	    cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);
		cognitoUser.authenticateUser(authenticationDetails, {
	        onSuccess: function (result) {
	        	authenticationResult = result;
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
			authenticatedLogin(function(){
				$scope.authenticated = true;
				$cookies.put('pass',$scope.password);
        		$cookies.put('email',$scope.email);
	        	$scope.$apply();
			});
		}
	};

	$scope.addNewField = function () {
		$scope.newUserEmails.push('');
	};

	$scope.addUsers = function () {
		$scope.newUsers = [];
		$scope.newUserEmails.forEach( function (newUserEmail){
			if (newUserEmail) {				
				var attributeList = []; 
				var dataEmail = {
				    Name : 'email',
				    Value : newUserEmail
				};
				var attributeEmail = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute(dataEmail);
				attributeList.push(attributeEmail);
				userPool.signUp(newUserEmail, defaultPassword, attributeList, null, function(err, newUserresult){
				    if (err) {
				        $scope.newUsers.push('Failed to add new user: `' + newUserEmail +'` with error: "' + Object.values(err)[0] +'"');
				    }
				    else {
					    $scope.newUsers.push('Successfully added new user: `' + newUserEmail +'`');
				    }
				    $scope.$apply();				    
				});
			} 
		});
	}

	$scope.deleteAccount = function () {
		if ($scope.deleteAccountPassword === $scope.password) {
			cognitoUser.deleteUser(function(err, result) {
		        if (err) {
		            console.log(err);
		            alert("Failed to delete user: `" + $scope.email + "`. Please reload page and try again.");
		        }
		        else {
		        	alert("Deleted user: `" + $scope.email + "`") ? "" : $window.location.reload();
		        }		        
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
	        		}
	        	});
	        }
	        else {
		       	$scope.changingPassword = false;
		        $scope.password = $scope.newPassword1;
				alert ("Password updated");
				$scope.authenticated = true;
				$scope.$apply();				    
	        }
	    });
	};	

	$scope.reload = function () {
		$cookies.remove('pass');
		$cookies.remove('user');
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
