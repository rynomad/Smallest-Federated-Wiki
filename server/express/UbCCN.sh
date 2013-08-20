#!/bin/bash
# script to set up ccnx for build on a fresh Ubuntu 12.04 Precise install
#
sudo apt-get install -y wget
wget http://www.ccnx.org/releases/ccnx-0.8.0rc1.tar.gz
sudo apt-get update
sudo apt-get -y upgrade
sudo apt-get install -y build-essential python-software-properties
sudo apt-get install -y libssl-dev
sudo apt-get install -y libexpat1-dev
sudo apt-get install -y libpcap-dev
sudo apt-get install -y libxml2-utils
tar xzvf ccnx-0.8.0rc1.tar.gz
cd ccnx-0.8.0rc1
./configure
# make
# sudo make install
