QUnit.test('new bgsim.Shape(123, 456)', function( assert ) {
    var shape = new bgsim.Shape(123, 456);

    assert.equal(shape.width, 123, 'shape.width == 123');
    assert.equal(shape.height, 456, 'shape.height == 456');
});
QUnit.test('bgsim.Shape#within', function( assert ) {
    var shape = new bgsim.Shape(123, 456);

    assert.notOk(shape.within(new bgsim.Point(0, 0)), 'shape#within(0, 0)');
});
QUnit.test('bgsim.Shape#toString', function( assert ) {
    var shape = new bgsim.Shape(123, 456);
    assert.equal(shape.toString(), '[123,456]', 'toString()');
});
