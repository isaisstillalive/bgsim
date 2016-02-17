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
        this.draggable = !!options.draggable;
        this.holdable = !!options.holdable;
        this.doubletappable = !!options.doubletappable;

        if (options.containable == undefined) {
            this.containable = true;
        } else {
            this.containable = options.containable;
        }

        this.eventHandlers = {};
        this.control = {};
        this.children = [];

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
            var gp = this.rectangle.point;
            if (this._parent == parent) {
                return parent;
            }

            if (!parent.containable) {
                return parent;
            }

            if (this._parent) {
                this._parent.remove(this);

                gp = this._parent.getAllGlobalPoint(gp);
            }
            if (parent) {
                parent.add(this);

                if (this._parent) {
                    gp = parent.getAllLocalPoint(gp);
                }
            }

            this.rectangle.point = gp;
            return this._parent = parent;
        });

        bgsim.Component.prototype.add = function (component)
        {
            this.children.push(component);
            this.trigger('added', component);
        };

        bgsim.Component.prototype.remove = function (component)
        {
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

            console.log('lp', result.toString(), this);
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
            console.log('trigger', event, eventHandlers);
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
            this.control.isClick = true;
            this.floating = true;

            var self = this;
            if (this.holdable) {
                this.control.holding = window.setTimeout(function(){
                    self.control.holding = null;
                    self.control.draging = null;
                    self.control.isClick = null;
                    if (!self.trigger('hold')) {
                        self.hold();
                    }
                }, 500);
            }

            if (this.draggable) {
                this.control.draging = {
                    x: this.rectangle.point.x - point.x,
                    y: this.rectangle.point.y - point.y,
                };
                var i = this.parent.children.indexOf(this);
                this.parent.children.splice(i, 1);
                this.parent.children.push(this);
            } else {
                this.control.draging = null;
            }

            console.log('dragstart', point, this.rectangle);

            return true;
        };

        bgsim.Component.prototype.sendEventTouchMove = function (point)
        {
            if (this.control.draging == null) {
                return;
            }

            if (this.control.isClick) {
                this.control.isClick = this.tappable && (
                    Math.abs(this.control.draging.x - (this.rectangle.point.x - point.x)) <= 15 &&
                    Math.abs(this.control.draging.y - (this.rectangle.point.y - point.y)) <= 15
                );
                if (this.control.isClick) {
                    return;
                } else {
                    window.clearTimeout(this.control.holding);
                    this.control.holding = null;
                    this.trigger('dragstart');
                }
            }

            this.rectangle.point.x = this.control.draging.x + point.x;
            this.rectangle.point.y = this.control.draging.y + point.y;
            var gp = this.parent.getAllGlobalPoint(point);
            var component = bgsim.Game.getComponentFromPoint(gp, function (component) {
                return component.containable;
            });
            if (component) {
                if (this.control.focused) {
                    this.control.focused.focus = false;
                }
                component.component.focus = true;
                this.control.focused = component.component;
            }

            console.log('dragmove', point, this.rectangle);
            // console.log(this.control.dragBaseX, this.control.dragBaseY);
            // console.log(point);
            // console.log(this.rectangle);
            return;
        };

        bgsim.Component.prototype.sendEventTouchEnd = function (point)
        {
            if (this.control.draging) {
                if (this.control.focused) {
                    this.parent = this.control.focused;
                    this.control.focused.focus = false;
                }
            }
            this.control.draging = null;
            this.floating = false;

            if (this.control.isClick) {
                window.clearTimeout(this.control.holding);
                this.control.holding = null;
                if (this.doubletap) {
                    if (this.control.clicking == null) {
                        var self = this;
                        this.control.clicking = window.setTimeout(function(){
                            self.control.clicking = null;
                            if (!self.trigger('tap')) {
                                self.tap();
                            }
                        }, 300);
                    } else {
                        window.clearTimeout(this.control.clicking);
                        this.control.clicking = null;
                        if (!this.trigger('doubletap')) {
                            this.doubletap();
                        }
                    }
                } else {
                    if (!this.trigger('tap')) {
                        this.tap();
                    }
                }
            }
            return false;
        };

        bgsim.Component.prototype.hold = function ()
        {
        };

        bgsim.Component.prototype.tap = function ()
        {
        };

        bgsim.Component.prototype.doubletap = function ()
        {
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
            this._image = image;
            this.rectangle.size = image.size;
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
                x: this.x,
                y: this.y,
                draggable: this.draggable,
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
            console.log('doubletap', this.private);
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
            console.log('counter_tap');
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
            console.log('dice_tap');
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

    bgsim.Area = function (options)
    {
        if (options === undefined) {
            options = {}
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
            // console.log(point.toString());
            this.sendEvent(0, point, e);
            // $('#console').val('mouse:' + e.type);
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
                // console.log('usecache:'+id);
                // $('#console').val('usecache:' + id);

                component = this.listeningComponent[id];
                point = component.parent.getAllLocalPoint(point);
            }

            if (component != null) {
                var result = component.sendEvent(id, point, e);
                if (result === true) {
                    // console.log('cache:'+id);
                    // $('#console').val('cache:' + id);
                    this.listeningComponent[id] = component;
                } else if (result === false) {
                    // console.log('discache:'+id);
                    // $('#console').val('discache:' + id);
                    delete this.listeningComponent[id];
                }
                return result;
            }

            return;
        };
    }
    bgsim.Game = new Game();
})(window);
