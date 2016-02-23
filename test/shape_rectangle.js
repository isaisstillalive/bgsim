QUnit.test('new bgsim.Rectangle(123, 456)', function( assert ) {
    var shape = new bgsim.Rectangle(123, 456);

    assert.equal(shape.width, 123, 'shape.width == 123');
    assert.equal(shape.height, 456, 'shape.height == 456');
});
QUnit.test('bgsim.Rectangle#within', function( assert ) {
    var shape = new bgsim.Rectangle(123, 456);

    assert.ok(shape.within(new bgsim.Point(0, 0)), 'shape#within(0, 0)');
    assert.ok(shape.within(new bgsim.Point(61.5, 228)), 'shape#within(61.5, 228)');
    assert.ok(shape.within(new bgsim.Point(-61.5, -228)), 'shape#within(-61.5, -228)');

    assert.notOk(shape.within(new bgsim.Point(62, 228)), 'shape#within(62, 228)');
    assert.notOk(shape.within(new bgsim.Point(61.5, 229)), 'shape#within(61.5, 229)');
    assert.notOk(shape.within(new bgsim.Point(-62, -228)), 'shape#within(62, -228)');
    assert.notOk(shape.within(new bgsim.Point(-61.5, -229)), 'shape#within(0, 229)');
});
QUnit.test('bgsim.Rectangle#toString', function( assert ) {
    var shape = new bgsim.Rectangle(123, 456);
    assert.equal(shape.toString(), 'Rectangle[123,456]', 'toString()');
});
