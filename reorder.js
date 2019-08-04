#!/usr/bin/env node

const ReOrderer = require('./import-reorder');

const config = require(`${process.cwd()}/reorder.config`);

const reOrderer = new ReOrderer(config, process.cwd());

process.stdin.on('data', reOrderer.handleChangelist);
