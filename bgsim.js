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

    bgsim.Size = function (width, height)
    {
        this.width = width;
        this.height = height;
    }
    {
        bgsim.Size.prototype.__defineGetter__('width', function() {
            return this._width;
        });

        bgsim.Size.prototype.__defineSetter__('width', function(width) {
            this.half_width = width / 2;
            return this._width = width;
        });

        bgsim.Size.prototype.__defineGetter__('height', function() {
            return this._height;
        });

        bgsim.Size.prototype.__defineSetter__('height', function(height) {
            this.half_height = height / 2;
            return this._height = height;
        });

        bgsim.Size.prototype.toString = function() {
            return '[' + this.width + ',' + this.height + ']';
        };
    }

    bgsim.Rectangle = function (x, y, width, height)
    {
        this.point = new bgsim.Point(x, y);
        this.size = new bgsim.Size(width, height);
    }
    {

        bgsim.Rectangle.prototype.toString = function() {
            return '[' + this.point + ',' + this.size + ']';
        };
    }

    bgsim.Image = function (image, options)
    {
        if (options === undefined) {
            options = {}
        }

        this.size = new bgsim.Size(options.width, options.height);
        this.crip = new bgsim.Point(0, 0);
        this.image = this.loadImage(image);
        this.sprites = options.sprites || [1, 1];

        if (!options.width || !options.height) {
            var self = this;
            var onload = function () {
                if (!options.width) {
                    self.size.width = this.width / self.sprites[0];
                }
                if (!options.height) {
                    self.size.height = this.height / self.sprites[1];
                }
            };
            if (this.image.complete) {
                onload.call(this.image);
            }
            this.image.addEventListener('load', onload);
        }
    }
    {
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

        bgsim.Image.create = function (image)
        {
            if (image instanceof bgsim.Image) {
                return image;
            } else {
                return new bgsim.Image(image);
            }
        }

        bgsim.Image.prototype.draw = function(context, sprite, size) {
            var cripX = 0;
            var cripY = 0;
            if (sprite) {
                cripX = this.size.width * (sprite % this.sprites[0]);
                cripY = this.size.height * (Math.floor(sprite / this.sprites[0]) % this.sprites[1]);
            }
            context.drawImage(this.image, cripX, cripY, this.size.width, this.size.height, -size.width/2, -size.height/2, size.width, size.height);
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

        this.color = options.color || 'rgba(255, 70, 70, 0.5)';
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
        this.private = !!options.private;

        if (options.rectangle) {
            this.rectangle = options.rectangle;
        } else {
            var x = options.x || 0;
            var y = options.y || 0;
            var width = options.width || 100;
            var height = options.height || 100;
            this.rectangle = new bgsim.Rectangle(x, y, width, height);
        }
        this.zoom = options.zoom || 1;
        this.angle = options.angle || 0;

        this.layer = options.layer;

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
    }
    {
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
                    parent.remove(this);
                    parent.add(this);
                }
                return parent;
            }

            if (!parent.containable) {
                return parent;
            }

            if (this._parent) {
                this._parent.remove(this);
            }
            if (parent) {
                parent.add(this);
            }

            return this._parent = parent;
        });

        bgsim.Component.prototype.add = function (component)
        {
            if (component._parent) {
                var gp = this.getAllLocalPoint(component.rectangle.point);
                component.rectangle.point = gp;
            }

            this.children.push(component);
            this.trigger('added', component);
        };

        bgsim.Component.prototype.remove = function (component)
        {
            var gp = this.getAllGlobalPoint(component.rectangle.point);
            component.rectangle.point = gp;

            var index = this.children.indexOf(component);
            this.children.splice(index, 1);
            this.trigger('removed', component);
        };

        bgsim.Component.prototype.draw = function (contexts)
        {
            for (var i = 0; i < contexts.length; i++) {
                var context = contexts[i];
                context.save();
                this.rectangle.point.translate(context);
                context.rotate(this.angle * Math.PI / 180);
                context.scale(this.zoom, this.zoom);
            };

            this._draw(contexts);
            if (this.focus) {
                this.drawContext(contexts).fillStyle = 'rgba(255, 255, 255, 0.7)';
                this.drawContext(contexts).fillRect(-this.rectangle.size.half_width, -this.rectangle.size.half_height, this.rectangle.size.width, this.rectangle.size.height);
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

        bgsim.Component.prototype.getComponentFromPoint = function (point, callback)
        {
            var localPoint = this.getLocalPoint(point);

            for (var i = this.children.length; i--;) {
                var child = this.children[i];
                if (child.floating) {
                    continue;
                }
                var component = child.getComponentFromPoint(localPoint, callback);
                if (component != null) {
                    return component;
                }
            }

            if (this.within(localPoint) && (!callback || callback.call(this, this))) {
                return {component: this, point: point};
            }

            return;
        }

        bgsim.Component.prototype.within = function (point)
        {
            return (point.x >= -this.rectangle.size.half_width && point.x <= this.rectangle.size.half_width &&
                    point.y >= -this.rectangle.size.half_height && point.y <= this.rectangle.size.half_height);
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
            var innerX = (point.x - this.rectangle.point.x) / this.zoom;
            var innerY = (point.y - this.rectangle.point.y) / this.zoom;
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

            x += this.rectangle.point.x;
            y += this.rectangle.point.y;

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
                    delete eventHandlers[i];
                }
            }
        };

        bgsim.Component.prototype.one = function (event, handler)
        {
            var tempHandler = function () {
                handler.call(this);
                this.off(event, tempHandler);
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

            var result = false;
            eventHandlers.forEach(function (eventHandler) {
                result = eventHandler.apply(this, args) || result;
            }, this);
            return result;
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
                    return this.sendEventTouchEnd(point);

                case 'touchcancel':
                    return false;
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
                this.touchData.moving = {
                    x: this.rectangle.point.x - point.x,
                    y: this.rectangle.point.y - point.y,
                };

                // タップが無効なら即座に移動判定開始
                if (!this.tappable) {
                    this.sendEventTouchDragStart();
                }

                var i = this.parent.children.indexOf(this);
                this.parent.children.splice(i, 1);
                this.parent.children.push(this);
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
            if (this.touchData.tapping) {
                // 移動したらタップ判定を終了し、移動判定開始
                this.touchData.tapping = (
                    Math.abs(this.touchData.moving.x - (this.rectangle.point.x - point.x)) <= 15 &&
                    Math.abs(this.touchData.moving.y - (this.rectangle.point.y - point.y)) <= 15
                );
                if (this.touchData.tapping) {
                    return;
                } else {
                    this.sendEventTouchDragStart();
                }
            }

            // 移動判定開始していれば移動させる
            this.rectangle.point.x = this.touchData.moving.x + point.x;
            this.rectangle.point.y = this.touchData.moving.y + point.y;
            // 移動先がcontainableならフォーカスさせる
            var gp = this.parent.getAllGlobalPoint(point);
            var component = bgsim.Game.getComponentFromPoint(gp, function (component) {
                return component.containable;
            });
            if (component) {
                if (this.touchData.focused) {
                    this.touchData.focused.focus = false;
                }
                component.component.focus = true;
                this.touchData.focused = component.component;
            }

            return;
        };

        bgsim.Component.prototype.sendEventTouchEnd = function (point)
        {
            // タップ判定が継続したらタップ処理を行う
            if (this.touchData.tapping) {
                // ホールド判定を除去
                window.clearTimeout(this.touchData.holding);

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
            } else if (this.touchData.moving) {
                // 移動先がフォーカスされていれば移動させる
                if (this.touchData.focused) {
                    this.parent = this.touchData.focused;
                    this.touchData.focused.focus = false;
                }
            }

            this.touchData.moving = null;
            this.floating = false;

            return false;
        };

        bgsim.Component.prototype.sendEventTouchDragStart = function () {
            this.floating = true;

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

            if (!this.trigger(name)) {
                if (this[name]) {
                    this[name].call(this);
                }
            }
        };
    }

    // class Board extends Component
    bgsim.Board = function (image, options)
    {
        if (!options) {
            options = {}
        }
        if (options.doubletappable == undefined) {
            options.doubletappable = false;
        }

        bgsim.Component.call(this, options);
        this.image = bgsim.Image.create(image);
        this.sprite = options.sprite;
    }
    {
        util.inherits(bgsim.Board, bgsim.Component);

        bgsim.Board.prototype._draw = function (contexts)
        {
            this.image.draw(this.drawContext(contexts), this.sprite, this.rectangle.size);
        };

        bgsim.Board.prototype.__defineSetter__('image', function (image) {
            if (this._image == image) {
                return;
            }

            var base_size = this.rectangle.size;
            this._image = image;
            this.rectangle.size = image.size;
            if (this.rectangle.size.width == undefined) {
                this.rectangle.size.width = base_size.width;
            }
            if (this.rectangle.size.height == undefined) {
                this.rectangle.size.height = base_size.height;
            }
        });

        bgsim.Board.prototype.__defineGetter__('image', function() {
            return this._image;
        });
    }

    // class Card extends Board
    bgsim.Card = function (frontImage, backImage, options)
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
        bgsim.Board.call(this, frontImage, options);

        this.backImageRaw = backImage;
        this.backImage = this.frontImage = this.image;
        this.frontSprite = this.sprite;
        if (typeof backImage === 'number' || backImage instanceof Number) {
            this.backSprite = backImage;
        } else {
            this.backImage = bgsim.Image.create(backImage);
            this.backSprite = undefined;
        }

        this.back = !!options.back;

        this._sleep = false;
        this.sleep = !!options.sleep;
    }
    {
        util.inherits(bgsim.Card, bgsim.Board);

        bgsim.Card.prototype.copy = function ()
        {
            return new bgsim.Card(this.image, this.backImageRaw, {
                x: this.rectangle.point.x,
                y: this.rectangle.point.y,
                width: this.rectangle.size.width,
                height: this.rectangle.size.height,
                movable: this.movable,
                tappable: this.tappable,
                doubletappable: this.doubletappable,
                holdable: this.holdable,
                back: this.back,
                sleep: this.sleep,
                sprite: this.sprite,
            });
        };

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

            if (!this.private) {
                context.fillStyle = this.player.color;
                context.fillRect(-this.rectangle.size.half_width-4, -this.rectangle.size.half_height-4, this.rectangle.size.width+8, this.rectangle.size.height+8);
            }

            if (this.back || (this.private && this.player.private)) {
                this.backImage.draw(context, this.backSprite, this.rectangle.size);
            } else {
                this.frontImage.draw(context, this.frontSprite, this.rectangle.size);
            }
        };
    }

    // class Label extends Component
    bgsim.Label = function (value, options)
    {
        if (!options) {
            options = {}
        }
        if (options.doubletappable == undefined) {
            options.doubletappable = false;
        }

        bgsim.Component.call(this, options);

        this.value = value;
        this.source = options.source;
    }
    {
        util.inherits(bgsim.Label, bgsim.Component);

        bgsim.Label.prototype._draw = function (contexts)
        {
            var context = this.drawContext(contexts);

            if (this.source && this.source instanceof bgsim.Image) {
                this.source.draw(context, this.value, this.rectangle.size);
            } else {
                context.save();
                context.fillStyle = '#fff';
                context.fillRect(-this.rectangle.size.half_width, -this.rectangle.size.half_height, this.rectangle.size.width, this.rectangle.size.height);
                context.strokeStyle = '#000';
                context.strokeRect(-this.rectangle.size.half_width, -this.rectangle.size.half_height, this.rectangle.size.width, this.rectangle.size.height);
                context.font = '80px monospace';
                context.textAlign = 'center';
                context.fillStyle = '#000';
                if (this.source instanceof Array && this.source[this.value] !== undefined) {
                    context.fillText(this.source[this.value], 0, 30, this.rectangle.size.width);
                } else {
                    context.fillText(this.value, 0, 30, this.rectangle.size.width);
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

        bgsim.Label.call(this, null, options);

        this._min = 0;
        this.range = 0;
        this.max = options.max || 20;
        this.min = options.min || 0;
        this.step = options.step || -1;
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
            var x = this.rectangle.point.x;
            var y = this.rectangle.point.y;
            var angle = this.angle;

            var rolling = function(count) {
                if (count < 0) {
                    self.rectangle.point.x = x;
                    self.rectangle.point.y = y;
                    self.angle = angle;
                    return;
                }

                self.next();
                if (self.jiggle > 0) {
                    self.rectangle.point.x = x + util.getRandom(-self.jiggle, self.jiggle);
                    self.rectangle.point.y = y + util.getRandom(-self.jiggle, self.jiggle);
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

        this.color = options.color;
    }
    {
        util.inherits(bgsim.Area, bgsim.Component);

        bgsim.Area.prototype._draw = function (contexts)
        {
            if (this.color) {
                var context = this.drawContext(contexts);
                context.save();
                context.fillStyle = this.color;
                context.fillRect(-this.rectangle.size.half_width, -this.rectangle.size.half_height, this.rectangle.size.width, this.rectangle.size.height);
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
            var spacing_x = (options.spacing_x == undefined) ? this.rectangle.size.width : options.spacing_x;
            var spacing_y = (options.spacing_y == undefined) ? this.rectangle.size.height : options.spacing_y;
            this.spacing = new bgsim.Point(spacing_x, spacing_y);
        }
        this.thick = options.thick || 0;
    }
    {
        util.inherits(bgsim.SortedArea, bgsim.Area);

        bgsim.SortedArea.prototype.add = function(component)
        {
            bgsim.Area.prototype.add.call(this, component);
            this.reorder();
        };

        bgsim.SortedArea.prototype.remove = function(component)
        {
            bgsim.Area.prototype.remove.call(this, component);
            this.reorder();
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
            base.x = (this.padding.x - this.rectangle.size.half_width) * order.x;
            base.y = (this.padding.y - this.rectangle.size.half_height) * order.y;

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
                    var component_size = (this.rectangle.size[sdir] - this.padding[pdir] * 2) - first_child.rectangle.size[hsdir] - last_child.rectangle.size[hsdir];
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

                component.rectangle.point.x = base.x + (i * spacing.x) + (component.rectangle.size.half_width * order.x);
                component.rectangle.point.y = base.y + (i * spacing.y) + (component.rectangle.size.half_height * order.y);
            };
        };
    }

    // class Deck extends Area
    bgsim.Deck = function (options)
    {
        if (options === undefined) {
            options = {}
        }
        bgsim.Area.call(this, options);

        this.back = !!options.back;
        this.thick = options.thick || 0;
    }
    {
        util.inherits(bgsim.Deck, bgsim.Area);

        bgsim.Deck.prototype.build = function (card, count, callback)
        {
            for (var index = 0; index < count; index++) {
                var copyCard = card.copy();
                if (callback) {
                    callback.call(copyCard, index);
                }
                copyCard.parent = this;
            };
            this.shuffle();
            this.reset();
        };

        bgsim.Deck.prototype.reset = function ()
        {
            var y = -this.children.length*this.thick;
            for (var i = this.children.length; i--;) {
                var card = this.children[i];
                card.rectangle.point.x = 0;
                card.rectangle.point.y = y;
                y += this.thick;
                card.back = this.back;
                card.private = this.private;
            }
        };

        bgsim.Deck.prototype.shuffle = function ()
        {
            for (var dst = this.children.length; dst--;) {
                var src = util.getRandom(dst);
                var card = this.children[dst];
                this.children[dst] = this.children[src];
                this.children[src] = card;
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

        Game.prototype.start = function (canvas, init)
        {
            this.canvas = canvas;
            this.context = this.canvas.getContext('2d');
            this.zoom = window.devicePixelRatio/2;
            this.listeningComponent = {};
            this.init = init;

            canvas.style.width = window.innerWidth + 'px';
            canvas.style.height = window.innerHeight + 'px';
            canvas.width = window.innerWidth * window.devicePixelRatio;
            canvas.height = window.innerHeight * window.devicePixelRatio;

            this.rectangle.point.x = canvas.width/2;
            this.rectangle.point.y = canvas.height/2;

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
            events.forEach(function(data) {
                self.canvas.addEventListener(data[0], function(e){ return data[1].call(self, e); }, false);
            });

            // 画像レイヤーを3枚追加
            // 最前面はドラッグしているコンポーネント用
            // 0.背景、1.ボード、2.カード、3.ドラッグ用を想定
            this.layers = [];
            this.contexts = [
                this.context,
            ];
            for (var i = 0; i < 3; i++) {
                var layer = document.createElement("canvas");
                layer.width = this.canvas.width;
                layer.height = this.canvas.height;
                this.layers.push(layer);
                this.contexts.push(layer.getContext('2d'));
            };

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
                this.contexts[i].clearRect(0, 0, this.canvas.width, this.canvas.height);
            }
            bgsim.Component.prototype.draw.call(this, this.contexts);
            for (var i = 0; i < this.layers.length; i++) {
                this.context.drawImage(this.layers[i], 0, 0);
            }

            var self = this;
            window.requestAnimationFrame(function(){ self.draw(); });
        };

        Game.prototype.within = function (point)
        {
            return true;
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
                component = this.getComponentFromPoint(point);
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
