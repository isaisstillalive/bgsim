(function(window){
    "use strict";

    window.bgsim = {};

    var util = {
        isTouch: ('ontouchstart' in window),
    };

    util.inherits = function (childCtor, parentCtor)
    {
        /** @constructor */
        function tempCtor() {};
        tempCtor.prototype = parentCtor.prototype;
        childCtor.superClass_ = parentCtor.prototype;
        childCtor.prototype = new tempCtor();
        /** @override */
        childCtor.prototype.constructor = childCtor;
    }

    util.getRandom = function (min, max)
    {
        if (max == undefined) {
            max = min;
            min = 0;
        }
        return min + Math.floor(Math.random() * (max - min + 1));
    }

    if (util.isTouch) {
        window.addEventListener('load', function () {
            var cons = document.getElementById('console');
            if (cons) {
                var rows = cons.getAttribute('rows')-1 || 1;
                console.log = function () {
                    var l = cons.innerHTML.split("\n", rows);
                    cons.innerHTML = Array.prototype.join.call(arguments, ',') + "\n" + l.join("\n");
                }
            }
        });
    }

    bgsim.Point = function (x, y)
    {
        this.x = x;
        this.y = y;
    }
    {
        bgsim.Point.defineAccessor = function(klass)
        {
            klass.prototype.__defineGetter__('x', function() {
                return this.point.x;
            });

            klass.prototype.__defineSetter__('x', function(x) {
                return this.point.x = x;
            });

            klass.prototype.__defineGetter__('y', function() {
                return this.point.y;
            });

            klass.prototype.__defineSetter__('y', function(y) {
                return this.point.y = y;
            });
        };

        bgsim.Point.prototype.translate = function(context) {
            context.translate(this.x, this.y);
        };

        bgsim.Point.prototype.toString = function() {
            return '[' + this.x + ',' + this.y + ']';
        };

    }

    bgsim.Shape = function (width, height)
    {
        this.width = width;
        this.height = height;
    }
    {
        bgsim.Shape.prototype.__defineGetter__('width', function() {
            return this._width;
        });

        bgsim.Shape.prototype.__defineSetter__('width', function(width) {
            this.half_width = width / 2;
            return this._width = width;
        });

        bgsim.Shape.prototype.__defineGetter__('height', function() {
            return this._height;
        });

        bgsim.Shape.prototype.__defineSetter__('height', function(height) {
            this.half_height = height / 2;
            return this._height = height;
        });

        bgsim.Shape.prototype.toString = function() {
            return '[' + this.width + ',' + this.height + ']';
        };

        bgsim.Shape.prototype.within = function(point) {
            return false;
        };
    }

    bgsim.Rectangle = function (width, height)
    {
        bgsim.Shape.call(this, width, height);
    }
    {
        util.inherits(bgsim.Rectangle, bgsim.Shape);

        bgsim.Rectangle.prototype.within = function(point) {
            return (point.x >= -this.half_width && point.x <= this.half_width &&
                    point.y >= -this.half_height && point.y <= this.half_height);
        };

        bgsim.Rectangle.prototype.toString = function() {
            return 'Rectangle' + bgsim.Shape.prototype.toString.call(this);
        };
    }

    bgsim.Circle = function (width, height)
    {
        bgsim.Shape.call(this, width, height);
    }
    {
        util.inherits(bgsim.Circle, bgsim.Shape);

        bgsim.Circle.prototype.within = function(point) {
            var length = Math.sqrt(Math.pow(point.x / this.half_width, 2) + Math.pow(point.y / this.half_height, 2));
            return (length <= 1);
        };

        bgsim.Circle.prototype.toString = function() {
            return 'Circle' + bgsim.Shape.prototype.toString.call(this);
        };
    }

    bgsim.Image = function (image, options)
    {
        if (options === undefined) {
            options = {}
        }

        if (options.shape) {
            this.shape = options.shape;
        } else {
            this.shape = new bgsim.Rectangle((options.width || 0), (options.height || 0));
        }
        this.crip = new bgsim.Point(0, 0);
        this.image = this.loadImage(image);
        this.sprites = options.sprites || [1, 1];

        if (!options.width || !options.height) {
            var self = this;
            var onload = function () {
                if (!options.width) {
                    self.shape.width = this.width / self.sprites[0];
                }
                if (!options.height) {
                    self.shape.height = this.height / self.sprites[1];
                }
            };

            this.addEventListener('load', onload);
        }
    }
    {
        bgsim.Image.prototype.addEventListener = function (event, callback)
        {
            this.image.addEventListener(event, callback);
            if (this.image.complete) {
                callback.call(this.image);
            }
        };

        bgsim.Image.prototype.loadImage = function (image)
        {
            switch (Object.prototype.toString.call(image)) {
            case '[object HTMLImageElement]':
            case '[object HTMLCanvasElement]':
            case '[object HTMLVideoElement]':
                return image;

            case '[object String]':
                var result = new Image();
                result.src = image;
                return result;
            }
        };

        bgsim.Image.create = function (image, callback)
        {
            if (!(image instanceof bgsim.Image)) {
                image = new bgsim.Image(image);
            }
            if (callback) {
                image.addEventListener('load', function () {
                    callback.call(image);
                });
            }
            return image;
        }

        bgsim.Image.prototype.draw = function(context, sprite, size) {
            var cripX = 0;
            var cripY = 0;
            if (sprite) {
                cripX = this.shape.width * (sprite % this.sprites[0]);
                cripY = this.shape.height * (Math.floor(sprite / this.sprites[0]) % this.sprites[1]);
            }
            context.drawImage(this.image, cripX, cripY, this.shape.width, this.shape.height, -size.width/2, -size.height/2, size.width, size.height);
        };
    }

    // class Player
    bgsim.Player = function (options)
    {
        if (options === undefined) {
            options = {}
        }

        this.name = options.name || 'player';
        this.private = !!options.private;

        this.color = options.color || 'rgba(0,0,0,0)';
    }
    {
        bgsim.Player.Empty = new bgsim.Player();
    }

    // class Component
    bgsim.Component = function (options)
    {
        if (options === undefined) {
            options = {}
        }

        this.name = options.name || 'null';
        this._player = options.player;
        this.private = options.private;

        if (options.location) {
            this.location = options.location;
        } else {
            this.location = new bgsim.Point((options.x || 0), (options.y || 0));
        }
        if (options.shape) {
            this.shape = options.shape;
        } else {
            this.shape = new bgsim.Rectangle((options.width || 0), (options.height || 0));
        }
        this.zoom = options.zoom || 1;
        this.angle = options.angle || 0;
        this.visible = (options.visible == undefined) || !!options.visible;

        this.layer = options.layer;
        this.color = options.color;

        this.parent = options.parent;

        this.tappable = !!options.tappable;
        this.movable = !!options.movable;
        this.holdable = !!options.holdable;
        this.doubletappable = !!options.doubletappable;

        if (options.containable == undefined) {
            this.containable = true;
        } else {
            this.containable = options.containable;
        }

        this.eventHandlers = {};
        this.children = [];

        this.touchData = {};
        this.focus = false;

        this.options = options;
    }
    {
        bgsim.Component.prototype.copy = function ()
        {
            var component = new this.constructor(this.options);

            for (var event in this.eventHandlers) {
                var eventHandlers = this.eventHandlers[event];
                component.eventHandlers[event] = [];
                Array.prototype.push.apply(component.eventHandlers[event], eventHandlers);
            };
            for (var i in this) {
                if (this[i] instanceof Function && (!this.prototype || this[i] != this.prototype[i])) {
                    component[i] = this[i];
                }
            };

            return component;
        };

        bgsim.Component.prototype.__defineGetter__('player', function () {
            if (this._player) {
                return this._player;
            }
            if (this.parent) {
                return this.parent.player;
            }
            return bgsim.Player.Empty;
        });

        bgsim.Component.prototype.__defineGetter__('parent', function () {
            return this._parent;
        });

        bgsim.Component.prototype.__defineSetter__('parent', function (parent) {
            if (this._parent == parent) {
                if (parent) {
                    parent.remove_(this);
                    parent.add_(this);
                }
                return parent;
            }

            if (!parent.containable) {
                return parent;
            }

            var original_parent = this._parent;

            if (this._parent) {
                this._parent.remove_(this);
                this.location = this._parent.getAllGlobalPoint(this.location);
            }
            this._parent = parent;
            if (parent) {
                if (original_parent) {
                    this.location = parent.getAllLocalPoint(this.location);
                }
                parent.add_(this);
            }

            return this._parent;
        });

        bgsim.Component.prototype.add_ = function (component, ratio)
        {
            if (ratio == undefined || ratio == 0) {
                this.children.push(component);
            } else if (ratio == 1) {
                this.children.unshift(component);
            } else {
                var index = Math.floor(this.children.length * (1-ratio));
                this.children.splice(index, 0, component);
            }

            this.addEvent_(component);
        };
        bgsim.Component.prototype.addEvent_ = function (component)
        {
            if (this.private != null) {
                component.private = this.private;
            }

            this.trigger('added', component);
        };

        bgsim.Component.prototype.remove_ = function (component)
        {
            var index = this.children.indexOf(component);
            this.children.splice(index, 1);
            this.trigger('removed', component);
        };

        bgsim.Component.prototype.allowContain = function (component)
        {
            return true;
        };

        bgsim.Component.prototype.draw = function (contexts)
        {
            if (!this.visible) {
                return;
            }

            for (var i = 0; i < contexts.length; i++) {
                var context = contexts[i];
                context.save();
                this.location.translate(context);
                context.rotate(this.angle * Math.PI / 180);
                context.scale(this.zoom, this.zoom);
            };

            this._draw(contexts);
            if (this.focus) {
                this.drawContext(contexts).fillStyle = 'rgba(255, 255, 255, 0.7)';
                this.drawContext(contexts).fillRect(-this.shape.half_width, -this.shape.half_height, this.shape.width, this.shape.height);
            }

            for (var i = 0; i < this.children.length; i++) {
                this.children[i].draw(contexts);
            }

            for (var i = 0; i < contexts.length; i++) {
                var context = contexts[i];
                context.restore();
            };
        };

        bgsim.Component.prototype._draw = function (contexts)
        {
        };

        bgsim.Component.prototype.getLayer = function (contexts)
        {
            var layer = 0;
            if (this.floating) {
                layer = contexts.length - 1;
            } else if (this.layer) {
                layer = this.layer;
            } else if (this.parent) {
                layer = this.parent.getLayer(contexts);
            }

            return layer;
        };

        bgsim.Component.prototype.drawContext = function (contexts)
        {
            return contexts[this.getLayer(contexts)];
        }

        bgsim.Component.prototype.getComponentFromPoint = function (point, callback, currentLayer)
        {
            if (currentLayer === undefined) {
                currentLayer = -1;
            }
            var localPoint = this.getLocalPoint(point);

            if (!this.visible) {
                return;
            }

            var component;
            for (var i = this.children.length; i--;) {
                var child = this.children[i];
                if (child.floating) {
                    continue;
                }
                var result = child.getComponentFromPoint(localPoint, callback, currentLayer);
                if (result == null) {
                    continue;
                }
                if (result.layer > currentLayer) {
                    currentLayer = result.layer;
                    component = result;
                }
            }
            if (component != null) {
                return component;
            }

            var layer = this.getLayer();
            if (this.within(localPoint) && layer > currentLayer && (!callback || callback.call(this, this))) {
                return {component: this, point: point, layer: layer};
            }

            return;
        }

        bgsim.Component.prototype.within = function (point)
        {
            return this.shape.within(point);
        };

        bgsim.Component.prototype.getAllLocalPoint = function (point)
        {
            var localPoint = point;
            if (this.parent != null) {
                localPoint = this.parent.getAllLocalPoint(localPoint);
            }
            return this.getLocalPoint(localPoint);
        };

        bgsim.Component.prototype.getLocalPoint = function (point)
        {
            var innerX = (point.x - this.location.x) / this.zoom;
            var innerY = (point.y - this.location.y) / this.zoom;
            var result;

            var angle = this.angle;
            angle = (360 + (angle % 360)) % 360;
            if (angle == 0) {
                result = new bgsim.Point(innerX, innerY);
            } else if (angle == 90) {
                result = new bgsim.Point(innerY, -innerX);
            } else if (angle == 180) {
                result = new bgsim.Point(-innerX, -innerY);
            } else if (angle == 270) {
                result = new bgsim.Point(-innerY, innerX);
            } else {
                var r = Math.atan2(innerY, innerX);
                var l = innerX / Math.cos(r);
                var r2 = r - this.angle * Math.PI / 180;
                innerX = l * Math.cos(r2);
                innerY = l * Math.sin(r2);

                result = new bgsim.Point(innerX, innerY);
            }

            return result;
        };

        bgsim.Component.prototype.getAllGlobalPoint = function (point)
        {
            var globalPoint = this.getGlobalPoint(point);

            if (this.parent != null) {
                globalPoint = this.parent.getAllGlobalPoint(globalPoint);
            }

            return globalPoint;
        };

        bgsim.Component.prototype.getGlobalPoint = function (point)
        {
            var x, y;

            var angle = this.angle;
            var r = angle * Math.PI / 180;
            x = point.x * Math.cos(r) - point.y * Math.sin(r);
            y = point.x * Math.sin(r) + point.y * Math.cos(r);

            x *= this.zoom;
            y *= this.zoom;

            x += this.location.x;
            y += this.location.y;

            return new bgsim.Point(x, y);
        };

        bgsim.Component.prototype.getGlobalAngle = function ()
        {
            var angle = this.angle;
            if (this.parent) {
                angle += this.parent.getGlobalAngle();
            }
            return angle;
        };

        bgsim.Component.prototype.getGlobalZoom = function ()
        {
            var zoom = this.zoom;
            if (this.parent) {
                zoom *= this.parent.getGlobalZoom();
            }
            return zoom;
        };

        bgsim.Component.prototype.on = function (event, handler)
        {
            this.eventHandlers[event] = this.eventHandlers[event] || []
            this.eventHandlers[event].push(handler);
        };

        bgsim.Component.prototype.off = function (event, handler)
        {
            var eventHandlers = this.eventHandlers[event];
            if (!eventHandlers) {
                return;
            }

            for (var i = eventHandlers.length; i--;) {
                if (eventHandlers[i] == handler) {
                    eventHandlers.splice(i, 1);
                }
            }
        };

        bgsim.Component.prototype.one = function (event, handler)
        {
            var tempHandler = function () {
                this.off(event, tempHandler);
                return handler.call(this);
            };
            this.on(event, tempHandler);
        };

        bgsim.Component.prototype.trigger = function (event)
        {
            var args = Array.prototype.slice.call(arguments, 1);

            var eventHandlers = this.eventHandlers[event];
            if (!eventHandlers) {
                return;
            }

            for (var i = eventHandlers.length; i--;) {
                if (eventHandlers[i].apply(this, args) === false) {
                    return false;
                }
            };
        };

        bgsim.Component.prototype.sendEvent = function (id, point, e)
        {
            switch (e.type) {
                case 'mousedown':
                case 'touchstart':
                    return this.sendEventTouchStart(point);

                case 'mousemove':
                case 'touchmove':
                    return this.sendEventTouchMove(point);

                case 'mouseup':
                case 'touchend':
                case 'touchcancel':
                    return this.sendEventTouchEnd(point);
            }
        };

        bgsim.Component.prototype.sendEventTouchStart = function (point)
        {
            // タップ判定開始
            this.touchData.tapping = this.tappable;

            // ホールド判定開始
            if (this.holdable) {
                var self = this;
                this.touchData.holding = window.setTimeout(function(){
                    self.sendEventTouchFinishTrigger('hold');
                }, 500);
            } else {
                this.touchData.holding = false;
            }

            // 移動判定用の基準を求める
            if (this.movable) {
                this.touchData.movecancel = new bgsim.Point(this.location.x, this.location.y);
                this.touchData.moving = {
                    x: this.location.x - point.x,
                    y: this.location.y - point.y,
                };

                // タップが無効なら即座に移動判定開始
                if (!this.tappable && !this.holdable) {
                    this.sendEventTouchDragStart();
                }

                var i = this.parent.children.indexOf(this);
                this.parent.children.splice(i, 1);
                this.parent.children.push(this);
                this.sendEventTouchMove(point);
            } else {
                this.touchData.moving = false;
            }

            return true;
        };

        bgsim.Component.prototype.sendEventTouchMove = function (point)
        {
            // 移動中でなければ何もしない
            if (!this.touchData.moving) {
                return;
            }

            // タップ判定中ならば、移動しているかどうかを調べる
            if (this.touchData.tapping || this.touchData.holding) {
                // 移動したらタップ判定を終了し、移動判定開始
                if ((
                    Math.abs(this.touchData.moving.x - (this.location.x - point.x)) <= 15 &&
                    Math.abs(this.touchData.moving.y - (this.location.y - point.y)) <= 15
                )) {
                    return;
                } else {
                    this.sendEventTouchDragStart();
                }
            }

            // 移動判定開始していれば移動させる
            this.location.x = this.touchData.moving.x + point.x;
            this.location.y = this.touchData.moving.y + point.y;
            // 移動先がcontainableならフォーカスさせる
            var gp = this.getAllGlobalPoint(new bgsim.Point(0, 0));
            var self = this;
            var component = bgsim.Game.getComponentFromPoint(gp, function (component) {
                return component.containable && component.allowContain(self);
            });
            if (this.touchData.focused) {
                this.touchData.focused.focus = false;
            }
            if (component) {
                component.component.focus = true;
                this.touchData.focused = component.component;
            } else {
                this.touchData.focused = null;
            }

            return;
        };

        bgsim.Component.prototype.sendEventTouchEnd = function (point)
        {
            if (this.holdable) {
                // ホールド判定を除去
                window.clearTimeout(this.touchData.holding);
            }

            // タップ判定が継続したらタップ処理を行う
            if (this.touchData.tapping) {
                if (this.within(this.getLocalPoint(point))) {
                    // ダブルタップ判定を行う
                    if (this.doubletappable) {
                        if (this.touchData.singletapping) {
                            this.sendEventTouchFinishTrigger('doubletap');
                        } else {
                            var self = this;
                            this.touchData.singletapping = window.setTimeout(function(){
                                self.sendEventTouchFinishTrigger('tap');
                            }, 300);
                        }
                    } else {
                        this.sendEventTouchFinishTrigger('tap');
                    }
                }
            } else if (this.touchData.moving) {
                this.trigger('dragend');
                // 移動先がフォーカスされていれば移動させる
                if (this.touchData.focused) {
                    this.parent = this.touchData.focused;
                    this.touchData.focused.focus = false;
                } else {
                    this.location = this.touchData.movecancel;
                    this.parent.addEvent_(this);
                }
            }

            this.touchData.moving = null;
            this.floating = false;

            return false;
        };

        bgsim.Component.prototype.sendEventTouchDragStart = function () {
            this.floating = true;
            
            this.touchData.tapping = null;

            window.clearTimeout(this.touchData.holding);
            this.touchData.holding = null;

            this.trigger('dragstart');
        };

        bgsim.Component.prototype.sendEventTouchFinishTrigger = function (name) {
            window.clearTimeout(this.touchData.holding);
            window.clearTimeout(this.touchData.singletapping);

            this.touchData.tapping = false;
            this.touchData.moving = false;
            this.touchData.holding = false;
            this.touchData.singletapping = false;

            if (this.trigger(name) !== false) {
                if (this[name]) {
                    this[name].call(this);
                }
            }
        };
    }

    // class Board extends Component
    bgsim.Board = function (options)
    {
        if (!options) {
            options = {}
        }
        if (options.doubletappable == undefined) {
            options.doubletappable = false;
        }

        bgsim.Component.call(this, options);
        this.image = options.image;
        this.sprite = options.sprite;
    }
    {
        util.inherits(bgsim.Board, bgsim.Component);

        bgsim.Board.prototype._draw = function (contexts)
        {
            this.image.draw(this.drawContext(contexts), this.sprite, this.shape);
        };

        bgsim.Board.prototype.__defineSetter__('image', function (image) {
            if (this._image == image) {
                return;
            }

            var self = this;
            this._image = bgsim.Image.create(image, function () {
                if (self.shape.constructor != this.shape.constructor) {
                    self.shape = new this.shape.constructor;
                }
                self.shape.width = this.shape.width;
                self.shape.height = this.shape.height;
            })
        });

        bgsim.Board.prototype.__defineGetter__('image', function() {
            return this._image;
        });
    }

    // class Card extends Board
    bgsim.Card = function (options)
    {
        if (!options) {
            options = {}
        }
        if (options.doubletappable == undefined) {
            options.doubletappable = true;
        }
        if (options.holdable == undefined) {
            options.holdable = true;
        }
        bgsim.Board.call(this, options);

        this.frontImage = this.image;
        this.frontSprite = this.sprite;
        if (options.backImage) {
            this.backImage = bgsim.Image.create(options.backImage);
        } else {
            this.backImage = this.frontImage;
        }
        if (options.backSprite) {
            this.backSprite = options.backSprite;
        } else {
            this.backSprite = options.frontSprite;
        }

        this.back = !!options.back;

        this._sleep = false;
        this.sleep = !!options.sleep;
    }
    {
        util.inherits(bgsim.Card, bgsim.Board);

        bgsim.Card.prototype.hold = function ()
        {
            this.back = !this.back;
        };

        bgsim.Card.prototype.tap = function ()
        {
            this.sleep = !this.sleep;
        };

        bgsim.Card.prototype.doubletap = function ()
        {
            this.private = !this.private;
        };

        bgsim.Card.prototype.__defineSetter__('sleep', function (sleep) {
            if (this._sleep == sleep) {
                return;
            }
            this._sleep = sleep;
            if (sleep) {
                this.angle -= 90;
            } else {
                this.angle += 90;
            }
        });

        bgsim.Card.prototype.__defineGetter__('sleep', function() {
            return this._sleep;
        });

        bgsim.Card.prototype._draw = function (contexts)
        {
            var context = this.drawContext(contexts);

            var color = this.color;
            if (color === undefined) {
                color = this.player.color;
            }
            if (!this.private && color) {
                context.fillStyle = color;
                context.fillRect(-this.shape.half_width-4, -this.shape.half_height-4, this.shape.width+8, this.shape.height+8);
            }

            if (this.back || (this.private && this.player.private)) {
                this.backImage.draw(context, this.backSprite, this.shape);
            } else {
                this.frontImage.draw(context, this.frontSprite, this.shape);
            }
        };
    }

    // class Label extends Component
    bgsim.Label = function (options)
    {
        if (!options) {
            options = {}
        }
        if (options.doubletappable == undefined) {
            options.doubletappable = false;
        }

        bgsim.Component.call(this, options);

        this.value = options.value;
        this.source = options.source;
    }
    {
        util.inherits(bgsim.Label, bgsim.Component);

        bgsim.Label.prototype._draw = function (contexts)
        {
            var context = this.drawContext(contexts);

            if (this.source && this.source instanceof bgsim.Image) {
                this.source.draw(context, this.value, this.shape);
            } else {
                context.save();
                context.fillStyle = '#fff';
                context.fillRect(-this.shape.half_width, -this.shape.half_height, this.shape.width, this.shape.height);
                context.strokeStyle = '#000';
                context.strokeRect(-this.shape.half_width, -this.shape.half_height, this.shape.width, this.shape.height);
                context.font = '80px monospace';
                context.textAlign = 'center';
                context.fillStyle = '#000';
                if (this.source instanceof Array && this.source[this.value] !== undefined) {
                    context.fillText(this.source[this.value], 0, 30, this.shape.width);
                } else {
                    context.fillText(this.value, 0, 30, this.shape.width);
                }
                context.restore();
            }
        };
    }

    // class Counter extends Label
    bgsim.Counter = function (options)
    {
        if (options === undefined) {
            options = {}
        }
        options.width = options.width || 50;
        options.height = options.height || 50;

        options.doubletappable = false;
        options.tappable = true;
        if (options.holdable == undefined) {
            options.holdable = true;
        }

        bgsim.Label.call(this, options);

        this._min = 0;
        this.range = 0;
        if (this.source instanceof Array) {
            this.max = options.max || (this.source.length - 1);
            this.min = options.min || 0;
            this.step = options.step || 1;
        } else {
            this.max = options.max || 20;
            this.min = options.min || 0;
            this.step = options.step || -1;
        }
        this.value = options.value || (this.step > 0 ? this.min : this.max);
    }
    {
        util.inherits(bgsim.Counter, bgsim.Label);

        bgsim.Counter.prototype.tap = function ()
        {
            this.next();
        };

        bgsim.Counter.prototype.hold = function ()
        {
            this.prev();
        };

        bgsim.Counter.prototype.next = function ()
        {
            this.value = this.min + (this.value - this.min + this.step + this.range) % this.range;
            this.trigger('changed');
        };

        bgsim.Counter.prototype.prev = function ()
        {
            this.value = this.min + (this.value - this.min - this.step + this.range) % this.range;
            this.trigger('changed');
        };

        bgsim.Counter.prototype.__defineSetter__('max', function(max){
            this._max = max;
            this.range = (this._max - this._min + 1);
            return this._max;
        });

        bgsim.Counter.prototype.__defineGetter__('max', function(){
            return this._max;
        });

        bgsim.Counter.prototype.__defineSetter__('min', function(min){
            this._min = min;
            this.range = (this._max - this._min + 1);
            return this._min;
        });

        bgsim.Counter.prototype.__defineGetter__('min', function(){
            return this._min;
        });
    }

    // class Dice extends Counter
    bgsim.Dice = function (options)
    {
        if (options === undefined) {
            options = {}
        }
        options.holdable = false;
        options.max = options.max || 6;
        options.min = options.min || 1;
        bgsim.Counter.call(this, options);

        this.jiggle = options.jiggle || 0;
    }
    {
        util.inherits(bgsim.Dice, bgsim.Counter);

        bgsim.Dice.prototype.next = function ()
        {
            this.step = util.getRandom(this.min, this.max);
            bgsim.Counter.prototype.next.call(this);
        };

        bgsim.Dice.prototype.tap = function ()
        {
            var self = this;
            var x = this.location.x;
            var y = this.location.y;
            var angle = this.angle;

            var rolling = function(count) {
                if (count < 0) {
                    self.location.x = x;
                    self.location.y = y;
                    self.angle = angle;
                    return;
                }

                self.next();
                if (self.jiggle > 0) {
                    self.location.x = x + util.getRandom(-self.jiggle, self.jiggle);
                    self.location.y = y + util.getRandom(-self.jiggle, self.jiggle);
                    self.angle = angle + util.getRandom(-self.jiggle, self.jiggle);
                }
                setTimeout(rolling, 30, count-1);
            };
            rolling(10);
        };
    }

    // class Area extends Component
    bgsim.Area = function (options)
    {
        if (options === undefined) {
            options = {}
        }
        if (!options.movable) {
            options.movable = false;
        }
        if (!options.tappable) {
            options.tappable = false;
        }
        bgsim.Component.call(this, options);
    }
    {
        util.inherits(bgsim.Area, bgsim.Component);

        bgsim.Area.prototype._draw = function (contexts)
        {
            if (this.color) {
                var context = this.drawContext(contexts);
                context.save();
                context.fillStyle = this.color;
                context.fillRect(-this.shape.half_width, -this.shape.half_height, this.shape.width, this.shape.height);
                context.restore();
            }
        };
    }

    // class SortedArea extends Area
    bgsim.SortedArea = function (options)
    {
        if (options === undefined) {
            options = {}
        }

        bgsim.Area.call(this, options);

        this.order = true;

        if (options.padding) {
            this.padding = options.padding;
        } else {
            this.padding = new bgsim.Point((options.padding_x || 0), (options.padding_y || 0));
        }
        if (options.spacing) {
            this.spacing = options.spacing;
        } else {
            var spacing_x = (options.spacing_x == undefined) ? this.shape.width : options.spacing_x;
            var spacing_y = (options.spacing_y == undefined) ? this.shape.height : options.spacing_y;
            this.spacing = new bgsim.Point(spacing_x, spacing_y);
        }
        this.thick = options.thick || 0;
    }
    {
        util.inherits(bgsim.SortedArea, bgsim.Area);

        bgsim.SortedArea.prototype.add_ = function(component, ratio)
        {
            bgsim.Area.prototype.add_.call(this, component, ratio);
            this.sort();
        };

        bgsim.SortedArea.prototype.add = function (component, ratio)
        {
            if (component._parent != this) {
                component._parent.remove_(component);
            }
            component._parent = this;
            this.add_(component, ratio);
        };

        bgsim.SortedArea.prototype.remove_ = function(component)
        {
            bgsim.Area.prototype.remove_.call(this, component);
            this.sort();
        };

        bgsim.SortedArea.prototype.reorder = function ()
        {
            if (!this.order) {
                return;
            }

            if (this.children.length == 0) {
                return;
            }

            var spacing = new bgsim.Point(this.spacing.x, this.spacing.y);
            var order = {};
            order.x = (spacing.x > 0 ? 1 : 0);
            order.y = (spacing.y > 0 ? 1 : 0);

            var base = new bgsim.Point(0, 0);
            base.x = (this.padding.x - this.shape.half_width) * order.x;
            base.y = (this.padding.y - this.shape.half_height) * order.y;

            if (this.children.length > 1) {
                var count = this.children.length - 1;

                var first_child = this.children[0];
                var last_child = this.children[count];

                var pdirs = ['x', 'y'];
                var sdirs = ['width', 'height'];
                for (var i = 0; i < 2; i++) {
                    var pdir = pdirs[i];
                    var sdir = sdirs[i];
                    var hsdir = 'half_' + sdir;

                    var children_size = Math.abs(this.spacing[pdir]) * count;
                    var component_size = (this.shape[sdir] - this.padding[pdir] * 2) - first_child.shape[hsdir] - last_child.shape[hsdir];
                    if (children_size > component_size) {
                        spacing[pdir] = (component_size / count) * order[pdir];
                    } else {
                        spacing[pdir] = this.spacing[pdir];
                    }
                }
            }

            var gangle = this.getGlobalAngle();
            spacing.x -= this.thick * Math.sin(gangle * Math.PI / 180);
            spacing.y -= this.thick * Math.cos(gangle * Math.PI / 180);

            for (var i = this.children.length; i--; ) {
                var component = this.children[i];

                component.location.x = base.x + (i * spacing.x) + (component.shape.half_width * order.x);
                component.location.y = base.y + (i * spacing.y) + (component.shape.half_height * order.y);
            };
        };

        bgsim.SortedArea.prototype.sort = function()
        {
            if (!this.order) {
                return;
            }

            if (this._compare) {
                this.children.sort(this._compare);
            }
            this.reorder();
        };

        bgsim.SortedArea.prototype.__defineGetter__('compare', function() {
            return this.point._compare;
        });

        bgsim.SortedArea.prototype.__defineSetter__('compare', function(compare) {
            this._compare = compare;
            this.sort();
            return this._compare;
        });
    }

    // class Deck extends SortedArea
    bgsim.Deck = function (options)
    {
        if (options === undefined) {
            options = {}
        }
        options.spacing = new bgsim.Point(0, 0);
        bgsim.SortedArea.call(this, options);

        this.back = options.back;
    }
    {
        util.inherits(bgsim.Deck, bgsim.SortedArea);

        bgsim.Deck.prototype.build = function (card, count, callback)
        {
            this.order = false;
            for (var index = 0; index < count; index++) {
                var copyCard = card.copy();
                if (callback) {
                    callback.call(copyCard, index);
                }
                copyCard.parent = this;
            };
            this.order = true;
            this.shuffle();
        };

        bgsim.Deck.prototype.add_ = function(component, ratio)
        {
            bgsim.SortedArea.prototype.add_.call(this, component, ratio);
            if (this.back != null) {
                component.back = this.back;
            }
            component.private = this.private;
        };

        bgsim.Deck.prototype.shuffle = function ()
        {
            for (var dst = this.children.length; dst--;) {
                var src = util.getRandom(dst);
                var card = this.children[dst];
                this.children[dst] = this.children[src];
                this.children[src] = card;
            }
            this.reorder();
        };
    }

    // class Stock extends Area
    bgsim.Stock = function (options)
    {
        if (options === undefined) {
            options = {}
        }
        bgsim.Area.call(this, options);

        this.limit = Math.max(0, options.limit) || Infinity;

        this.source = options.source;
        this.copying = true;
        for (var i = Math.min(this.limit, 2); i--;) {
            this.source.copy().parent = this;
        };
        this.copying = false;
    }
    {
        util.inherits(bgsim.Stock, bgsim.Area);

        bgsim.Stock.prototype.allowContain = function(component)
        {
            return (component.name == this.source.name);
        };

        bgsim.Stock.prototype.add_ = function(component, ratio)
        {
            if (this.copying) {
                bgsim.Area.prototype.add_.call(this, component, ratio);
            } else {
                // 2枚目までは入れるが3枚目以降は消す
                if (this.limit < 2) {
                    bgsim.Area.prototype.add_.call(this, component, ratio);
                    component.location.x = 0;
                    component.location.y = 0;
                } else {
                    component._parent = null
                }
                this.limit++;
            }
        };

        bgsim.Stock.prototype.remove_ = function(component)
        {
            bgsim.Area.prototype.remove_.call(this, component);

            // 2枚以上残っていれば複製する
            this.limit--;
            if (this.limit >= 2) {
                this.copying = true;
                this.source.copy().parent = this;
                this.copying = false;
            }
        };
    }

    // class Game extends Component
    var Game = function ()
    {
        var options = {
            zoom: 1,
        }
        bgsim.Component.call(this, options);
    }
    {
        util.inherits(Game, bgsim.Component);

        Game.prototype.start = function (div, options, init)
        {
            // 論理サイズを設定
            this.shape.width = options.width || 768;
            this.shape.height = options.height || 1024;

            // 画像レイヤーを4枚作成
            // 0.背景、1.ボード、2.カード、3.ドラッグ用を想定
            this.layers = [];
            this.contexts = [];
            for (var i = 0; i < 4; i++) {
                var layer = document.createElement('canvas');
                div.appendChild(layer);
                layer.style.position = 'absolute';
                layer.style.display = 'block';
                layer.style.backgroundColor = 'transparent';
                layer.style.zIndex = i;
                this.layers.push(layer);
                this.contexts.push(layer.getContext('2d'));
            };

            // キャンバスを現在のサイズに調整
            var game = this;
            var resized = function () {
                var style_width = window.innerWidth + 'px';
                var style_height = window.innerHeight + 'px';
                game.canvas_width = window.innerWidth * window.devicePixelRatio;
                game.canvas_height = window.innerHeight * window.devicePixelRatio;

                game.location.x = game.canvas_width/2;
                game.location.y = game.canvas_height/2;

                // 短い方を合わせる
                if (game.canvas_width >= game.canvas_height) {
                    game.zoom = game.canvas_height/game.shape.height;
                } else {
                    game.zoom = game.canvas_width/game.shape.width;
                }

                for (var i = game.layers.length; i--;) {
                    var layer = game.layers[i];
                    layer.style.width = style_width;
                    layer.style.height = style_height;
                    layer.width = game.canvas_width;
                    layer.height = game.canvas_height;
                }
            }

            resized();
            var resizing;
            window.addEventListener('resize', function () {
                if (resizing) {
                    window.clearTimeout(resizing);
                }
                resizing = window.setTimeout(resized, 30);
            })

            this.listeningComponent = {};

            var events = [];
            if (util.isTouch) {
                events.push(['touchstart', this.touchEventSender]);
                events.push(['touchmove', this.touchEventSender]);
                events.push(['touchend', this.touchEventSender]);
                events.push(['touchcancel', this.touchEventSender]);
            } else {
                events.push(['mousedown', this.mouseEventSender]);
                events.push(['mousemove', this.mouseEventSender]);
                events.push(['mouseup', this.mouseEventSender]);
            }
            var self = this;
            var eventCanvas = this.layers[this.layers.length -1];
            events.forEach(function(data) {
                eventCanvas.addEventListener(data[0], function(e){ return data[1].call(self, e); }, false);
            });

            this.init = init;
            this.init();
            this.draw();
        };

        Game.prototype.reset = function ()
        {
            for (var i = this.children.length; i--;) {
                this.children[i];
            }
            this.children = [];
            this.init();
        }

        Game.prototype.draw = function ()
        {
            for (var i = 0; i < this.contexts.length; i++) {
                this.contexts[i].clearRect(0, 0, this.canvas_width, this.canvas_height);
            }
            bgsim.Component.prototype.draw.call(this, this.contexts);

            var self = this;
            window.requestAnimationFrame(function(){ self.draw(); });
        };

        Game.prototype.within = function (point)
        {
            return false;
        };

        Game.prototype.touchEventSender = function (e)
        {
            for (var i = e.changedTouches.length; i--;) {
                var touch = e.changedTouches[i];

                var x = touch.pageX * window.devicePixelRatio;
                var y = touch.pageY * window.devicePixelRatio;

                var e2 = {
                    type: e.type,
                    offsetX: x,
                    offsetY: y,
                    changedTouches: [touch],
                };

                var point = new bgsim.Point(x, y);
                this.sendEvent(touch.identifier, point, e2);
                // $('#console').val('touch:' + e.type);
            }
        };

        Game.prototype.mouseEventSender = function (e)
        {
            var point = new bgsim.Point(e.offsetX, e.offsetY);
            this.sendEvent(0, point, e);
        };

        Game.prototype.sendEvent = function (id, point, e)
        {
            var component = null;

            if (this.listeningComponent[id] == undefined) {
                component = this.getComponentFromPoint(point, function () {
                    return (this.tappable || this.holdable || this.movable);
                });
                if (component != null) {
                    point = component.point;
                    component = component.component;
                    if (component == this) {
                        return;
                    }
                    for (var i in this.listeningComponent) {
                        if (this.listeningComponent[i] === component) {
                            return;
                        }
                    };
                }
            } else {
                component = this.listeningComponent[id];
                point = component.parent.getAllLocalPoint(point);
            }

            if (component != null) {
                var result = component.sendEvent(id, point, e);
                if (result === true) {
                    this.listeningComponent[id] = component;
                } else if (result === false) {
                    delete this.listeningComponent[id];
                }
                return result;
            }

            return;
        };
    }
    bgsim.Game = new Game();
})(window);
