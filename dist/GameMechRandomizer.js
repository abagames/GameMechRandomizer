/// <reference path="../typings/lodash/lodash.d.ts" />
var GameMechRandomizer = (function () {
    function GameMechRandomizer(params) {
        var _this = this;
        this.params = params;
        this.geneticsIndex = 0;
        this.patternKeys = [];
        this.deltaDeathFitness = 10;
        this.noDeathFitnessPenalty = 1000;
        this.overDeathFitnessPenalty = 1000;
        this.seedNum = 5;
        if (this.params == null) {
            this.random = new GameMechRandomizer.Random();
            return;
        }
        var config = params.config;
        if (config == null) {
            config = {};
        }
        if (params.seedNum != null) {
            this.seedNum = params.seedNum;
        }
        if (params.seedSize != null) {
            config.size = params.seedSize;
        }
        else {
            config.size = 50;
        }
        this.random = new GameMechRandomizer.Random(params.randomSeed);
        this.seed = this.seed.bind(this);
        this.mutate = this.mutate.bind(this);
        this.crossover = this.crossover.bind(this);
        this.notification = this.notification.bind(this);
        if (params.deathDeltaFitness != null) {
            this.deltaDeathFitness = params.deathDeltaFitness;
        }
        if (params.noDeathFitnessPenalty != null) {
            this.noDeathFitnessPenalty = params.noDeathFitnessPenalty;
        }
        if (params.overDeathFitnessPenalty != null) {
            this.overDeathFitnessPenalty = params.overDeathFitnessPenalty;
        }
        _.forOwn(this.params.patterns, function (value, key) {
            _this.patternKeys.push(key);
        });
        this.genetics = _.times(this.seedNum, function () {
            var genetic = Genetic.create(config);
            genetic.optimize = Genetic.Optimize.Maximize;
            genetic.select1 = Genetic.Select1.Tournament2;
            genetic.select2 = Genetic.Select2.Tournament2;
            genetic.seed = _this.seed;
            genetic.mutate = _this.mutate;
            genetic.crossover = _this.crossover;
            genetic.notification = _this.notification;
            genetic.setRandomFunc(_this.random.f);
            return genetic;
        });
    }
    GameMechRandomizer.prototype.addEvaluationType = function (type) {
        this.evaluations.push(new GameMechRandomizer.Evaluation(type));
        return this.evaluations.length - 1;
    };
    GameMechRandomizer.prototype.seedPopulation = function () {
        this.notificationParams = [];
        _.forEach(this.genetics, function (genetic) {
            genetic.seedPopulation();
        });
    };
    GameMechRandomizer.prototype.initGeneration = function () {
        _.forEach(this.genetics, function (genetic) {
            genetic.initGeneration();
        });
        this.geneticsIndex = 0;
        this.notificationParams = [];
    };
    GameMechRandomizer.prototype.getNextEntity = function () {
        var entity = this.genetics[this.geneticsIndex].getNextEntity();
        if (entity != null) {
            return entity;
        }
        this.geneticsIndex++;
        if (this.geneticsIndex >= this.seedNum) {
            return null;
        }
        return this.getNextEntity();
    };
    GameMechRandomizer.prototype.getEvaluatedPercent = function () {
        var p = this.geneticsIndex / this.seedNum;
        p += this.genetics[this.geneticsIndex].getEvaluatedPercent() / this.seedNum;
        return Math.floor(p * 100);
    };
    GameMechRandomizer.prototype.setFitness = function (fitness, entity) {
        this.genetics[this.geneticsIndex].setFitness(fitness, entity);
    };
    GameMechRandomizer.prototype.createNextGeneration = function () {
        _.forEach(this.genetics, function (genetic) {
            genetic.createNextGeneration();
        });
    };
    GameMechRandomizer.prototype.getGenerationResult = function () {
        return this.notificationParams;
    };
    GameMechRandomizer.prototype.startEvaluation = function (entity) {
        this.patterns = entity.patterns;
        this.evaluations = null;
        this.evaluations = [];
    };
    GameMechRandomizer.prototype.endEvaluation = function (entity) {
        var _this = this;
        var smartOperationEvaluations = [];
        var dullOperationEvaluations = [];
        _.forEach(this.evaluations, function (e) {
            if (e.type === GameMechRandomizer.EvaluationType.SmartOperation) {
                smartOperationEvaluations.push(e);
            }
            else {
                dullOperationEvaluations.push(e);
            }
        });
        var fitness = 0;
        _.forEach(smartOperationEvaluations, function (soe) {
            _.forEach(dullOperationEvaluations, function (doe) {
                if (doe.death <= soe.death * 2) {
                    fitness -= _this.overDeathFitnessPenalty;
                }
                else {
                    fitness += (doe.death - soe.death) * _this.deltaDeathFitness;
                }
            });
            fitness += soe.fitness * 2;
            if (soe.death === 0) {
                fitness -= _this.noDeathFitnessPenalty;
            }
        });
        _.forEach(dullOperationEvaluations, function (doe) {
            fitness += doe.fitness;
            if (doe.death === 0) {
                fitness -= _this.noDeathFitnessPenalty * 2;
            }
        });
        entity.smartOperationEvaluations = smartOperationEvaluations;
        entity.dullOperationEvaluations = dullOperationEvaluations;
        entity.fitness = fitness;
        return fitness;
    };
    GameMechRandomizer.prototype.actor = function (obj, name, randomSeed) {
        if (name === void 0) { name = null; }
        if (randomSeed === void 0) { randomSeed = null; }
        if (name == null) {
            var prototypeName = /function (. {1,})\(/.exec(obj.constructor.toString());
            name = prototypeName[1];
        }
        var pt = this.patterns[name];
        if (randomSeed == null) {
            randomSeed = this.random.i(0x7fffffff);
        }
        return new GameMechRandomizer.Actor(obj, pt, randomSeed, this);
    };
    GameMechRandomizer.prototype.teachDeath = function (evaluationIndex) {
        if (evaluationIndex == null) {
            return;
        }
        this.evaluations[evaluationIndex].death++;
    };
    GameMechRandomizer.prototype.teachFitness = function (evaluationIndex, fitness) {
        if (evaluationIndex == null) {
            return;
        }
        this.evaluations[evaluationIndex].fitness += fitness;
    };
    GameMechRandomizer.prototype.setPatterns = function (patterns) {
        this.patterns = patterns;
    };
    GameMechRandomizer.prototype.getPatternsString = function () {
        return LZString.compressToEncodedURIComponent(JSON.stringify(this.patterns));
    };
    GameMechRandomizer.prototype.setPattternsFromString = function (str) {
        this.patterns = JSON.parse(LZString.decompressFromEncodedURIComponent(str));
    };
    GameMechRandomizer.prototype.seed = function () {
        var _this = this;
        var entity = new GameMechRandomizer.Entity();
        _.forOwn(this.params.patterns, function (value, key) {
            var properties = _.map(value.properties, function (p) {
                if (p instanceof Array) {
                    return new GameMechRandomizer.PatternProperty(p[0], p[1], p[2]);
                }
                else {
                    return new GameMechRandomizer.PatternProperty(p);
                }
            });
            entity.patterns[key] = new GameMechRandomizer.Pattern(properties, value.buttonNum, _this.random);
        });
        return entity;
    };
    GameMechRandomizer.prototype.mutate = function (entity) {
        var key = this.patternKeys[this.random.i(this.patternKeys.length)];
        GameMechRandomizer.Pattern.mutate(entity.patterns[key], this.random);
        return entity;
    };
    GameMechRandomizer.prototype.crossover = function (motherEntity, fatherEntity) {
        var key = this.patternKeys[this.random.i(this.patternKeys.length)];
        GameMechRandomizer.Pattern.crossover(motherEntity.patterns[key], fatherEntity.patterns[key], this.random);
        return [motherEntity, fatherEntity];
    };
    GameMechRandomizer.prototype.notification = function (pop, generation, stats, isFinished) {
        this.notificationParams.push({
            pop: pop, generation: generation, stats: stats, isFinished: isFinished
        });
    };
    return GameMechRandomizer;
})();
var GameMechRandomizer;
(function (GameMechRandomizer) {
    var Entity = (function () {
        function Entity() {
            this.patterns = {};
        }
        return Entity;
    })();
    GameMechRandomizer.Entity = Entity;
    var Evaluation = (function () {
        function Evaluation(type) {
            this.type = type;
            this.death = 0;
            this.fitness = 0;
        }
        return Evaluation;
    })();
    GameMechRandomizer.Evaluation = Evaluation;
    (function (EvaluationType) {
        EvaluationType[EvaluationType["SmartOperation"] = 0] = "SmartOperation";
        EvaluationType[EvaluationType["DullOperation"] = 1] = "DullOperation";
    })(GameMechRandomizer.EvaluationType || (GameMechRandomizer.EvaluationType = {}));
    var EvaluationType = GameMechRandomizer.EvaluationType;
    var Actor = (function () {
        function Actor(obj, pattern, randomSeed, gmr) {
            var _this = this;
            this.obj = obj;
            this.pattern = pattern;
            this.gmr = gmr;
            this.evaluationIndex = null;
            this.actions = _.map(pattern.actionPatterns, function (pt) {
                return new Action(pt, obj, pattern.properties[pt.propertyIndex], _this);
            });
            this.autoPressing = _.times(pattern.buttonNum, function () { return null; });
            this._isPressing = _.times(pattern.buttonNum, function () { return false; });
            this.isPressingAuto = _.times(pattern.buttonNum, function () { return null; });
            this.isPressingManual = _.times(pattern.buttonNum, function () { return false; });
            this.random = new Random(randomSeed);
        }
        Actor.prototype.setPressing = function (index, value) {
            if (value === void 0) { value = true; }
            this.isPressingManual[index] = value;
        };
        Actor.prototype.isPressing = function (index) {
            return this._isPressing[index];
        };
        Actor.prototype.update = function () {
            var _this = this;
            _.forEach(this.autoPressing, function (ap, i) {
                if (ap != null) {
                    if (ap.isAlways) {
                        _this.isPressingAuto[i] = true;
                    }
                    else {
                        if (_this.random.f() < ap.changingProbability) {
                            _this.isPressingAuto[i] = !_this.isPressingAuto[i];
                        }
                    }
                }
                var pm = _this.isPressingManual[i] == null ?
                    false : _this.isPressingManual[i];
                _this._isPressing[i] = _this.isPressingAuto[i] || pm;
                if (_this._isPressing[i]) {
                    _.forEach(_this.actions, function (act) {
                        if (act.pattern.buttonIndex === i) {
                            act.doing();
                        }
                    });
                }
                _this.isPressingManual[i] = null;
            });
            _.forEach(this.actions, function (act) {
                act.update();
            });
        };
        Actor.prototype.resetResources = function () {
            _.forEach(this.actions, function (act) {
                act.resetResource();
            });
        };
        Actor.prototype.teachDeath = function () {
            this.gmr.teachDeath(this.evaluationIndex);
        };
        Actor.prototype.teachFitness = function (fitness) {
            if (fitness === void 0) { fitness = 1; }
            this.gmr.teachFitness(this.evaluationIndex, fitness);
        };
        Actor.prototype.setAutoPressing = function (params, buttonIndex) {
            var pattern = new PressingPattern();
            if (params.changingProbability != null) {
                pattern.changingProbability = params.changingProbability;
            }
            if (params.isAlways != null) {
                pattern.isAlways = params.isAlways;
            }
            this.autoPressing[buttonIndex] = pattern;
        };
        Actor.prototype.setEvaluationIndex = function (index) {
            this.evaluationIndex = index;
        };
        return Actor;
    })();
    GameMechRandomizer.Actor = Actor;
    var PressingPattern = (function () {
        function PressingPattern() {
            this.changingProbability = 0;
            this.isAlways = false;
        }
        return PressingPattern;
    })();
    GameMechRandomizer.PressingPattern = PressingPattern;
    var Action = (function () {
        function Action(pattern, obj, property, actor) {
            var _this = this;
            this.pattern = pattern;
            this.obj = obj;
            this.actor = actor;
            this.isDoing = false;
            this.wasDoing = false;
            this.isOn = false;
            this.valueMin = null;
            this.valueMax = null;
            this.valueScale = 1;
            this.valueCenter = 0;
            var propertyNames = property.name.split('.');
            this.resource = new ActionResource(pattern.resourcePattern);
            this.valueObj = obj;
            _.forEach(propertyNames, function (prop, i) {
                if (i < propertyNames.length - 1) {
                    _this.valueObj = _this.valueObj[prop];
                }
                else {
                    _this.valuePropertyName = prop;
                }
            });
            if (property.min != null) {
                this.valueMin = property.min;
                this.valueMax = property.max;
                this.valueScale = Math.sqrt(property.max - property.min) /
                    (Math.pow(2, ActionPattern.valuePowMax) * 2);
                this.valueCenter = (property.max + property.min) / 2;
            }
            if (this.pattern.type === ActionType.Pressed ||
                this.pattern.type === ActionType.Pressing) {
                this.isOn = true;
            }
        }
        Action.prototype.doing = function () {
            var isOperating = false;
            if (this.pattern.type == ActionType.Pressing) {
                isOperating = true;
            }
            else {
                if (!this.wasDoing) {
                    isOperating = true;
                }
            }
            if (isOperating) {
                if (this.resource.action()) {
                    if (this.pattern.type === ActionType.Toggle ||
                        this.pattern.type === ActionType.TogglePressing) {
                        if (!this.isOn && this.pattern.operation === ActionOperation.To) {
                            this.orgValue = this.valueObj[this.valuePropertyName];
                        }
                        if (this.pattern.type === ActionType.Toggle) {
                            this.isOn = !this.isOn;
                        }
                        else {
                            this.isOn = true;
                        }
                    }
                    this.operate();
                }
            }
            this.wasDoing = true;
            this.isDoing = true;
        };
        Action.prototype.operate = function () {
            var v = this.pattern.operationValue;
            switch (this.pattern.operation) {
                case ActionOperation.Plus:
                    if (!this.isOn) {
                        v *= -1;
                    }
                    if (this.pattern.type === ActionType.Pressing) {
                        v = this.sqrtPlusMinus(v);
                    }
                    v = v * this.valueScale + this.valueCenter;
                    this.valueObj[this.valuePropertyName] += v;
                    break;
                case ActionOperation.Mul:
                    if (!this.isOn) {
                        v = 1 / v;
                    }
                    v = this.sqrtPlusMinus(v);
                    if (this.pattern.type === ActionType.Pressing) {
                        v = this.sqrtPlusMinus(v);
                    }
                    this.valueObj[this.valuePropertyName] *= v;
                    break;
                case ActionOperation.To:
                    if (!this.isOn) {
                        v = this.orgValue;
                    }
                    else {
                        v = this.squarePlusMinus(v);
                        v = v * this.valueScale + this.valueCenter;
                    }
                    this.valueObj[this.valuePropertyName] = v;
                    break;
            }
            if (this.valueMin != null &&
                this.valueObj[this.valuePropertyName] < this.valueMin) {
                this.actor.teachFitness(-1);
            }
            if (this.valueMax != null &&
                this.valueObj[this.valuePropertyName] > this.valueMax) {
                this.actor.teachFitness(-1);
            }
        };
        Action.prototype.sqrtPlusMinus = function (v) {
            if (v >= 0) {
                return Math.sqrt(v);
            }
            else {
                return -Math.sqrt(-v);
            }
        };
        Action.prototype.squarePlusMinus = function (v) {
            if (v >= 0) {
                return v * v;
            }
            else {
                return -(v * v);
            }
        };
        Action.prototype.update = function () {
            this.resource.update();
            if (!this.isDoing) {
                if (this.wasDoing && this.pattern.type === ActionType.TogglePressing) {
                    this.isOn = false;
                    this.operate();
                }
                this.wasDoing = false;
            }
            this.isDoing = false;
        };
        Action.prototype.resetResource = function () {
            this.resource.reset();
        };
        return Action;
    })();
    GameMechRandomizer.Action = Action;
    var ActionResource = (function () {
        function ActionResource(pattern) {
            this.pattern = pattern;
            this.value = 0;
            this.reset();
        }
        ActionResource.prototype.update = function () {
            this.value += this.pattern.updatingValue;
            if (this.value > 1) {
                this.value = 1;
            }
        };
        ActionResource.prototype.action = function () {
            if (this.value < this.pattern.actionValue) {
                return false;
            }
            this.value -= this.pattern.actionValue;
            if (this.value < 0) {
                this.value = 0;
            }
            return true;
        };
        ActionResource.prototype.reset = function () {
            this.value = 1;
        };
        return ActionResource;
    })();
    var Pattern = (function () {
        function Pattern(properties, buttonNum, random) {
            var _this = this;
            this.properties = properties;
            this.buttonNum = buttonNum;
            this.actionPatterns = _.times(random.i(buttonNum * 2 + 1, buttonNum), function () { return new ActionPattern(_this.properties.length, buttonNum, random); });
        }
        return Pattern;
    })();
    GameMechRandomizer.Pattern = Pattern;
    var PatternProperty = (function () {
        function PatternProperty(name, min, max) {
            if (min === void 0) { min = null; }
            if (max === void 0) { max = null; }
            this.name = name;
            this.min = min;
            this.max = max;
        }
        return PatternProperty;
    })();
    GameMechRandomizer.PatternProperty = PatternProperty;
    var Pattern;
    (function (Pattern) {
        function mutate(pattern, random) {
            var ap = pattern.actionPatterns[random.i(pattern.actionPatterns.length)];
            ActionPattern.mutate(ap, null, random);
        }
        Pattern.mutate = mutate;
        function crossover(mp, fp, random) {
            var map = mp.actionPatterns[random.i(mp.actionPatterns.length)];
            var fap = fp.actionPatterns[random.i(fp.actionPatterns.length)];
            ActionPattern.crossover(map, fap, random);
        }
        Pattern.crossover = crossover;
    })(Pattern = GameMechRandomizer.Pattern || (GameMechRandomizer.Pattern = {}));
    var ActionPattern = (function () {
        function ActionPattern(propertyNum, buttonNum, random) {
            var _this = this;
            this.propertyNum = propertyNum;
            this.buttonNum = buttonNum;
            _.times(6, function (i) { return ActionPattern.mutate(_this, i, random); });
        }
        return ActionPattern;
    })();
    var ActionPattern;
    (function (ActionPattern) {
        ActionPattern.valuePowMax = 2;
        function mutate(ap, index, random) {
            if (index == null) {
                index = random.i(6);
            }
            switch (index) {
                case 0:
                    ap.propertyIndex = random.i(ap.propertyNum);
                    break;
                case 1:
                    ap.resourcePattern = new ActionResourcePattern(random);
                    break;
                case 2:
                    ap.type = random.i(4);
                    break;
                case 3:
                    ap.operation = random.i(3);
                    break;
                case 4:
                    ap.operationValue = Math.pow(2, random.f(ActionPattern.valuePowMax, -ActionPattern.valuePowMax));
                    if (random.f() < 0.5) {
                        ap.operationValue *= -1;
                    }
                    break;
                case 5:
                    ap.buttonIndex = random.i(ap.buttonNum);
                    break;
            }
        }
        ActionPattern.mutate = mutate;
        function crossover(map, fap, random) {
            var properties = ['propertyIndex', 'resourcePattern', 'type',
                'operation', 'operationValue', 'buttonIndex'];
            swapProperty(map, fap, properties[random.i(6)]);
        }
        ActionPattern.crossover = crossover;
        function swapProperty(v1, v2, property) {
            var t = v1[property];
            v1[property] = v2[property];
            v2[property] = t;
        }
    })(ActionPattern || (ActionPattern = {}));
    var ActionType;
    (function (ActionType) {
        ActionType[ActionType["Toggle"] = 0] = "Toggle";
        ActionType[ActionType["TogglePressing"] = 1] = "TogglePressing";
        ActionType[ActionType["Pressed"] = 2] = "Pressed";
        ActionType[ActionType["Pressing"] = 3] = "Pressing";
    })(ActionType || (ActionType = {}));
    var ActionOperation;
    (function (ActionOperation) {
        ActionOperation[ActionOperation["Plus"] = 0] = "Plus";
        ActionOperation[ActionOperation["Mul"] = 1] = "Mul";
        ActionOperation[ActionOperation["To"] = 2] = "To";
    })(ActionOperation || (ActionOperation = {}));
    var ActionResourcePattern = (function () {
        function ActionResourcePattern(random) {
            var avr = random.f();
            if (avr < 0.5) {
                this.actionValue = 0;
            }
            else if (avr < 0.75) {
                this.actionValue = random.f();
            }
            else {
                this.actionValue = 1;
            }
            this.updatingValue = random.f(0.1);
        }
        return ActionResourcePattern;
    })();
    var Random = (function () {
        function Random(seed) {
            if (seed === void 0) { seed = null; }
            if (seed == null) {
                seed = Math.random() * 0x7fffffff;
            }
            var x = seed = 1812433253 * (seed ^ (seed >>> 30));
            var y = seed = 1812433253 * (seed ^ (seed >>> 30)) + 1;
            var z = seed = 1812433253 * (seed ^ (seed >>> 30)) + 2;
            var w = seed = 1812433253 * (seed ^ (seed >>> 30)) + 3;
            this.xorshift = new XorShift([x, y, z, w]);
            this.f = this.f.bind(this);
            this.i = this.i.bind(this);
            this.pm = this.pm.bind(this);
        }
        Random.prototype.f = function (to, from) {
            if (to === void 0) { to = 1; }
            if (from === void 0) { from = 0; }
            return this.xorshift.random() * (to - from) + from;
        };
        Random.prototype.i = function (to, from) {
            if (to === void 0) { to = 2; }
            if (from === void 0) { from = 0; }
            return Math.floor(this.xorshift.random() * (to - from)) + from;
        };
        Random.prototype.pm = function () {
            return Math.floor(this.xorshift.random() * 2) * 2 - 1;
        };
        return Random;
    })();
    GameMechRandomizer.Random = Random;
})(GameMechRandomizer || (GameMechRandomizer = {}));
