const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// 1. node-libs-react-native se basic files le lo
const extraNodeModules = require('node-libs-react-native');

// 2. Jo files phone mein nahi hotin, unko dummy.js pakra do taake bundler crash na ho
extraNodeModules.net = path.resolve(__dirname, 'dummy.js');
extraNodeModules.tls = path.resolve(__dirname, 'dummy.js');
extraNodeModules.fs = path.resolve(__dirname, 'dummy.js');
extraNodeModules.child_process = path.resolve(__dirname, 'dummy.js');

config.resolver.extraNodeModules = extraNodeModules;

module.exports = config;