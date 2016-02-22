QUnit.test('new bgsim.Circle(123, 456)', function( assert ) {
    var shape = new bgsim.Circle(123, 456);

    assert.equal(shape.width, 123, 'shape.width == 123');
    assert.equal(shape.height, 456, 'shape.height == 456');
});
QUnit.test('bgsim.Circle#within', function( assert ) {
    var shape = new bgsim.Circle(123, 456);

    assert.ok(shape.within(new bgsim.Point(0, 0)), 'shape#within(0, 0)');
    assert.ok(shape.within(new bgsim.Point(61.5, 0)), 'shape#within(61.5, 0)');
    assert.ok(shape.within(new bgsim.Point(0, 228)), 'shape#within(0, 228)');
    assert.ok(shape.within(new bgsim.Point(-61.5, 0)), 'shape#within(61.5, 0)');
    assert.ok(shape.within(new bgsim.Point(0, -228)), 'shape#within(0, 228)');

    assert.notOk(shape.within(new bgsim.Point(62, 0)), 'shape#within(62, 0)');
    assert.notOk(shape.within(new bgsim.Point(0, 229)), 'shape#within(0, 229)');
    assert.notOk(shape.within(new bgsim.Point(-62, 0)), 'shape#within(62, 0)');
    assert.notOk(shape.within(new bgsim.Point(0, -229)), 'shape#within(0, 229)');
});
QUnit.test('bgsim.Circle#within', function( assert ) {
    var shape = new bgsim.Circle(100, 100);

    // 30degree
    assert.ok(shape.within(new bgsim.Point(43.3, 25)), 'shape#within(43.3, 25)');
    assert.notOk(shape.within(new bgsim.Point(43.4, 25)), 'shape#within(43.4, 25)');
    assert.notOk(shape.within(new bgsim.Point(43.3, 25.1)), 'shape#within(43.3, 25.1)');

    // 45degree
    assert.ok(shape.within(new bgsim.Point(35.3, 35.3)), 'shape#within(35.3, 35.3)');
    assert.notOk(shape.within(new bgsim.Point(35.5, 35.3)), 'shape#within(35.5, 35.3)');
    assert.notOk(shape.within(new bgsim.Point(35.3, 35.5)), 'shape#within(35.3, 35.5)');

    // 60degree
    assert.ok(shape.within(new bgsim.Point(25, 43.3)), 'shape#within(25, 43.3)');
    assert.notOk(shape.within(new bgsim.Point(25, 43.4)), 'shape#within(25, 43.4)');
    assert.notOk(shape.within(new bgsim.Point(25.1, 43.3)), 'shape#within(25.1, 43.3)');
});
QUnit.test('bgsim.Circle#toString', function( assert ) {
    var shape = new bgsim.Circle(123, 456);
    assert.equal(shape.toString(), 'Circle[123,456]', 'toString()');
});
