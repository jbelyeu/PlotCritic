#!/bin/bash

test -e ssshtest || wget -q https://raw.githubusercontent.com/ryanlayer/ssshtest/master/ssshtest
. ssshtest

STOP_ON_FAIL=1
data_path="test/data/"
func_path="test/func/"

imgs_without_json=$data_path"without_json"
imgs_with_json=$data_path"with_json"

printf "\n\nPlotCritic tests"
echo "##########################################################################"

project="basic_test"
run create_site_basic \
    plotcritic \
        -p  $project\
        -i $imgs_without_json \
        -q "What is love?" \
        -A "b":"Baby don't hurt me" "d":"Don't hurt me" "n":"No more"
if [ $create_site_basic ]; then
    assert_exit_code 0
    assert_no_stdout
    assert_equal "$project/index.html" $( ls "$project/index.html" )
    assert_equal "$project/error.html" $( ls "$project/error.html" )

    assert_equal "$project/imgs/test1.jpg" $( ls "$project/imgs/test1.jpg" )
    assert_equal "$project/imgs/test2.png" $( ls "$project/imgs/test2.png" )
    assert_equal "$project/imgs/test3.svg" $( ls "$project/imgs/test3.svg" )
    assert_equal "$project/imgs/test4.pdf" $( ls "$project/imgs/test4.pdf" )

    assert_equal "$project/js/env.js" $( ls "$project/js/env.js" )
    assert_equal "$project/js/plotcritic.js" $( ls "$project/js/plotcritic.js" )
    assert_equal "$project/js/report.js" $( ls "$project/js/report.js" )

    assert_equal "$project/style/plotcritic.css" $( ls "$project/style/plotcritic.css" )
    assert_equal "$project/style/report.css" $( ls "$project/style/report.css" )


    assert_equal "$project/views/plotcritic.html" $( ls "$project/views/plotcritic.html" )
    assert_equal "$project/views/report.html" $( ls "$project/views/report.html" )
fi
rm -r $project

project="basic_with_json_test"
run create_site_basic \
    plotcritic \
        -p  $project\
        -i $imgs_with_json \
        -q "What is love?" \
        -A "b":"Baby don't hurt me" "n":"No more"
if [ $create_site_basic ]; then
    assert_exit_code 0
    assert_no_stdout
    assert_equal "$project/index.html" $( ls "$project/index.html" )
    assert_equal "$project/error.html" $( ls "$project/error.html" )

    assert_equal "$project/imgs/test1.jpg" $( ls "$project/imgs/test1.jpg" )
    assert_equal "$project/imgs/test2.png" $( ls "$project/imgs/test2.png" )
    assert_equal "$project/imgs/test3.svg" $( ls "$project/imgs/test3.svg" )
    assert_equal "$project/imgs/test4.pdf" $( ls "$project/imgs/test4.pdf" )

    assert_equal "$project/js/env.js" $( ls "$project/js/env.js" )
    assert_equal "$project/js/plotcritic.js" $( ls "$project/js/plotcritic.js" )
    assert_equal "$project/js/report.js" $( ls "$project/js/report.js" )

    assert_equal "$project/style/plotcritic.css" $( ls "$project/style/plotcritic.css" )
    assert_equal "$project/style/report.css" $( ls "$project/style/report.css" )


    assert_equal "$project/views/plotcritic.html" $( ls "$project/views/plotcritic.html" )
    assert_equal "$project/views/report.html" $( ls "$project/views/report.html" )
fi
rm -r $project


