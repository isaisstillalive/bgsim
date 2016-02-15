(function(window){
    "use strict";

    var isTouch = ('ontouchstart' in window);

    window.bgsim = {};

    function inherits (childCtor, parentCtor) {
        /** @constructor */
        function tempCtor() {};
        tempCtor.prototype = parentCtor.prototype;
        childCtor.superClass_ = parentCtor.prototype;
        childCtor.prototype = new tempCtor();
        /** @override */
        childCtor.prototype.constructor = childCtor;
    }

    if (isTouch) {
        window.addEventListener('load', function () {
            var cons = document.getElementById('console');
            if (cons) {
                var rows = cons.getAttribute('rows')-1 || 1;
                console.log = function (val) {
                    var l = cons.innerHTML.split("\n", rows);
                    cons.innerHTML = val + "\n" + l.join("\n");
                }
            }
        });
    }

    var Point = function (x, y)
    {
        this.x = x;
        this.y = y;
    }
    {
        Point.defineAccessor = function(klass)
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

        Point.prototype.translate = function(context) {
            context.translate(this.x, this.y);
        };
    }

    var Size = function (width, height)
    {
        this.width = width;
        this.height = height;
    }
    {
        Size.defineAccessor = function(klass)
        {
            klass.prototype.__defineGetter__('width', function() {
                return this.size.width;
            });

            klass.prototype.__defineSetter__('width', function(width) {
                return this.size.width = width;
            });

            klass.prototype.__defineGetter__('height', function() {
                return this.size.height;
            });

            klass.prototype.__defineSetter__('height', function(height) {
                return this.size.height = height;
            });
        };
    }

    var Rectangle = bgsim.Rectangle = function (x, y, width, height)
    {
        this.point = new Point(x, y);
        this.size = new Size(width, height);
    }
    {
        Point.defineAccessor(Rectangle);
        Size.defineAccessor(Rectangle);

        Rectangle.prototype.__defineGetter__('half_width', function() {
            return this.width / 2;
        });

        Rectangle.prototype.__defineGetter__('half_height', function() {
            return this.height / 2;
        });
    }

    bgsim.Image = function (image, options)
    {
        if (options === undefined) {
            options = {}
        }

        this.size = new Size(options.width, options.height);
        this.crip = new Point(0, 0);
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
        Size.defineAccessor(bgsim.Image);

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
            context.drawImage(this.image, cripX, cripY, this.width, this.height, -size.width/2, -size.height/2, size.width, size.height);
        };
    }

    // class Player
    var Player = bgsim.Player = function (options)
    {
        if (options === undefined) {
            options = {}
        }

        this.name = options.name || 'player';
        this.angle = options.angle || 0;
        this.point = options.point || new Point();
        this.private = !!options.private;
    }
    {
        bgsim.Player.Empty = new bgsim.Player();

        Player.prototype.translate = function(context) {
            // context.translate(this.x, this.y);
            context.rotate(this.angle * Math.PI / 180);
        };
    }

    // class Component
    var Component = function (options)
    {
        if (options === undefined) {
            options = {}
        }

        this._player = options.player;
        this.parent = null;
        this.private = !!options.private;

        if (options.rectangle) {
            this.rectangle = options.rectangle;
        } else {
            var x = options.x || 0;
            var y = options.y || 0;
            var width = options.width || 100;
            var height = options.height || 100;
            this.rectangle = new Rectangle(x, y, width, height);
        }
        this.zoom = options.zoom || 1;
        this.angle = options.angle || 0;

        this.draggable = !!options.draggable;
        this.doubletapable = !!options.doubletapable;

        this.eventListeners = {};
        this.control = {};
    }
    {
        Component.prototype.__defineGetter__('player', function () {
            if (this._player) {
                return this._player;
            }
            if (this.parent) {
                return this.parent.player;
            }
            return bgsim.Player.Empty;
        });

        Component.prototype.draw = function (context)
        {
            context.save();
            if (this._player) {
                this._player.translate(context);
            }
            this.rectangle.point.translate(context);
            context.rotate(this.angle * Math.PI / 180);
            context.scale(this.zoom, this.zoom);
            this._draw(context);
            context.restore();
        };


        Component.prototype.getComponentFromPoint = function (point)
        {
            var localPoint = this.getLocalPoint(point);
            if (this.within(localPoint)) {
                return {component: this, point: point};
            }
        }

        Component.prototype.within = function (point)
        {
            return (point.x >= -this.rectangle.half_width && point.x <= this.rectangle.half_width &&
                    point.y >= -this.rectangle.half_height && point.y <= this.rectangle.half_height);
        };

        Component.prototype.getAllLocalPoint = function (point, finding)
        {
            var localPoint = point;
            if (this.parent != null) {
                localPoint = this.parent.getAllLocalPoint(point, true);
            }
            if (finding) {
                return this.getLocalPoint(localPoint);
            } else {
                return localPoint;
            }
        };

        Component.prototype.getLocalPoint = function (point)
        {
            var innerX = (point.x - this.rectangle.x) / this.zoom;
            var innerY = (point.y - this.rectangle.y) / this.zoom;

            var angle = this.angle;
            if (this._player) {
                angle += this._player.angle;
            }
            angle = (360 + (angle % 360)) % 360;
            if (angle == 0) {
                return new Point(innerX, innerY);
            } else if (angle == 90) {
                return new Point(innerY, -innerX);
            } else if (angle == 180) {
                return new Point(-innerX, -innerY);
            } else if (angle == 270) {
                return new Point(-innerY, innerX);
            }

            var r = Math.atan2(innerY, innerX);
            var l = innerX / Math.cos(r);
            var r2 = r - this.angle * Math.PI / 180;
            innerX = l * Math.cos(r2);
            innerY = l * Math.sin(r2);

            return new Point(innerX, innerY);
        };

        Component.prototype.addEventListener = function (type, listener)
        {
            this.eventListeners[type] = this.eventListeners[type] || []
            this.eventListeners[type].push(listener);
        };

        Component.prototype.removeEventListener = function (type, listener)
        {
            var listeners = this.eventListeners[type];
            if (!listeners) {
                return;
            }

            for (var i = listeners.length; i--;) {
                if (listeners[i] == listener) {
                    delete listeners[i];
                }
            }
        };

        Component.prototype.dispatchEvent = function (type)
        {
            var listeners = this.eventListeners[type];
            console.log('dispatchEvent', type, listeners);
            if (!listeners) {
                return;
            }

            listeners.forEach(function (listener) {
                listener.call(this);
            }, this);
        };

        Component.prototype.sendEvent = function (id, point, e)
        {
            switch (e.type) {
                case 'mousedown':
                case 'touchstart':
                    return this.sendEventDragStart(point);

                case 'mousemove':
                case 'touchmove':
                    return this.sendEventDragMove(point);

                case 'mouseup':
                case 'touchend':
                    return this.sendEventDragEnd(point);

                case 'touchcancel':
                    return false;
            }
        };

        Component.prototype.sendEventDragStart = function (point)
        {
            this.control.isClick = true;

            var self = this;
            this.control.holding = window.setTimeout(function(){
                self.control.holding = null;
                self.control.draging = null;
                self.control.isClick = null;
                self.hold();
            }, 500);

            if (this.draggable) {
                this.control.draging = {
                    x: this.rectangle.x - point.x,
                    y: this.rectangle.y - point.y,
                };
                var i = this.parent.components.indexOf(this);
                this.parent.components.splice(i, 1);
                this.parent.components.push(this);
            } else {
                this.control.draging = null;
            }

            console.log('dragstart', point, this.rectangle);

            return true;
        };

        Component.prototype.sendEventDragMove = function (point)
        {
            if (this.control.draging == null) {
                return;
            }

            if (this.control.isClick) {
                this.control.isClick = (
                    Math.abs(this.control.draging.x - (this.rectangle.x - point.x)) <= 15 &&
                    Math.abs(this.control.draging.y - (this.rectangle.y - point.y)) <= 15
                );
                if (this.control.isClick) {
                    return;
                } else {
                    window.clearTimeout(this.control.holding);
                    this.control.holding = null;
                    this.dispatchEvent('dragstart');
                }
            }

            this.rectangle.x = this.control.draging.x + point.x;
            this.rectangle.y = this.control.draging.y + point.y;

            console.log('dragmove', point, this.rectangle);
            // console.log(this.control.dragBaseX, this.control.dragBaseY);
            // console.log(point);
            // console.log(this.rectangle);
            return;
        };

        Component.prototype.sendEventDragEnd = function (point)
        {
            this.control.draging = null;

            if (this.control.isClick) {
                window.clearTimeout(this.control.holding);
                this.control.holding = null;
                if (this.doubletap) {
                    if (this.control.clicking == null) {
                        var self = this;
                        this.control.clicking = window.setTimeout(function(){
                            self.control.clicking = null;
                            self.tap();
                        }, 300);
                    } else {
                        window.clearTimeout(this.control.clicking);
                        this.control.clicking = null;
                        this.doubletap();
                    }
                } else {
                    this.tap();
                }
            }
            return false;
        };

        Component.prototype.hold = function ()
        {
        };

        Component.prototype.tap = function ()
        {
        };

        Component.prototype.doubletap = function ()
        {
        };
    }

    // class ComponentSet extends Component
    var ComponentSet = bgsim.ComponentSet = function (options)
    {
        Component.call(this, options);

        this.backgroundColor = options.backgroundColor || null;

        this.components = [];
    }
    {
        inherits(ComponentSet, Component);

        ComponentSet.prototype.push = function (component)
        {
            this.components.push(component);
            component.parent = this;
        };

        ComponentSet.prototype._draw = function (context)
        {
            if (this.backgroundColor != null) {
                context.save();
                context.fillStyle = this.backgroundColor;
                context.fillRect(-this.rectangle.half_width, -this.rectangle.half_height, this.rectangle.width, this.rectangle.height);
                context.strokeRect(0, 0, this.rectangle.half_width, this.rectangle.half_height);
                context.restore();
            }

            for (var i = 0; i < this.components.length; i++) {
                this.components[i].draw(context);
            }
        };

        ComponentSet.prototype.getComponentFromPoint = function (point)
        {
            var localPoint = this.getLocalPoint(point);

            for (var i = this.components.length; i--;) {
                var component = this.components[i].getComponentFromPoint(localPoint);
                if (component != null) {
                    return component;
                }
            }

            return;
        }
    }

    // class Game extends ComponentSet
    var Game = function ()
    {
        var options = {
            zoom: 1,
        }
        ComponentSet.call(this, options);
    }
    {
        inherits(Game, ComponentSet);

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

            this.rectangle.x = canvas.width/2;
            this.rectangle.y = canvas.height/2;
            this.rectangle.width = window.innerWidth;
            this.rectangle.height = window.innerHeight;
            // $('#console').val('game:' + this.rectangle.x + ', ' + this.rectangle.y);

            var events = [];
            if (isTouch) {
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

            this.init();
            this.draw();
        };


        Game.prototype.reset = function ()
        {
            for (var i = this.components.length; i--;) {
                this.components[i];
            }
            this.components = [];
            this.init();
        }

        Game.prototype.draw = function ()
        {
            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
            ComponentSet.prototype.draw.call(this, this.context);
            var self = this;
            window.requestAnimationFrame(function(){ self.draw(); });
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

                var point = new Point(x, y);
                this.sendEvent(touch.identifier, point, e2);
                $('#console').val('touch:' + e.type);
            }
        };

        Game.prototype.mouseEventSender = function (e)
        {
            var point = new Point(e.offsetX, e.offsetY);
            this.sendEvent(0, point, e);
            $('#console').val('mouse:' + e.type);
        };

        Game.prototype.sendEvent = function (id, point, e)
        {
            var component = null;

            if (this.listeningComponent[id] == undefined) {
                component = this.getComponentFromPoint(point);
                if (component != null) {
                    point = component.point;
                    component = component.component;
                    for (var i in this.listeningComponent) {
                        if (this.listeningComponent[i] === component) {
                            return;
                        }
                    };
                }
            } else {
                console.log('usecache:'+id);
                $('#console').val('usecache:' + id);

                component = this.listeningComponent[id];
                point = component.getAllLocalPoint(point);
            }

            if (component != null) {
                var result = component.sendEvent(id, point, e);
                if (result === true) {
                    console.log('cache:'+id);
                    $('#console').val('cache:' + id);
                    this.listeningComponent[id] = component;
                } else if (result === false) {
                    console.log('discache:'+id);
                    $('#console').val('discache:' + id);
                    delete this.listeningComponent[id];
                }
                return result;
            }

            return;
        };
    }

    // class Label extends Component
    var Label = bgsim.Label = function (text, options)
    {
        if (!options) {
            options = {}
        }
        if (options.doubletapable == undefined) {
            options.doubletapable = false;
        }

        Component.call(this, options);
        this.text = text;
        // this.sprite = options.sprite;
    }
    {
        inherits(Label, Component);

        Label.prototype._draw = function (context)
        {
            context.save();
            context.fillStyle = '#fff';
            context.fillRect(-this.rectangle.half_width, -this.rectangle.half_height, this.rectangle.width, this.rectangle.height);
            context.strokeStyle = '#000';
            context.strokeRect(-this.rectangle.half_width, -this.rectangle.half_height, this.rectangle.width, this.rectangle.height);
            context.font = '80px monospace';
            context.textAlign = 'center';
            context.fillStyle = '#000';
            context.fillText(this.text, 0, 30, this.rectangle.width);
            context.restore();
        };
    }

    // class Board extends Component
    var Board = bgsim.Board = function (image, options)
    {
        if (!options) {
            options = {}
        }
        if (options.doubletapable == undefined) {
            options.doubletapable = false;
        }

        Component.call(this, options);
        this.image = bgsim.Image.create(image);
        this.sprite = options.sprite;
    }
    {
        inherits(Board, Component);

        Board.prototype._draw = function (context)
        {
            this.image.draw(context, this.sprite, this.rectangle.size);
        };

        Board.prototype.__defineSetter__('image', function (image) {
            if (this._image == image) {
                return;
            }
            this._image = image;
            this.rectangle.size = image.size;
        });

        Board.prototype.__defineGetter__('image', function() {
            return this._image;
        });
    }

    // class Card extends Board
    var Card = bgsim.Card = function (frontImage, backImage, options)
    {
        if (!options) {
            options = {}
        }
        if (options.doubletapable == undefined) {
            options.doubletapable = true;
        }
        Board.call(this, frontImage, options);

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
        inherits(Card, Board);

        Card.prototype.copy = function ()
        {
            return new Card(this.image, this.backImageRaw, {
                x: this.x,
                y: this.y,
                draggable: this.draggable,
                back: this.back,
                sleep: this.sleep,
                sprite: this.sprite,
            });
        };

        Card.prototype.hold = function ()
        {
            this.back = !this.back;
        };

        Card.prototype.tap = function ()
        {
            this.sleep = !this.sleep;
        };

        Card.prototype.doubletap = function ()
        {
            this.private = !this.private;
            console.log('doubletap', this.private);
        };

        Card.prototype.__defineSetter__('sleep', function (sleep) {
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

        Card.prototype.__defineGetter__('sleep', function() {
            return this._sleep;
        });

        Card.prototype._draw = function (context)
        {
            if (!this.private) {
                context.fillStyle = 'rgba(255, 70, 70, 0.5)';
                context.fillRect(-this.rectangle.half_width-4, -this.rectangle.half_height-4, this.rectangle.width+8, this.rectangle.height+8);
            }

            if (this.back || (this.private && this.player.private)) {
                this.backImage.draw(context, this.backSprite, this.rectangle.size);
            } else {
                this.frontImage.draw(context, this.frontSprite, this.rectangle.size);
            }
        };
    }

    // class Deck extends ComponentSet
    var Deck = bgsim.Deck = function (cards, options)
    {
        if (options === undefined) {
            options = {}
        }
        ComponentSet.call(this, options);

        this.back = !!options.back;
        this.thick = options.thick || 0;

        var copyFunc = options.copy || function(i, card){};

        var count = 0;
        for (var i = 0; i < cards.length; i++) {
            var card = cards[i][0];
            for (var c = cards[i][1]; c--;) {
                var copyCard = card.copy();
                copyFunc.call(copyCard, count++, card);
                this.push(copyCard);
            };
        }

        this.shuffle();
        this.reset();
    }
    {
        inherits(Deck, ComponentSet);

        Deck.prototype.reset = function ()
        {
            var y = -this.components.length*this.thick;
            for (var i = this.components.length; i--;) {
                var card = this.components[i];
                card.rectangle.x = 0;
                card.rectangle.y = y;
                y += this.thick;
                card.back = this.back;
                card.private = this.private;
            }
        };

        Deck.prototype.shuffle = function ()
        {
            for (var dst = this.components.length; dst--;) {
                var src = Math.floor(Math.random() * (dst + 1));
                var card = this.components[dst];
                this.components[dst] = this.components[src];
                this.components[src] = card;
            }
        };
    }

    // class Counter extends Component
    var Counter = bgsim.Counter = function (options)
    {
        if (options === undefined) {
            options = {}
        }
        options.width = options.width || 50;
        options.height = options.height || 50;
        options.doubletapable = false;
        Component.call(this, options);

        this._min = 0;
        this.range = 0;
        this.max = options.max || 20;
        this.min = options.min || 0;
        this.step = options.step || -1;
        this.current = options.current || (this.step > 0 ? this.min : this.max);
        this.source = options.source;
    }
    {
        inherits(Counter, Component);

        Counter.prototype._draw = function (context)
        {
            if (this.source && this.source instanceof bgsim.Image) {
                this.source.draw(context, this.current, this.rectangle.size);
            } else {
                context.save();
                context.fillStyle = '#fff';
                context.fillRect(-this.rectangle.half_width, -this.rectangle.half_height, this.rectangle.width, this.rectangle.height);
                context.strokeStyle = '#000';
                context.strokeRect(-this.rectangle.half_width, -this.rectangle.half_height, this.rectangle.width, this.rectangle.height);
                context.font = '80px monospace';
                context.textAlign = 'center';
                context.fillStyle = '#000';
                if (this.source instanceof Array && this.source[this.current] !== undefined) {
                    context.fillText(this.source[this.current], 0, 30, this.rectangle.width);
                } else {
                    context.fillText(this.current, 0, 30, this.rectangle.width);
                }
                context.restore();
            }
        };

        Counter.prototype.tap = function ()
        {
            console.log('counter_tap');
            this.next();
        };

        Counter.prototype.hold = function ()
        {
            this.prev();
        };

        Counter.prototype.next = function ()
        {
            this.current = this.min + (this.current - this.min + this.step + this.range) % this.range;
            this.dispatchEvent('changed');
        };

        Counter.prototype.prev = function ()
        {
            this.current = this.min + (this.current - this.min - this.step + this.range) % this.range;
            this.dispatchEvent('changed');
        };

        Counter.prototype.__defineSetter__('max', function(max){
            this._max = max;
            this.range = (this._max - this._min + 1);
            return this._max;
        });

        Counter.prototype.__defineGetter__('max', function(){
            return this._max;
        });

        Counter.prototype.__defineSetter__('min', function(min){
            this._min = min;
            this.range = (this._max - this._min + 1);
            return this._min;
        });

        Counter.prototype.__defineGetter__('min', function(){
            return this._min;
        });
    }

    // class Dice extends Counter
    var Dice = bgsim.Dice = function (options)
    {
        if (options === undefined) {
            options = {}
        }
        options.max = options.max || 6;
        options.min = options.min || 1;
        Counter.call(this, options);

        this.jiggle = options.jiggle || 0;
    }
    {
        inherits(Dice, Counter);

        Dice.prototype.next = function ()
        {
            this.step = Math.floor(Math.random() * this.range);
            Counter.prototype.next.call(this);
        };

        Dice.prototype.tap = function ()
        {
            console.log('dice_tap');
            var self = this;
            var x = this.rectangle.x;
            var y = this.rectangle.y;
            var angle = this.angle;

            var rolling = function(count) {
                if (count < 0) {
                    self.rectangle.x = x;
                    self.rectangle.y = y;
                    self.angle = angle;
                    return;
                }

                self.next();
                if (self.jiggle > 0) {
                    self.rectangle.x = x - self.jiggle + Math.floor(Math.random() * (self.jiggle*2+1));
                    self.rectangle.y = y - self.jiggle + Math.floor(Math.random() * (self.jiggle*2+1));
                    self.angle = angle - self.jiggle + Math.floor(Math.random() * (self.jiggle*2+1));
                }
                setTimeout(rolling, 30, count-1);
            };
            rolling(10);
        };
    }

    bgsim.Game = new Game();
})(window);
