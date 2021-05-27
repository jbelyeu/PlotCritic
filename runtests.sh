#!/bin/bash
set -e
echo "running functional tests:"
bash test/func/plotcritic_test.sh
echo "finished functional tests"
