/*
 * changes by @abagames
 *  - 'evolve' function is divided into multiple functions
 *    to be able to evolve in a requestAnimationFrame loop
 *  - enable to set the specific random function
 *  - not to use web workers
 * 
 *  original version:
 *  https://github.com/subprotocol/genetic-js/blob/f294b76b5b36a35ce2292222103e61280b8ea0d8/js/genetic-0.1.14.js
 */
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

window.Genetic = require('./genetic');

},{"./genetic":2}],2:[function(require,module,exports){

var Genetic = Genetic || (function(){
	
	'use strict';
	
	var randomFunc = Math.random;
	var random = function() {
		return randomFunc();
	};
	
	var Clone = function(obj) {
		if (obj == null || typeof obj != "object")
			return obj;
		
		return JSON.parse(JSON.stringify(obj));
	};
	
	var Optimize = {
		"Maximize": function (a, b) { return a >= b; }
		, "Minimize": function (a, b) { return a < b; }
	};
	
	var Select1 = {
		"Tournament2": function(pop) {
			var n = pop.length;
			var a = pop[Math.floor(random()*n)];
			var b = pop[Math.floor(random()*n)];
			return this.optimize(a.fitness, b.fitness) ? a.entity : b.entity;
		}, "Tournament3": function(pop) {
			var n = pop.length;
			var a = pop[Math.floor(random()*n)];
			var b = pop[Math.floor(random()*n)];
			var c = pop[Math.floor(random()*n)];
			var best = this.optimize(a.fitness, b.fitness) ? a : b;
			best = this.optimize(best.fitness, c.fitness) ? best : c;
			return best.entity;
		}, "Fittest": function (pop) {
			return pop[0].entity;
		}, "Random": function (pop) {
			return pop[Math.floor(random()*pop.length)].entity;
		}, "RandomLinearRank": function (pop) {
			this.internalGenState["rlr"] = this.internalGenState["rlr"]||0;
			return pop[Math.floor(random()*Math.min(pop.length,(this.internalGenState["rlr"]++)))].entity;
		}, "Sequential": function (pop) {
			this.internalGenState["seq"] = this.internalGenState["seq"]||0;
			return pop[(this.internalGenState["seq"]++)%pop.length].entity;
		}
	};
	
	var Select2 = {
		"Tournament2": function(pop) {
			return [Select1.Tournament2.call(this, pop), Select1.Tournament2.call(this, pop)];
		}, "Tournament3": function(pop) {
			return [Select1.Tournament3.call(this, pop), Select1.Tournament3.call(this, pop)];
		}, "Random": function (pop) {
			return [Select1.Random.call(this, pop), Select1.Random.call(this, pop)];
		}, "RandomLinearRank": function (pop) {
			return [Select1.RandomLinearRank.call(this, pop), Select1.RandomLinearRank.call(this, pop)];
		}, "Sequential": function (pop) {
			return [Select1.Sequential.call(this, pop), Select1.Sequential.call(this, pop)];
		}, "FittestRandom": function (pop) {
			return [Select1.Fittest.call(this, pop), Select1.Random.call(this, pop)];
		}
	};
	
	function Genetic() {
		
		// population
		this.fitness = null;
		this.seed = null;
		this.mutate = null;
		this.crossover = null;
		this.select1 = null;
		this.select2 = null;
		this.optimize = null;
		this.generation = null;
		this.notification = null;
		
		this.configuration = {
			"size": 250
			, "crossover": 0.9
			, "mutation": 0.2
			, "fittestAlwaysSurvives": true
			, "maxResults": 100
		};
		
		this.userData = {};
		this.internalGenState = {};
		
		this.entities = [];
		
		this.usingWebWorker = false;
		
		this.setConfig = function(config) {
			var k;
			for (k in config) {
				this.configuration[k] = config[k];
			}
		}
		
		this.seedPopulation = function() {
			var pops = [];
			for (var i=0;i<this.configuration.size;++i)  {
				var seed = Clone(this.seed());
				this.entities.push(seed);
				pops.push({entity: seed});
			}
			this.sendNotification
			(pops.slice(0, this.configuration.maxResults), 0, null, false);
		}
		
		this.initGeneration = function() {
			this.fitnessEntities = [];
		}
		
		this.getNextEntity = function() {
			var i = this.fitnessEntities.length;
			if (i >= this.entities.length) {
				return null;
			}
			return this.entities[i];
		}
		
		this.getEvaluatedPercent = function() {
			return this.fitnessEntities.length / this.entities.length;
		}
		
		this.setFitness = function(fitness, entity) {
			var fe = {"fitness": fitness, "entity": entity };
			this.fitnessEntities.push(fe);
		}
		
		this.createNextGeneration = function() {
			var self = this;

			function mutateOrNot(entity) {
				// applies mutation based on mutation probability
				return random() <= self.configuration.mutation && self.mutate ? self.mutate(Clone(entity)) : entity;
			}
			// score and sort
			var pop = this.fitnessEntities
				.sort(function (a, b) {
					return self.optimize(a.fitness, b.fitness) ? -1 : 1;
				});
			
			// generation notification
			var mean = pop.reduce(function (a, b) { return a + b.fitness; }, 0)/pop.length;
			var stdev = Math.sqrt(pop
				.map(function (a) { return (a.fitness - mean) * (a.fitness - mean); })
				.reduce(function (a, b) { return a+b; }, 0)/pop.length);
				
			var stats = {
				"maximum": pop[0].fitness
				, "minimum": pop[pop.length-1].fitness
				, "mean": mean
				, "stdev": stdev
			};

			this.sendNotification
			(pop.slice(0, this.configuration.maxResults), 0, stats, false);
				
			// crossover and mutate
			var newPop = [];
				
			if (this.configuration.fittestAlwaysSurvives) // lets the best solution fall through
				newPop.push(pop[0].entity);
				
			while (newPop.length < self.configuration.size) {
				if (
					this.crossover // if there is a crossover function
					&& random() <= this.configuration.crossover // base crossover on specified probability
					&& newPop.length+1 < self.configuration.size // keeps us from going 1 over the max population size
				) {
					var parents = this.select2(pop);
					var children = this.crossover(Clone(parents[0]), Clone(parents[1])).map(mutateOrNot);
					newPop.push(children[0], children[1]);
				} else {
					newPop.push(mutateOrNot(self.select1(pop)));
				}
			}
				
			this.entities = newPop;
		}
		
		this.sendNotification = function(pop, generation, stats, isFinished) {
			this.notification(pop, generation, stats, isFinished);
		};
	}
	
	Genetic.prototype.setRandomFunc = function(func) {
		randomFunc = func;
	}
	
	return {
		"create": function(config) {
			var genetic = new Genetic();
			genetic.setConfig(config);
			return genetic;
		}, "Select1": Select1
		, "Select2": Select2
		, "Optimize": Optimize
		, "Clone": Clone
	};
	
})();


// so we don't have to build to run in the browser
if (typeof module != "undefined") {
	module.exports = Genetic;
}

},{}]},{},[1]);
